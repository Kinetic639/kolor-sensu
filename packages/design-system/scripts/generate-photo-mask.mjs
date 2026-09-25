#!/usr/bin/env node
// Generates the dry-brush alpha mask that WatercolorImage cuts the photo with.
//
// The silhouette is traced from the approved target composition
// (docs/design/references/public/painted-hero.png): the outline of the
// photographed room, smoothed to 64 points. The painterly edge is procedural:
// the outline is offset by anisotropic noise that follows one brush direction,
// so the edges break up into bristle streaks, uneven stroke ends, dry-brush
// gaps, a few paint specks and some softer, translucent stretches.
//
// Output: apps/web/public/watercolor/photo-mask.png (8-bit alpha, palette PNG).
// Run:    pnpm --filter @repo/design-system generate:watercolor
// The output is deterministic: the same seed always produces the same file.

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { stdout } from "node:process";
import { fileURLToPath } from "node:url";
import {
  clamp01,
  encodeAlphaPng,
  noise2d,
  rng,
  smoothstep,
} from "./raster-mask.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const outFile = resolve(
  here,
  "../../../apps/web/public/watercolor/photo-mask.png",
);

// Canvas and the silhouette's box inside it. The canvas matches the photo's
// footprint in the approved target (3 : 2, like a typical upload), and the
// component's photo layer has the same ratio, so the mask is never stretched.
// The padding is the room the target leaves around the silhouette: generous
// at the sides and bottom, tight at the top, where the edge is flatter.
const W = 1500;
const H = 1000;
const PAD_X = 53;
const PAD_TOP = 17;
const PAD_BOTTOM = 50;

// Outline of the photo in the approved target, normalised to its bounding box
// (x right, y down), clockwise from the top edge.
const outline = [
  [0.727, 0.0],
  [0.683, 0.012],
  [0.64, 0.025],
  [0.595, 0.034],
  [0.552, 0.024],
  [0.512, 0.007],
  [0.467, 0.017],
  [0.425, 0.009],
  [0.38, 0.019],
  [0.339, 0.04],
  [0.297, 0.051],
  [0.254, 0.035],
  [0.215, 0.067],
  [0.176, 0.096],
  [0.151, 0.144],
  [0.13, 0.202],
  [0.093, 0.237],
  [0.056, 0.275],
  [0.02, 0.312],
  [0.002, 0.37],
  [0.009, 0.434],
  [0.015, 0.5],
  [0.039, 0.555],
  [0.051, 0.617],
  [0.09, 0.645],
  [0.096, 0.71],
  [0.114, 0.77],
  [0.152, 0.777],
  [0.172, 0.832],
  [0.208, 0.869],
  [0.241, 0.906],
  [0.274, 0.942],
  [0.312, 0.959],
  [0.354, 0.978],
  [0.395, 0.998],
  [0.437, 0.982],
  [0.481, 0.97],
  [0.526, 0.959],
  [0.571, 0.955],
  [0.613, 0.973],
  [0.656, 0.957],
  [0.696, 0.931],
  [0.736, 0.905],
  [0.776, 0.88],
  [0.815, 0.85],
  [0.855, 0.822],
  [0.896, 0.801],
  [0.934, 0.774],
  [0.939, 0.716],
  [0.977, 0.685],
  [0.983, 0.625],
  [0.986, 0.565],
  [0.998, 0.501],
  [0.999, 0.432],
  [0.999, 0.362],
  [0.986, 0.3],
  [0.988, 0.234],
  [0.952, 0.203],
  [0.929, 0.148],
  [0.914, 0.087],
  [0.901, 0.028],
  [0.856, 0.036],
  [0.813, 0.02],
  [0.769, 0.016],
];

// ---------------------------------------------------------------- geometry

// Closed Catmull-Rom spline through the outline, in canvas pixels.
function smoothOutline(points, steps = 10) {
  const px = points.map(([x, y]) => [
    PAD_X + x * (W - 2 * PAD_X),
    PAD_TOP + y * (H - PAD_TOP - PAD_BOTTOM),
  ]);
  const n = px.length;
  const out = [];
  for (let i = 0; i < n; i++) {
    const p0 = px[(i - 1 + n) % n];
    const p1 = px[i];
    const p2 = px[(i + 1) % n];
    const p3 = px[(i + 2) % n];
    for (let s = 0; s < steps; s++) {
      const t = s / steps;
      const t2 = t * t;
      const t3 = t2 * t;
      out.push(
        [0, 1].map(
          (k) =>
            0.5 *
            (2 * p1[k] +
              (-p0[k] + p2[k]) * t +
              (2 * p0[k] - 5 * p1[k] + 4 * p2[k] - p3[k]) * t2 +
              (-p0[k] + 3 * p1[k] - 3 * p2[k] + p3[k]) * t3),
        ),
      );
    }
  }
  return out;
}

// Even-odd scanline fill: 1 inside the outline, 0 outside.
function rasterize(poly) {
  const inside = new Uint8Array(W * H);
  for (let y = 0; y < H; y++) {
    const cy = y + 0.5;
    const xs = [];
    for (let i = 0; i < poly.length; i++) {
      const [x1, y1] = poly[i];
      const [x2, y2] = poly[(i + 1) % poly.length];
      if (y1 <= cy === y2 <= cy) continue;
      xs.push(x1 + ((cy - y1) / (y2 - y1)) * (x2 - x1));
    }
    xs.sort((a, b) => a - b);
    for (let k = 0; k + 1 < xs.length; k += 2) {
      const from = Math.max(0, Math.ceil(xs[k] - 0.5));
      const to = Math.min(W - 1, Math.floor(xs[k + 1] - 0.5));
      for (let x = from; x <= to; x++) inside[y * W + x] = 1;
    }
  }
  return inside;
}

// Exact Euclidean distance transform (Felzenszwalb & Huttenlocher): distance
// from every pixel to the nearest pixel where `target` is 1.
function distanceTo(target) {
  const INF = 1e12;
  const grid = new Float64Array(W * H);
  for (let i = 0; i < grid.length; i++) grid[i] = target[i] ? 0 : INF;
  const pass = (length, get, set) => {
    const f = new Float64Array(length);
    const d = new Float64Array(length);
    const v = new Int32Array(length);
    const z = new Float64Array(length + 1);
    for (let q = 0; q < length; q++) f[q] = get(q);
    let k = 0;
    v[0] = 0;
    z[0] = -Infinity;
    z[1] = Infinity;
    for (let q = 1; q < length; q++) {
      let s;
      do {
        const p = v[k];
        s = (f[q] + q * q - (f[p] + p * p)) / (2 * q - 2 * p);
        if (s <= z[k]) k--;
        else break;
      } while (k >= 0);
      k++;
      v[k] = q;
      z[k] = s;
      z[k + 1] = Infinity;
    }
    k = 0;
    for (let q = 0; q < length; q++) {
      while (z[k + 1] < q) k++;
      const p = v[k];
      d[q] = (q - p) * (q - p) + f[p];
    }
    for (let q = 0; q < length; q++) set(q, d[q]);
  };
  for (let x = 0; x < W; x++) {
    pass(
      H,
      (y) => grid[y * W + x],
      (y, value) => {
        grid[y * W + x] = value;
      },
    );
  }
  for (let y = 0; y < H; y++) {
    pass(
      W,
      (x) => grid[y * W + x],
      (x, value) => {
        grid[y * W + x] = value;
      },
    );
  }
  for (let i = 0; i < grid.length; i++) grid[i] = Math.sqrt(grid[i]);
  return grid;
}

// ---------------------------------------------------------------- the mask

function photoMask(seed) {
  const inside = rasterize(smoothOutline(outline));
  const outside = inside.map((v) => 1 - v);
  const toInside = distanceTo(inside);
  const toOutside = distanceTo(outside);

  const wobble = noise2d(seed); // irregular outline
  const strokes = noise2d(seed + 1); // stroke-width fingers
  const bristles = noise2d(seed + 2); // hair-thin streaks
  const dryBrush = noise2d(seed + 3); // gaps where the brush ran dry
  const softness = noise2d(seed + 4); // stretches of thin, translucent paint
  const specks = rng(seed + 5);

  // All strokes run one way, rising slightly to the right as in the target.
  const angle = (-12 * Math.PI) / 180;
  const dx = Math.cos(angle);
  const dy = Math.sin(angle);

  // Paint specks: one candidate dot per 11 px cell, near the edge only.
  const cell = 11;
  const cols = Math.ceil(W / cell);
  const rows = Math.ceil(H / cell);
  const dots = Array.from({ length: cols * rows }, () => ({
    x: specks(),
    y: specks(),
    r: 0.7 + specks() * 1.8,
    p: specks(),
  }));

  const alpha = new Uint8Array(W * H);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = y * W + x;
      // Signed distance to the outline, positive inside.
      const sd = inside[i] ? toOutside[i] : -toInside[i];
      if (sd > 140) {
        alpha[i] = 255;
        continue;
      }
      if (sd < -110) continue;

      const u = x * dx + y * dy; // along the stroke
      const v = -x * dy + y * dx; // across the stroke
      // Brush tips get as much room as the canvas leaves them, so where the
      // silhouette runs close to the border (the top) the edge stays flatter
      // instead of being cut straight.
      const border = Math.min(x, y, W - 1 - x, H - 1 - y);
      const room = clamp01((border - 6) / 60);
      let edge =
        sd +
        room *
          (24 * wobble(x / 150, y / 150) +
            30 * strokes(u / 260, v / 15) +
            14 * bristles(u / 90, v / 2.3, 2));

      // Keep every brush tip clear of the canvas border.
      edge = Math.min(edge, border - 6);

      let a = smoothstep(-1.4, 1.4, edge);

      // Dry-brush gaps: streaky holes that thin out away from the edge.
      if (edge > 0 && edge < 55) {
        const threshold = -1 + 1.12 * (1 - edge / 55);
        const dry = dryBrush(u / 45, v / 1.7, 2);
        a *= smoothstep(threshold - 0.07, threshold + 0.07, dry);
      }

      // Thin paint: in some stretches the photo fades in over ~70 px.
      const thin = smoothstep(0.05, 0.4, softness(x / 230, y / 230, 2));
      if (thin > 0 && edge > 0) {
        a *= 1 - thin * (1 - (0.35 + 0.65 * smoothstep(0, 70, edge)));
      }

      // Specks: photo flecks just outside the edge, paint flecks just inside.
      if (edge > -45 && edge < 35) {
        const cx = Math.floor(x / cell);
        const cy = Math.floor(y / cell);
        const dot = dots[cy * cols + cx];
        const ddx = x - (cx + dot.x) * cell;
        const ddy = y - (cy + dot.y) * cell;
        const hit =
          1 - smoothstep(dot.r - 0.7, dot.r + 0.7, Math.hypot(ddx, ddy));
        if (hit > 0) {
          if (edge <= 0 && dot.p < 0.12 * (1 + edge / 45) && border > 8) {
            a = Math.max(a, hit);
          } else if (edge > 0 && dot.p < 0.12 * (1 - edge / 35)) {
            a *= 1 - hit;
          }
        }
      }

      alpha[i] = Math.round(clamp01(a) * 255);
    }
  }
  return alpha;
}

const png = encodeAlphaPng(photoMask(20260925), W, H);
mkdirSync(dirname(outFile), { recursive: true });
writeFileSync(outFile, png);
stdout.write(`wrote ${outFile} (${(png.length / 1024).toFixed(0)} KB)\n`);
