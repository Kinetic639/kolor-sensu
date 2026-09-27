#!/usr/bin/env node
// Generates the painted (dry-brush) alpha masks for UI surfaces on the public
// website: the service tile and the section band, plus the paper grain. The
// output is plain SVG geometry, so the masks render identically in every
// browser and are cached like any other static asset.
//
// The raster masks used by WatercolorImage are made separately: the photo
// mask by generate-photo-mask.mjs, the matte of the entrance animation by
// generate-paint-matte.mjs (backdrop) and generate-watercolor-splash.mjs
// (photo).
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

// Rows of overlapping brush strokes forming an irregular painted field, plus a
// few loose flecks of paint.
function strokeField({
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

// ------------------------------------------------------------ paper grain

const paper = `<svg xmlns='http://www.w3.org/2000/svg' width='180' height='180'><filter id='p'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0.35 0 0 0 0 0.33 0 0 0 0 0.3 0 0 0 0.55 0'/></filter><rect width='180' height='180' filter='url(#p)'/></svg>`;

// ------------------------------------------------------------ surfaces

// Painted fills for UI surfaces rather than photos: a near-rectangular tile
// (service tiles) and a long, low band (call-to-action and section backdrops).
const surfaceMasks = {
  tile: strokeField({
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
  band: strokeField({
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

mkdirSync(outDir, { recursive: true });
const files = {
  ...Object.fromEntries(
    Object.entries(surfaceMasks).map(([name, markup]) => [
      `${name}.svg`,
      markup,
    ]),
  ),
  "paper.svg": paper,
};
for (const [name, markup] of Object.entries(files)) {
  writeFileSync(resolve(outDir, name), `${markup}\n`);
  stdout.write(
    `wrote watercolor/${name} (${(markup.length / 1024).toFixed(1)} KB)\n`,
  );
}
