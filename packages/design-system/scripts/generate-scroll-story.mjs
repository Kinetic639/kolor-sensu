#!/usr/bin/env node
// Generates the scroll story of the public homepage (ScrollStoryPath and
// StorySplash in packages/ui/src/public-site/scroll-story.tsx):
//
// 1. The watercolor path. One long painted ribbon behind the first screens
//    of the page, drawn along a spine through waypoints placed around the
//    sections (behind the pictures, down the gap beside the steps, across
//    the gaps between sections, along the margins), so it never runs under
//    body copy. Two layouts: desktop (from 64 rem, 1440 design px wide)
//    and phone (390 wide, more vertical, hugging the edges and diving
//    behind the pictures). Per layout:
//
//    colour   the ribbon itself (RGBA). Its pigment is not synthetic: every
//             pixel is sampled from the approved backdrop picture
//             (watercolor-background.webp), laid along the spine so the
//             picture's horizontal brushwork, blooms and granulation follow
//             the path. Where the path starts the samples come from the
//             picture's pink side, later from its green side; in between the
//             sampling walks through the picture's own wet-on-wet mixing
//             zone, so pink turns into green the way it does in the
//             picture. The shape is a brush stroke: the width swells and
//             narrows along the way, each edge wanders on its own, the
//             outer part breaks into dry-brush streaks, pigment pools a
//             little darker along the edges, and where the path's density
//             drops it thins to streaks or disappears ("empty" stretches).
//             Short side branches (odnogi) are strokes of their own: some
//             reach toward the steps, some run into the margins; some are
//             pink over green, where the colours meet again.
//    time     when each pixel gets paint, along the spine (0 = start, 1 =
//             end of the path), the belly of the brush ahead of its edges,
//             ragged along the bristle streaks. Branches start from their
//             point on the spine and trail it slightly.
//
//    Both are cut into horizontal tiles (so the page only ever animates
//    the one or two tiles the paint front is in); each tile's time map is
//    normalised to its own time range for 8-bit precision.
//
//    The data file also gets a table from the paint front's time to its
//    height on the page (monotonic), which the runtime inverts: the front
//    follows a line a little below the middle of the viewport.
//
// 2. Side splashes. The supplied splash patches (splash-pink-1.png,
//    splash-sage-1.png) flowing in from the edge of the screen: a time map
//    of blooms seeded along the edge, each spreading through a warped field
//    with a cauliflower front, the outer speckles last.
//
// Output: apps/web/public/watercolor/story/*.{webp,png} and
//         packages/ui/src/public-site/scroll-story.data.ts
// Run:    pnpm --filter @repo/design-system generate:story
//         (--preview writes composites to /tmp for inspection)
// Deterministic: the same seeds always produce the same files.

import { Buffer } from "node:buffer";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { argv, stdout } from "node:process";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { clamp01, noise2d, rng, smoothstep } from "./raster-mask.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const watercolorDir = resolve(here, "../../../apps/web/public/watercolor");
const outDir = resolve(watercolorDir, "story");
const dataFile = resolve(here, "../../ui/src/public-site/scroll-story.data.ts");
const preview = argv.includes("--preview");

// ----------------------------------------------------------------- layouts

// Waypoints in design px of the path's box (the ScrollStoryPath element:
// hero, steps, offer, guided choice, specialists), measured in Storybook
// at 1440 and 390 wide. w: half-width; rho: paint density (1 full, 0
// nothing, in between dry-brush streaks only); mix: 0 pink, 1 green.
// anchors: where each section starts (StoryAnchor names), from the same
// measurement: the page stretches the artwork between them so the path
// stays beside the same sections whatever their real height.
const layouts = {
  desktop: {
    width: 1440,
    height: 2806,
    anchors: { steps: 569, offer: 1377, guided: 1816, specialists: 2352 },
    scale: 1,
    tiles: 6,
    seed: 11,
    waypoints: [
      // Under the hero picture, out at its lower left corner.
      { x: 1060, y: 250, w: 120, rho: 1, mix: 0 },
      { x: 880, y: 455, w: 118, rho: 1, mix: 0 },
      { x: 735, y: 580, w: 92, rho: 1, mix: 0.02 },
      // Down the gap between the steps' intro and the steps.
      { x: 676, y: 700, w: 50, rho: 0.95, mix: 0.06 },
      { x: 694, y: 830, w: 40, rho: 0.55, mix: 0.12 },
      { x: 668, y: 965, w: 52, rho: 0.95, mix: 0.2 },
      { x: 682, y: 1100, w: 36, rho: 0.04, mix: 0.28 },
      { x: 672, y: 1225, w: 50, rho: 0.95, mix: 0.34 },
      // Across the gap above the offer, to the right margin.
      { x: 760, y: 1345, w: 60, rho: 1, mix: 0.42 },
      { x: 1040, y: 1398, w: 50, rho: 0.9, mix: 0.5 },
      { x: 1340, y: 1465, w: 70, rho: 1, mix: 0.58 },
      // Down the margin beside the tiles, half off the page.
      { x: 1392, y: 1610, w: 66, rho: 0.75, mix: 0.62 },
      { x: 1340, y: 1790, w: 88, rho: 1, mix: 0.68 },
      // Under the guided choice's picture, out at its lower left.
      { x: 1160, y: 1930, w: 112, rho: 1, mix: 0.72 },
      { x: 1010, y: 2130, w: 124, rho: 1, mix: 0.76 },
      { x: 850, y: 2320, w: 100, rho: 1, mix: 0.82 },
      // Past the team's intro, fading out under the cards.
      { x: 590, y: 2410, w: 74, rho: 0.85, mix: 0.88 },
      { x: 480, y: 2560, w: 52, rho: 0.55, mix: 0.93 },
      { x: 640, y: 2730, w: 44, rho: 0.3, mix: 0.97 },
      { x: 900, y: 2790, w: 30, rho: 0, mix: 1 },
    ],
    // at: position on the spine (0..1); angle: degrees from the spine's
    // direction (positive: to its left in page terms, i.e. toward +x when
    // the spine runs down); length and w in design px; mix: its colour.
    branches: [
      // Toward the four step numbers (pink, green, pink, green, like them).
      { toward: [742, 681], w: 20, mix: 0 },
      { toward: [742, 864], w: 18, mix: 1 },
      { toward: [742, 1047], w: 19, mix: 0 },
      { toward: [742, 1229], w: 18, mix: 1 },
      // Dry offshoots into the gaps and margins.
      { at: 0.11, angle: -62, length: 150, w: 26, mix: 0.05, bend: 30 },
      { at: 0.43, angle: 70, length: 120, w: 24, mix: 0, bend: -24 },
      { at: 0.58, angle: -48, length: 170, w: 30, mix: 0.15, bend: 40 },
      { at: 0.8, angle: 58, length: 150, w: 26, mix: 0.1, bend: -30 },
    ],
  },
  mobile: {
    width: 390,
    height: 5455,
    anchors: { steps: 936, offer: 2055, guided: 2949, specialists: 3764 },
    scale: 1.5,
    tiles: 8,
    seed: 23,
    waypoints: [
      // A sliver at the right edge beside the hero copy, then under its
      // picture. Beside text the phone's path stays (almost) off the
      // screen: the copy spans the whole width.
      { x: 422, y: 560, w: 40, rho: 0.5, mix: 0 },
      { x: 330, y: 700, w: 70, rho: 1, mix: 0 },
      { x: 150, y: 850, w: 72, rho: 1, mix: 0.02 },
      { x: 40, y: 950, w: 50, rho: 1, mix: 0.05 },
      { x: -34, y: 1080, w: 40, rho: 0.8, mix: 0.08 },
      { x: -30, y: 1220, w: 38, rho: 0.7, mix: 0.1 },
      // Behind the step numbers.
      { x: 52, y: 1330, w: 34, rho: 0.9, mix: 0.14 },
      { x: 60, y: 1520, w: 30, rho: 0.8, mix: 0.18 },
      { x: 48, y: 1700, w: 28, rho: 0.3, mix: 0.22 },
      { x: 58, y: 1880, w: 32, rho: 0.9, mix: 0.28 },
      // Across the gap above the offer, then off the right edge.
      { x: 84, y: 1995, w: 36, rho: 1, mix: 0.34 },
      { x: 220, y: 2040, w: 34, rho: 1, mix: 0.42 },
      { x: 378, y: 2062, w: 36, rho: 1, mix: 0.5 },
      { x: 425, y: 2250, w: 40, rho: 0.7, mix: 0.54 },
      { x: 405, y: 2500, w: 44, rho: 0.85, mix: 0.58 },
      { x: 420, y: 2800, w: 40, rho: 0.6, mix: 0.62 },
      // Back across below the tiles, off the left edge beside the questions.
      { x: 330, y: 2935, w: 40, rho: 1, mix: 0.66 },
      { x: 120, y: 2965, w: 38, rho: 1, mix: 0.68 },
      { x: -36, y: 3050, w: 40, rho: 0.8, mix: 0.7 },
      { x: -34, y: 3350, w: 38, rho: 0.6, mix: 0.72 },
      // Under the guided choice's picture, out to the right, fading.
      { x: 100, y: 3500, w: 70, rho: 1, mix: 0.76 },
      { x: 280, y: 3660, w: 72, rho: 1, mix: 0.8 },
      { x: 370, y: 3760, w: 44, rho: 0.9, mix: 0.85 },
      { x: 426, y: 3950, w: 36, rho: 0.5, mix: 0.9 },
      { x: 430, y: 4250, w: 26, rho: 0, mix: 1 },
    ],
    branches: [
      { at: 0.1, angle: -60, length: 90, w: 18, mix: 0.05, bend: 18 },
      { at: 0.43, angle: 62, length: 70, w: 16, mix: 1, bend: -16 },
      { at: 0.66, angle: -58, length: 80, w: 16, mix: 0, bend: 16 },
      { at: 0.82, angle: 55, length: 90, w: 18, mix: 0.1, bend: -18 },
    ],
  },
};

// ------------------------------------------------------------------ spine

// Centripetal Catmull-Rom through the waypoints, sampled every `step` px,
// with arc length and every waypoint attribute interpolated along it.
function buildSpine(points, step = 2) {
  const ext = [
    mirror(points[1], points[0]),
    ...points,
    mirror(points.at(-2), points.at(-1)),
  ];
  const raw = [];
  for (let i = 1; i < ext.length - 2; i++) {
    const [p0, p1, p2, p3] = [ext[i - 1], ext[i], ext[i + 1], ext[i + 2]];
    const t0 = 0;
    const t1 = t0 + Math.pow(dist(p0, p1), 0.5) + 1e-6;
    const t2 = t1 + Math.pow(dist(p1, p2), 0.5) + 1e-6;
    const t3 = t2 + Math.pow(dist(p2, p3), 0.5) + 1e-6;
    const n = Math.max(8, Math.ceil(dist(p1, p2) / 1.5));
    for (let k = 0; k < n; k++) {
      const t = t1 + ((t2 - t1) * k) / n;
      const a1 = lerpP(p0, p1, (t - t0) / (t1 - t0));
      const a2 = lerpP(p1, p2, (t - t1) / (t2 - t1));
      const a3 = lerpP(p2, p3, (t - t2) / (t3 - t2));
      const b1 = lerpP(a1, a2, (t - t0) / (t2 - t0));
      const b2 = lerpP(a2, a3, (t - t1) / (t3 - t1));
      const c = lerpP(b1, b2, (t - t1) / (t2 - t1));
      const f = smoothstep(0, 1, k / n);
      raw.push({
        x: c.x,
        y: c.y,
        w: p1.w + (p2.w - p1.w) * f,
        rho: p1.rho + (p2.rho - p1.rho) * f,
        mix: p1.mix + (p2.mix - p1.mix) * f,
      });
    }
  }
  raw.push({ ...points.at(-1) });
  // Resample at an even step.
  const out = [];
  let s = 0;
  let next = 0;
  for (let i = 0; i < raw.length; i++) {
    if (i > 0) s += dist(raw[i - 1], raw[i]);
    if (s >= next || i === raw.length - 1) {
      out.push({ ...raw[i], s });
      next = s + step;
    }
  }
  for (let i = 0; i < out.length; i++) {
    const a = out[Math.max(0, i - 3)];
    const b = out[Math.min(out.length - 1, i + 3)];
    const len = dist(a, b) || 1;
    out[i].tx = (b.x - a.x) / len;
    out[i].ty = (b.y - a.y) / len;
  }
  return { points: out, length: s };
}

const dist = (a, b) => Math.hypot(b.x - a.x, b.y - a.y);
const lerpP = (a, b, t) => ({
  x: a.x + (b.x - a.x) * t,
  y: a.y + (b.y - a.y) * t,
});
const mirror = (a, b) => ({ ...b, x: 2 * b.x - a.x, y: 2 * b.y - a.y });

// A branch: a quadratic stroke from its spine point outward.
function branchSpine(spine, branch) {
  let base;
  let end;
  if (branch.toward) {
    const [tx, ty] = branch.toward;
    // The spine point nearest the target, a little before it (the paint
    // comes down the river and turns off toward the station).
    let best = 0;
    let bestD = Infinity;
    spine.points.forEach((p, i) => {
      const d = Math.hypot(p.x - tx, p.y - (ty - 95));
      if (d < bestD) {
        bestD = d;
        best = i;
      }
    });
    base = spine.points[best];
    end = { x: tx - 8, y: ty };
  } else {
    base = atFraction(spine, branch.at);
    const angle = (branch.angle * Math.PI) / 180;
    // Rotate the spine's direction; positive angles turn toward +x when
    // the spine runs down the page.
    const cos = Math.cos(-angle);
    const sin = Math.sin(-angle);
    const dx = base.tx * cos - base.ty * sin;
    const dy = base.tx * sin + base.ty * cos;
    end = { x: base.x + dx * branch.length, y: base.y + dy * branch.length };
  }
  const bend = branch.bend ?? 14;
  const len = dist(base, end);
  const nx = -(end.y - base.y) / len;
  const ny = (end.x - base.x) / len;
  const ctrl = {
    x: (base.x + end.x) / 2 + nx * bend,
    y: (base.y + end.y) / 2 + ny * bend,
  };
  const points = [];
  let s = 0;
  let prev = null;
  const n = Math.ceil(len / 2) + 1;
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const p = {
      x: (1 - t) * (1 - t) * base.x + 2 * (1 - t) * t * ctrl.x + t * t * end.x,
      y: (1 - t) * (1 - t) * base.y + 2 * (1 - t) * t * ctrl.y + t * t * end.y,
    };
    if (prev) s += dist(prev, p);
    // Out of the river (fading in from it), tapering to a dry tip.
    points.push({
      ...p,
      s,
      w: branch.w * (1 - 0.82 * smoothstep(0.2, 1, t)),
      rho: smoothstep(0.02, 0.3, t) * (1 - 0.7 * smoothstep(0.55, 1, t)),
      mix: branch.mix,
    });
    prev = p;
  }
  for (let i = 0; i < points.length; i++) {
    const a = points[Math.max(0, i - 2)];
    const b = points[Math.min(points.length - 1, i + 2)];
    const l = dist(a, b) || 1;
    points[i].tx = (b.x - a.x) / l;
    points[i].ty = (b.y - a.y) / l;
  }
  return { points, length: s, baseS: base.s };
}

function atFraction(spine, fraction) {
  const target = fraction * spine.length;
  return spine.points.reduce((best, p) =>
    Math.abs(p.s - target) < Math.abs(best.s - target) ? p : best,
  );
}

// ------------------------------------------------------------- rasterising

// Nearest spine sample for every pixel within reach of the stroke: its arc
// position, signed distance across, and the sample itself.
function locateAll(spine, width, height, scale, reach) {
  const count = width * height;
  const best = new Float32Array(count).fill(Infinity);
  const along = new Float32Array(count);
  const across = new Float32Array(count);
  const index = new Int32Array(count).fill(-1);
  spine.points.forEach((p, i) => {
    const r = (p.w * reach + 24) * scale;
    const cx = p.x * scale;
    const cy = p.y * scale;
    const x0 = Math.max(0, Math.floor(cx - r));
    const x1 = Math.min(width - 1, Math.ceil(cx + r));
    const y0 = Math.max(0, Math.floor(cy - r));
    const y1 = Math.min(height - 1, Math.ceil(cy + r));
    for (let y = y0; y <= y1; y++) {
      const dy = y + 0.5 - cy;
      for (let x = x0; x <= x1; x++) {
        const dx = x + 0.5 - cx;
        const d2 = dx * dx + dy * dy;
        const k = y * width + x;
        if (d2 < best[k] && d2 < r * r) {
          best[k] = d2;
          index[k] = i;
          along[k] = p.s + (dx * p.tx + dy * p.ty) / scale;
          across[k] = (dx * p.ty - dy * p.tx) / scale;
        }
      }
    }
  });
  return { index, along, across };
}

// The backdrop picture as a texture: bilinear RGBA reads.
async function loadTexture() {
  const { data, info } = await sharp(
    resolve(watercolorDir, "watercolor-background.webp"),
  )
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const { width, height } = info;
  const read = (x, y, out) => {
    x = Math.min(width - 1.001, Math.max(0, x));
    y = Math.min(height - 1.001, Math.max(0, y));
    const ix = Math.floor(x);
    const iy = Math.floor(y);
    const fx = x - ix;
    const fy = y - iy;
    for (let c = 0; c < 4; c++) {
      const a = data[(iy * width + ix) * 4 + c];
      const b = data[(iy * width + ix + 1) * 4 + c];
      const d = data[((iy + 1) * width + ix) * 4 + c];
      const e = data[((iy + 1) * width + ix + 1) * 4 + c];
      out[c] =
        (a * (1 - fx) + b * fx) * (1 - fy) + (d * (1 - fx) + e * fx) * fy;
    }
    return out;
  };
  return { width, height, read };
}

// One stroke (the spine or a branch) into colour + alpha + time buffers,
// painted over what is there ("over" compositing, as a glaze).
function paintStroke(stroke, target, texture, options) {
  const { width, height, scale, seed, color, alpha, time } = target;
  const { timeOf, textureOffset = 0 } = options;
  const { index, along, across } = locateAll(
    stroke,
    width,
    height,
    scale,
    1.35,
  );
  const edges = noise2d(seed * 7 + 1);
  const streaks = noise2d(seed * 7 + 2);
  const swell = noise2d(seed * 7 + 3);
  const pooling = noise2d(seed * 7 + 4);
  const drift = noise2d(seed * 7 + 5);
  const sample = [0, 0, 0, 0];
  const ramp = 1.8;
  const L = stroke.length;

  for (let k = 0; k < width * height; k++) {
    const i = index[k];
    if (i < 0) continue;
    const p = stroke.points[i];
    const s = along[k];
    const d = across[k];
    const side = d >= 0 ? 1 : -1;
    const u = s / L;
    if (u < -0.02 || u > 1.02) continue;

    // Width swells and narrows along the way; each edge wanders on its own.
    const w =
      p.w *
      (1 + 0.24 * swell(s / 240, 3) + 0.1 * swell(s / 70, 9)) *
      (1 +
        0.13 * edges(s / 120 + side * 31, side * 5) +
        0.06 * edges(s / 36 + side * 17, side * 7 + 3) +
        0.03 * edges(s / 9 + side * 13, side * 3 + 9));
    const v = Math.abs(d) / Math.max(w, 1);

    // Bristle streaks run along the path: fast across, slow along.
    const streak = streaks(d / 2.6, s / 95, 2);
    const q = (streak + 1) / 2;

    let a = clamp01(((1 - v) * w) / ramp);
    // Dry-brush breaks in the outer third, more toward the edge.
    const dryEdge = smoothstep(0.62, 1, v);
    a *= 1 - dryEdge * smoothstep(0.42, 0.62, 1 - q);
    // Loose bristle hairs just past the edge.
    if (v > 1 && v < 1.16) {
      a = Math.max(a, smoothstep(0.8, 0.9, q) * (1 - (v - 1) / 0.16) * 0.8);
    }
    // Density: thin to streaks, then nothing. The brush sets down softly.
    const rho =
      p.rho * (0.92 + 0.08 * drift(s / 300, 1)) * smoothstep(-0.01, 0.045, u);
    a *= smoothstep(-0.07, 0.07, q - (1 - rho));
    if (a <= 0.004) continue;

    // Pigment from the backdrop picture, laid along the path.
    const mix = clamp01(p.mix + 0.12 * drift(s / 180, d / 90 + 4));
    const tw = texture.width;
    const th = texture.height;
    const pink = 0.1 + 0.2 * (0.5 + 0.5 * Math.sin((s + textureOffset) / 330));
    const green =
      0.64 + 0.24 * (0.5 + 0.5 * Math.sin((s + textureOffset) / 390 + 2));
    const tx = (pink + (green - pink) * smoothstep(0, 1, mix)) * tw;
    const ty = th * (0.5 + 0.17 * drift(s / 700, 11)) + d * 1.25;
    texture.read(tx, ty, sample);
    let r = sample[0];
    let g = sample[1];
    let b = sample[2];
    const texA = sample[3] / 255;
    // A little livelier than the backdrop: push the colour away from its
    // own grey.
    const grey = (r + g + b) / 3;
    const lively = 1.28;
    r = grey + (r - grey) * lively;
    g = grey + (g - grey) * lively;
    b = grey + (b - grey) * lively;
    // Pigment pools at the edges of a wash: a slightly darker rim.
    const rim =
      0.16 *
      smoothstep(0.7, 0.96, v) *
      (1 - dryEdge * 0.5) *
      (0.7 + 0.3 * pooling(s / 60, side * 3));
    r *= 1 - rim;
    g *= 1 - rim;
    b *= 1 - rim;
    a *= 0.35 + 0.65 * texA;
    a *= 0.9;

    // Over.
    const k4 = k * 4;
    const da = alpha[k];
    const oa = a + da * (1 - a);
    if (oa > 0) {
      color[k4] = (r * a + color[k4] * da * (1 - a)) / oa;
      color[k4 + 1] = (g * a + color[k4 + 1] * da * (1 - a)) / oa;
      color[k4 + 2] = (b * a + color[k4 + 2] * da * (1 - a)) / oa;
    }
    alpha[k] = oa;

    // Time: along the path; the belly of the brush ahead of its edges;
    // ragged along the streaks. A stroke laid over another takes over the
    // pixel's time where it is the more opaque one.
    const t = timeOf(s, v, streak);
    if (time[k] === Infinity || a >= da * 0.6) time[k] = t;
  }
}

// ---------------------------------------------------------------- the path

async function generatePath(name, layout, texture) {
  const { scale } = layout;
  const width = Math.round(layout.width * scale);
  const height = Math.round(layout.height * scale);
  const target = {
    width,
    height,
    scale,
    seed: layout.seed,
    color: new Float32Array(width * height * 4),
    alpha: new Float32Array(width * height),
    time: new Float32Array(width * height).fill(Infinity),
  };
  const spine = buildSpine(layout.waypoints);
  const L = spine.length;
  const jitter = noise2d(layout.seed * 3 + 7);

  paintStroke(spine, target, texture, {
    timeOf: (s, v, streak) =>
      clamp01(s / L) +
      (0.3 * v * v * 60 + 18 * streak + 6 * jitter(s / 40, v * 3)) / L,
  });

  layout.branches.forEach((branch, i) => {
    const stroke = branchSpine(spine, branch);
    target.seed = layout.seed * 13 + i + 1;
    const t0 = stroke.baseS / L + 0.004;
    // A branch fills while the main front moves on about 140 px.
    const rate = 140 / L / stroke.length;
    paintStroke(stroke, target, texture, {
      textureOffset: 600 * (i + 1),
      timeOf: (s, v, streak) =>
        t0 + s * rate + (0.2 * v * v * 30 + 8 * streak) / L,
    });
  });

  // Colour image and tiles.
  const rgba = Buffer.alloc(width * height * 4);
  for (let k = 0; k < width * height; k++) {
    const a = target.alpha[k];
    rgba[k * 4] = Math.round(Math.min(255, Math.max(0, target.color[k * 4])));
    rgba[k * 4 + 1] = Math.round(
      Math.min(255, Math.max(0, target.color[k * 4 + 1])),
    );
    rgba[k * 4 + 2] = Math.round(
      Math.min(255, Math.max(0, target.color[k * 4 + 2])),
    );
    rgba[k * 4 + 3] = Math.round(a * 255);
  }

  const tiles = [];
  const tileHeight = Math.ceil(height / layout.tiles);
  const timeScale = 0.5;
  for (let n = 0; n < layout.tiles; n++) {
    const y0 = n * tileHeight;
    const h = Math.min(tileHeight, height - y0);
    let t0 = Infinity;
    let t1 = -Infinity;
    for (let y = y0; y < y0 + h; y++) {
      for (let x = 0; x < width; x++) {
        const k = y * width + x;
        if (target.alpha[k] > 0.01) {
          t0 = Math.min(t0, target.time[k]);
          t1 = Math.max(t1, target.time[k]);
        }
      }
    }
    if (t0 === Infinity) continue;
    t0 = Math.max(0, t0 - 0.002);
    t1 = t1 + 0.002;
    const grey = Buffer.alloc(width * h);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < width; x++) {
        const k = (y0 + y) * width + x;
        const t = target.time[k] === Infinity ? t1 : target.time[k];
        grey[y * width + x] = Math.round(clamp01((t - t0) / (t1 - t0)) * 255);
      }
    }
    const base = `path-${name}-${n + 1}`;
    await sharp(rgba, { raw: { width, height, channels: 4 } })
      .extract({ left: 0, top: y0, width, height: h })
      .webp({ quality: 84, alphaQuality: 90, effort: 6 })
      .toFile(resolve(outDir, `${base}.webp`));
    const tw = Math.round(width * timeScale);
    const thh = Math.round(h * timeScale);
    await sharp(grey, { raw: { width, height: h, channels: 1 } })
      .resize(tw, thh, { kernel: "lanczos3" })
      .png({ compressionLevel: 9 })
      .toFile(resolve(outDir, `${base}-time.png`));
    tiles.push({
      src: `/watercolor/story/${base}.webp`,
      time: `/watercolor/story/${base}-time.png`,
      top: round(y0 / scale),
      height: round(h / scale),
      t0: round(t0, 5),
      t1: round(t1, 5),
    });
  }

  // Front table: the spine's height on the page at each time, made
  // monotonic (a stretch that runs sideways takes a little scroll too).
  const samples = 96;
  const front = [];
  let lastY = -Infinity;
  for (let i = 0; i <= samples; i++) {
    const t = i / samples;
    const p = atFraction(spine, t);
    const y = Math.max(lastY + 2, 0.82 * p.y + 0.18 * t * layout.height);
    front.push([round(t, 4), round(y)]);
    lastY = y;
  }

  if (preview) {
    await sharp({
      create: {
        width,
        height,
        channels: 3,
        background: "#f8f7f3",
      },
    })
      .composite([{ input: rgba, raw: { width, height, channels: 4 } }])
      .png()
      .toFile(`/tmp/story-path-${name}.png`);
  }

  return {
    width: layout.width,
    height: layout.height,
    anchors: layout.anchors,
    length: round(L),
    tiles,
    front,
  };
}

// ------------------------------------------------------------ side splashes

// Time map of a supplied splash patch flowing in from one edge: blooms
// seeded along that edge, spreading through a warped field.
async function generateSplash(file, seed) {
  const { data, info } = await sharp(resolve(watercolorDir, file))
    .ensureAlpha()
    .resize({ width: 362 })
    .raw()
    .toBuffer({ resolveWithObject: true });
  const { width, height } = info;
  const random = rng(seed);
  const warp = noise2d(seed * 5 + 1);
  const lobes = noise2d(seed * 5 + 2);
  const blooms = Array.from({ length: 7 }, (_, i) => ({
    // From the left edge (the runtime mirrors it for the right side).
    x: -0.05 * width + random() * 0.12 * width,
    y: ((i + 0.3 + random() * 0.4) / 7) * height,
    at: 0.05 * Math.abs(i - 3) + random() * 0.06,
    speed: 0.85 + random() * 0.3,
  }));
  const time = new Float32Array(width * height);
  let max = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const wx = x + 26 * warp(x / 70, y / 70);
      const wy = y + 26 * warp(x / 70 + 9, y / 70 + 4);
      let t = Infinity;
      for (const bloom of blooms) {
        const dx = wx - bloom.x;
        const dy = wy - bloom.y;
        const angle = Math.atan2(dy, dx);
        const r = Math.hypot(dx, dy) / width;
        // Cauliflower front: lobes around each bloom.
        const lobe = 1 + 0.22 * lobes(angle * 1.7 + bloom.y, r * 6);
        t = Math.min(t, bloom.at + (r / bloom.speed) * lobe);
      }
      time[y * width + x] = t;
      if (data[(y * width + x) * 4 + 3] > 8) max = Math.max(max, t);
    }
  }
  const grey = Buffer.alloc(width * height);
  for (let k = 0; k < width * height; k++) {
    grey[k] = Math.round(clamp01(time[k] / max) * 255);
  }
  const base = file.replace(".png", "");
  await sharp(grey, { raw: { width, height, channels: 1 } })
    .png({ compressionLevel: 9 })
    .toFile(resolve(outDir, `${base}-time.png`));
  return {
    src: `/watercolor/${file}`,
    time: `/watercolor/story/${base}-time.png`,
  };
}

const round = (value, digits = 1) => {
  const f = 10 ** digits;
  return Math.round(value * f) / f;
};

// ------------------------------------------------------------------- main

mkdirSync(outDir, { recursive: true });
const texture = await loadTexture();
const paths = {};
for (const [name, layout] of Object.entries(layouts)) {
  stdout.write(`path ${name}… `);
  paths[name] = await generatePath(name, layout, texture);
  stdout.write(`${paths[name].tiles.length} tiles\n`);
}
const splashes = {
  blush: await generateSplash("splash-pink-1.png", 5),
  sage: await generateSplash("splash-sage-1.png", 9),
};

writeFileSync(
  dataFile,
  `// Generated by packages/design-system/scripts/generate-scroll-story.mjs.
// Do not edit by hand: rerun \`pnpm --filter @repo/design-system generate:story\`.

export const scrollStory = ${JSON.stringify({ paths, splashes }, null, 2)} as const;
`,
);
stdout.write("done\n");
