#!/usr/bin/env node
// Generates the painted (watercolor / dry-brush) alpha masks used by the public
// website's WatercolorImage and wash surfaces. The output is plain SVG geometry
// without filters, so the masks render identically in every browser, are
// rasterised once by the browser and cached like any other static asset.
//
// Output: apps/web/public/watercolor/*.svg (Storybook serves the same folder).
// Run:    pnpm --filter @repo/design-system generate:watercolor
// The output is deterministic: the same seeds always produce the same files.

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { stdout } from "node:process";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const outDir = resolve(here, "../../../apps/web/public/watercolor");

// ---------------------------------------------------------------- utilities

function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function noise1d(seed) {
  const r = rng(seed);
  const table = Array.from({ length: 512 }, () => r() * 2 - 1);
  const at = (x) => {
    const i = Math.floor(x);
    const f = x - i;
    const s = f * f * (3 - 2 * f);
    const a = table[((i % 512) + 512) % 512];
    const b = table[(((i + 1) % 512) + 512) % 512];
    return a + (b - a) * s;
  };
  return (x, octaves = 3) => {
    let sum = 0;
    let amp = 1;
    let freq = 1;
    let norm = 0;
    for (let o = 0; o < octaves; o++) {
      sum += at(x * freq + o * 31.7) * amp;
      norm += amp;
      amp *= 0.5;
      freq *= 2.1;
    }
    return sum / norm;
  };
}

const f = (n) => Math.round(n);

function polygon(points, opacity = 1) {
  const d = `M${points.map(([x, y]) => `${f(x)} ${f(y)}`).join(" ")}Z`;
  return opacity >= 1
    ? `<path d='${d}'/>`
    : `<path d='${d}' fill-opacity='${opacity.toFixed(2)}'/>`;
}

function svg(w, h, body) {
  return `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 ${w} ${h}' preserveAspectRatio='none' fill='white'>${body}</svg>`;
}

// ------------------------------------------------------------ brush strokes

// One horizontal brush stroke: a band with noisy top/bottom edges, a slight
// slope, a feathered halo, bristle-combed ends and thin dry-brush streaks that
// trail past both ends (and along the outer edge for the first/last row).
function brushStroke({
  x1,
  x2,
  cy,
  thickness,
  slope,
  seed,
  streaks = 9,
  reach,
  edge = 0,
}) {
  const r = rng(seed);
  const topNoise = noise1d(seed * 7 + 1);
  const botNoise = noise1d(seed * 7 + 2);
  const len = x2 - x1;
  const half = thickness / 2;
  const steps = Math.max(18, Math.round(len / 26));
  const yAt = (x) => cy + (x - (x1 + x2) / 2) * slope;
  const band = (grow) => {
    const top = [];
    const bottom = [];
    for (let i = 0; i <= steps; i++) {
      const x = x1 + (len * i) / steps;
      const e = Math.min(i / steps, 1 - i / steps);
      // Only the last ~12% of each end tapers, like a brush lifting off.
      const taper =
        e < 0.12 ? 0.65 + 0.35 * Math.sin((Math.PI / 2) * (e / 0.12)) : 1;
      const ht = half * taper + grow;
      top.push([x, yAt(x) - ht + topNoise(x / 70) * thickness * 0.13]);
      bottom.push([x, yAt(x) + ht + botNoise(x / 66) * thickness * 0.13]);
    }
    // Stroke end: a softly rounded, noisy edge where the bristles lift off
    // (the dry streaks below add the bristle trails).
    const endNoise = noise1d(seed * 13 + 5);
    const comb = (xEnd, dir) => {
      const pts = [];
      const teeth = 12;
      for (let k = 1; k < teeth; k++) {
        const t = k / teeth;
        const y = yAt(xEnd) - half * 0.66 + thickness * 0.66 * t;
        const bulge = Math.sin(Math.PI * t);
        const n = (endNoise(dir * 40 + t * 5, 2) + 1) / 2;
        pts.push([
          xEnd + dir * (grow * 1.5 + reach * (0.1 * bulge + 0.3 * n)),
          y,
        ]);
      }
      return pts;
    };
    return [
      ...top,
      ...comb(x2, 1),
      ...bottom.reverse(),
      ...comb(x1, -1).reverse(),
    ];
  };
  // Feathered halo first, then the solid body on top of it.
  let body = polygon(band(thickness * 0.07), 0.38) + polygon(band(0));

  const streak = (xa, xb, y, w, opacity) => {
    const bend = (r() - 0.5) * 8;
    const pts = [];
    const n = 3;
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      pts.push([xa + (xb - xa) * t, y + bend * t * t - w * (1 - t * 0.9)]);
    }
    for (let i = n; i >= 0; i--) {
      const t = i / n;
      pts.push([xa + (xb - xa) * t, y + bend * t * t + w * (1 - t * 0.9)]);
    }
    body += polygon(pts, opacity);
  };

  for (const [xEnd, dir] of [
    [x1, -1],
    [x2, 1],
  ]) {
    for (let s = 0; s < streaks; s++) {
      const y = yAt(xEnd) + (r() - 0.5) * thickness * 0.95;
      const w = 1.5 + r() * thickness * 0.05;
      const start = xEnd - dir * reach * (0.3 + r() * 0.6);
      const end = xEnd + dir * reach * (0.15 + r() * 0.7);
      streak(start, end, y, w, 0.18 + r() * 0.5);
    }
  }
  // Dry-brush drag marks along the outer edge of the first/last row.
  if (edge !== 0) {
    for (let s = 0; s < 5; s++) {
      const xa = x1 + len * (0.05 + r() * 0.7);
      const xb = xa + len * (0.05 + r() * 0.14);
      const yEdge =
        yAt((xa + xb) / 2) + edge * (half + thickness * (0.02 + r() * 0.14));
      streak(xa, xb, yEdge, 1.5 + r() * thickness * 0.04, 0.16 + r() * 0.36);
    }
  }
  return body;
}

// A photo mask: rows of overlapping brush strokes forming an irregular,
// roughly elliptical painted field, plus a few loose flecks of paint.
function photoMask({
  w,
  h,
  seed,
  rows,
  marginX,
  marginY,
  envelope,
  slope,
  reach,
}) {
  const r = rng(seed);
  const pitch = (h - 2 * marginY) / (rows - 1 + 1.55);
  const thickness = pitch * 1.55;
  let body = "";
  for (let i = 0; i < rows; i++) {
    const cy = marginY + thickness / 2 + pitch * i + (r() - 0.5) * pitch * 0.14;
    const u = (cy - h / 2) / (h / 2);
    const span =
      (w / 2 - marginX) * Math.sqrt(Math.max(0.3, 1 - envelope * u * u));
    const cx = w / 2 + (r() - 0.5) * w * 0.1;
    // Keep stroke ends (and their bristle trails) inside the viewBox, or the
    // silhouette gets a straight edge where the SVG clips it.
    const inset = reach * 0.9 + 6;
    const x1 = Math.max(inset, cx - span * (0.8 + r() * 0.28));
    const x2 = Math.min(w - inset, cx + span * (0.8 + r() * 0.28));
    body += brushStroke({
      x1,
      x2,
      cy,
      thickness,
      slope: slope * (0.6 + r() * 0.8),
      seed: seed * 100 + i,
      streaks: 8 + Math.floor(r() * 5),
      reach,
      edge: i === 0 ? -1 : i === rows - 1 ? 1 : 0,
    });
    // Short dabs above the first row and below the last one break up the
    // top and bottom silhouette so it never reads as a straight edge.
    if (i === 0 || i === rows - 1) {
      const dir = i === 0 ? -1 : 1;
      for (let k = 0; k < 3; k++) {
        const a = x1 + (x2 - x1) * (0.08 + r() * 0.6);
        const b = a + (x2 - x1) * (0.14 + r() * 0.22);
        body += brushStroke({
          x1: a,
          x2: b,
          cy: cy + dir * thickness * (0.28 + r() * 0.18),
          thickness: thickness * (0.4 + r() * 0.2),
          slope: slope * 1.4,
          seed: seed * 100 + 50 + i * 5 + k,
          streaks: 2,
          reach: reach * 0.6,
        });
      }
    }
  }
  // Flecks near the outer edge.
  for (let k = 0; k < 14; k++) {
    const a = r() * Math.PI * 2;
    const rx = (w / 2 - marginX * 0.6) * (0.92 + r() * 0.12);
    const ry = (h / 2 - marginY * 0.6) * (0.92 + r() * 0.12);
    const x = w / 2 + Math.cos(a) * rx;
    const y = h / 2 + Math.sin(a) * ry;
    const s = 2 + r() * 6;
    body += `<ellipse cx='${f(x)}' cy='${f(y)}' rx='${f(s * 1.6)}' ry='${f(s)}' fill-opacity='${(0.3 + r() * 0.5).toFixed(2)}'/>`;
  }
  return svg(w, h, body);
}

// ------------------------------------------------------------ watercolor wash

function blob({ cx, cy, rx, ry, seed, wobble = 0.1 }) {
  const n = noise1d(seed);
  const n2 = noise1d(seed + 99);
  const pts = [];
  const steps = 96;
  for (let i = 0; i < steps; i++) {
    const t = (i / steps) * Math.PI * 2;
    const k = 1 + n(t * 1.6, 3) * wobble + n2(t * 9, 2) * wobble * 0.25;
    pts.push([cx + Math.cos(t) * rx * k, cy + Math.sin(t) * ry * k]);
  }
  return pts;
}

// Layered glazes with a darker rim, like pigment pooling at a drying edge,
// and a few brushed streaks along one side.
function washMask({ seed }) {
  const r = rng(seed);
  const W = 1000;
  const H = 1000;
  const outer = blob({
    cx: 500,
    cy: 500,
    rx: 440,
    ry: 400,
    seed,
    wobble: 0.13,
  });
  let body = polygon(outer, 0.68);
  body += polygon(
    blob({
      cx: 470 + r() * 60,
      cy: 480 + r() * 60,
      rx: 350,
      ry: 310,
      seed: seed + 3,
      wobble: 0.16,
    }),
    0.34,
  );
  body += polygon(
    blob({
      cx: 380 + r() * 240,
      cy: 380 + r() * 240,
      rx: 190,
      ry: 150,
      seed: seed + 5,
      wobble: 0.22,
    }),
    0.18,
  );
  const rim = `M${outer.map(([x, y]) => `${f(x)} ${f(y)}`).join(" ")}Z`;
  body += `<path d='${rim}' fill='none' stroke='white' stroke-opacity='0.3' stroke-width='7'/>`;
  // Brushed glaze on top: loose horizontal strokes whose dry ends run past
  // the pooled shape, like the washes in reference B.
  let strokes = "";
  for (let i = 0; i < 4; i++) {
    const cy = 250 + i * 165 + (r() - 0.5) * 50;
    const span = 330 + r() * 120;
    const cx = 500 + (r() - 0.5) * 120;
    strokes += brushStroke({
      x1: cx - span,
      x2: cx + span,
      cy,
      thickness: 120 + r() * 50,
      slope: -0.05 + r() * 0.04,
      seed: seed * 10 + i,
      streaks: 7,
      reach: 110,
    });
  }
  body += `<g opacity='0.4'>${strokes}</g>`;
  return svg(W, H, body);
}

// ------------------------------------------------------------ reveal wipe

// 200%-wide wipe used as an extra mask layer when animating: the left half is
// opaque, the right half transparent, with a ragged bristle edge just past the
// middle. With mask-size 200% 100%, mask-position 0% shows the whole element
// and 135% hides it completely (bristles included), so animating between the
// two sweeps paint across the element from left to right.
function wipeMask() {
  const r = rng(404);
  const W = 2000;
  const H = 1000;
  const pts = [[0, 0]];
  const teeth = 40;
  for (let k = 0; k <= teeth; k++) {
    const y = (H * k) / teeth;
    pts.push([1025 + r() * 80, y]);
  }
  pts.push([0, H]);
  let body = polygon(pts);
  for (let s = 0; s < 22; s++) {
    const y = r() * H;
    const w = 3 + r() * 10;
    const x2 = 1110 + r() * 190;
    body += polygon(
      [
        [960, y - w],
        [x2, y - w * 0.2],
        [x2 + 10, y],
        [x2, y + w * 0.2],
        [960, y + w],
      ],
      0.4 + r() * 0.5,
    );
  }
  return svg(W, H, body);
}

// ------------------------------------------------------------ paper grain

const paper = `<svg xmlns='http://www.w3.org/2000/svg' width='180' height='180'><filter id='p'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0.35 0 0 0 0 0.33 0 0 0 0 0.3 0 0 0 0.55 0'/></filter><rect width='180' height='180' filter='url(#p)'/></svg>`;

// ------------------------------------------------------------ variants

const photoMasks = {
  // Landscape 4:3 – 3:2: room photos, content images.
  "soft-horizontal": photoMask({
    w: 1000,
    h: 750,
    seed: 11,
    rows: 5,
    marginX: 70,
    marginY: 70,
    envelope: 0.8,
    slope: -0.05,
    reach: 70,
  }),
  // Wide 16:9 – 21:9: hero and workshop photos.
  "wide-brush": photoMask({
    w: 1600,
    h: 900,
    seed: 23,
    rows: 5,
    marginX: 110,
    marginY: 80,
    envelope: 0.75,
    slope: -0.06,
    reach: 120,
  }),
  // Portrait 4:5 – 3:4: specialists.
  "portrait-soft": photoMask({
    w: 800,
    h: 1000,
    seed: 37,
    rows: 6,
    marginX: 55,
    marginY: 80,
    envelope: 0.7,
    slope: -0.04,
    reach: 55,
  }),
  // Square-ish, small sizes: thumbnails, tiles.
  "compact-brush": photoMask({
    w: 1000,
    h: 1000,
    seed: 53,
    rows: 5,
    marginX: 75,
    marginY: 85,
    envelope: 0.85,
    slope: -0.05,
    reach: 60,
  }),
};

// Painted fills for UI surfaces rather than photos: a near-rectangular tile
// (service tiles) and a long, low band (call-to-action and section backdrops).
const surfaceMasks = {
  tile: photoMask({
    w: 600,
    h: 780,
    seed: 97,
    rows: 6,
    marginX: 40,
    marginY: 40,
    envelope: 0.25,
    slope: -0.02,
    reach: 18,
  }),
  band: photoMask({
    w: 2400,
    h: 560,
    seed: 131,
    rows: 3,
    marginX: 30,
    marginY: 45,
    envelope: 0.2,
    slope: -0.015,
    reach: 170,
  }),
};

const washShapes = {
  a: washMask({ seed: 61 }),
  b: washMask({ seed: 79 }),
};

mkdirSync(outDir, { recursive: true });
const files = {
  ...Object.fromEntries(
    Object.entries(photoMasks).map(([name, markup]) => [
      `mask-${name}.svg`,
      markup,
    ]),
  ),
  ...Object.fromEntries(
    Object.entries(surfaceMasks).map(([name, markup]) => [
      `${name}.svg`,
      markup,
    ]),
  ),
  ...Object.fromEntries(
    Object.entries(washShapes).map(([name, markup]) => [
      `wash-${name}.svg`,
      markup,
    ]),
  ),
  "wipe.svg": wipeMask(),
  "paper.svg": paper,
};
for (const [name, markup] of Object.entries(files)) {
  writeFileSync(resolve(outDir, name), `${markup}\n`);
  stdout.write(
    `wrote watercolor/${name} (${(markup.length / 1024).toFixed(1)} KB)\n`,
  );
}
