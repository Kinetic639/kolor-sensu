#!/usr/bin/env node
// Generates the scroll story of the public homepage (ScrollStoryPath and
// StorySplash in packages/ui/src/public-site/scroll-story.tsx):
//
// 1. The watercolor band. One wide wash (about a third of the screen)
//    behind the whole homepage: it starts off the top left corner, runs
//    over to the right and down the page in a few wide, gentle bends, and
//    ends behind the footer. Two layouts: desktop (from 64 rem, 1440
//    design px wide) and phone (390 wide). Per layout:
//
//    colour   the band itself (RGBA): a smooth, transparent watercolor
//             wash, light enough that copy over it stays easy to read.
//             Pink (the brand's dusty pink, a little livelier) starts the
//             story and turns to the brand green; further down they meet
//             again, wet in wet. The wash has what watercolor has: soft
//             blooms of more and less pigment, a faint granulation (the
//             backdrop picture's grain), pigment pooling a little darker
//             along the wandering edges, and a few short breaks where the
//             brush runs dry. No bristle streaks on the band itself.
//    marks    sporadic dry-brush flicks beside the band, in the background:
//             short, thin, streaky, faint.
//    time     when each pixel gets paint: along the band (0 = start, 1 =
//             end), the middle of the brush ahead of its edges, a little
//             ragged. A flick appears as the band passes it.
//
//    Both are cut into horizontal tiles (so the page only ever animates
//    the one or two tiles the paint front is in); each tile's time map is
//    normalised to its own time range for 8-bit precision.
//
//    The data file also gets a table from the paint front's time to its
//    height on the page (monotonic), which the runtime inverts: the front
//    follows a line a little below the middle of the viewport. And the
//    anchors: where each section started when the band was drawn, so the
//    page can lay it over the sections' real heights.
//
// 2. Side splashes: spilled paint (a puddle and its spray) in the same
//    pink and green, with a time map of where the paint landed and how it
//    ran out from there, fast in fingers and lobes, the spray last.
//
// Output: apps/web/public/watercolor/story/*.{webp,png} and
//         packages/ui/src/public-site/scroll-story.data.ts
// Run:    pnpm --filter @repo/design-system generate:story
//         (--preview writes composites to /tmp for inspection)
// Deterministic: the same seeds always produce the same files.

import { Buffer } from "node:buffer";
import { mkdirSync, readdirSync, rmSync, writeFileSync } from "node:fs";
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

// The band's picture, as supplied (a brush stroke on paper), and the
// paper's colour in it: everything lighter than paint is keyed out.
const bandSource = resolve(
  here,
  "../../../docs/design/references/public/scroll-band.png",
);
const PAPER = [253, 252, 248];
// The picture's pigments are pink only (so far): the spill splashes keep
// their own two pigments.
const PINK = [236, 126, 138];
const GREEN = [104, 170, 110];
const pigment = (mix) => PINK.map((pink, c) => pink + (GREEN[c] - pink) * mix);

// ----------------------------------------------------------------- layouts

// Design px of each layout's artwork: the picture's own proportions at the
// layout's width. The page stretches it over its whole height (no anchors
// yet: the picture was not drawn around the sections).
const layouts = {
  desktop: { width: 1440, tiles: 10 },
  mobile: { width: 390, tiles: 10 },
};

// Even steps along a polyline, with arc length and tangents.
function resample(raw, step) {
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

function atFraction(spine, fraction) {
  const target = fraction * spine.length;
  return spine.points.reduce((best, p) =>
    Math.abs(p.s - target) < Math.abs(best.s - target) ? p : best,
  );
}

// ------------------------------------------------------------- rasterising

// Nearest spine sample for every pixel within reach of the stroke: its arc
// position and signed distance across.
function locateAll(spine, width, height, scale, reach) {
  const count = width * height;
  const best = new Float32Array(count).fill(Infinity);
  const along = new Float32Array(count);
  const across = new Float32Array(count);
  const index = new Int32Array(count).fill(-1);
  spine.points.forEach((p, i) => {
    const r = ((p.w ?? 0) * reach + 8) * scale;
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

// The approved backdrop picture as a texture: bilinear RGBA reads.
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

// ---------------------------------------------------------------- the band

// The picture on paper → paint with an alpha: "colour to alpha" against the
// paper, so the band laid over the page's paper looks as in the picture.
async function loadBand() {
  const { data, info } = await sharp(bandSource)
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const { width, height } = info;
  const rgba = Buffer.alloc(width * height * 4);
  const alpha = new Float32Array(width * height);
  for (let k = 0; k < width * height; k++) {
    let a = 0;
    for (let c = 0; c < 3; c++) {
      a = Math.max(a, (PAPER[c] - data[k * 3 + c]) / PAPER[c]);
    }
    // Paper noise is not paint.
    a = clamp01((a - 0.015) / 0.985);
    alpha[k] = a;
    for (let c = 0; c < 3; c++) {
      rgba[k * 4 + c] =
        a > 0
          ? Math.round(
              Math.min(
                255,
                Math.max(0, PAPER[c] - (PAPER[c] - data[k * 3 + c]) / a),
              ),
            )
          : 0;
    }
    rgba[k * 4 + 3] = Math.round(a * 255);
  }
  return { width, height, rgba, alpha };
}

// The stroke's spine, read from the picture: row by row, where the paint
// is (weighted by how much), smoothed; with half its extent as reach.
function traceSpine(band) {
  const { width, height, alpha } = band;
  const rows = [];
  for (let y = 0; y < height; y++) {
    let sum = 0;
    let sx = 0;
    let min = width;
    let max = 0;
    for (let x = 0; x < width; x++) {
      const a = alpha[y * width + x];
      if (a > 0.08) {
        sum += a;
        sx += a * x;
        min = Math.min(min, x);
        max = Math.max(max, x);
      }
    }
    if (sum > 4) rows.push({ y, x: sx / sum, w: (max - min) / 2 + 10 });
  }
  const smooth = rows.map((row, i) => {
    let x = 0;
    let w = 0;
    let n = 0;
    for (
      let j = Math.max(0, i - 30);
      j <= Math.min(rows.length - 1, i + 30);
      j++
    ) {
      x += rows[j].x;
      w = Math.max(w, rows[j].w);
      n++;
    }
    return { x: x / n, y: row.y + 0.5, w };
  });
  return resample(smooth, 2);
}

// When each pixel gets paint: along the stroke, the middle of the brush a
// little ahead of its edges, and the fuller bristle tracks of the picture
// itself ahead of the thin ones (a ragged, brushed front, not a line).
function timeMap(band, spine) {
  const { width, height, alpha } = band;
  const { index, along, across } = locateAll(spine, width, height, 1, 1.4);
  const L = spine.length;
  const time = new Float32Array(width * height).fill(1);
  for (let k = 0; k < width * height; k++) {
    const i = index[k];
    if (i < 0 || alpha[k] <= 0) continue;
    const p = spine.points[i];
    const v = Math.abs(across[k]) / Math.max(p.w, 1);
    time[k] = clamp01(along[k] / L) + (40 * v * v + 60 * (0.6 - alpha[k])) / L;
  }
  return time;
}

async function generateBand() {
  const band = await loadBand();
  const spine = traceSpine(band);
  const time = timeMap(band, spine);
  const { width, height, rgba, alpha } = band;

  const tiles = [];
  const count = layouts.desktop.tiles;
  const tileHeight = Math.ceil(height / count);
  for (let n = 0; n < count; n++) {
    const y0 = n * tileHeight;
    const h = Math.min(tileHeight, height - y0);
    let t0 = Infinity;
    let t1 = -Infinity;
    for (let k = y0 * width; k < (y0 + h) * width; k++) {
      if (alpha[k] > 0.01) {
        t0 = Math.min(t0, time[k]);
        t1 = Math.max(t1, time[k]);
      }
    }
    if (t0 === Infinity) continue;
    t0 = Math.max(0, t0 - 0.002);
    t1 = t1 + 0.002;
    const grey = Buffer.alloc(width * h);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < width; x++) {
        const k = (y0 + y) * width + x;
        const t = alpha[k] > 0 ? time[k] : t1;
        grey[y * width + x] = Math.round(clamp01((t - t0) / (t1 - t0)) * 255);
      }
    }
    const base = `band-${n + 1}`;
    await sharp(rgba, { raw: { width, height, channels: 4 } })
      .extract({ left: 0, top: y0, width, height: h })
      .webp({ quality: 88, alphaQuality: 90, effort: 6 })
      .toFile(resolve(outDir, `${base}.webp`));
    await sharp(grey, { raw: { width, height: h, channels: 1 } })
      .resize(Math.round(width / 2), Math.round(h / 2), { kernel: "lanczos3" })
      .png({ compressionLevel: 9 })
      .toFile(resolve(outDir, `${base}-time.png`));
    tiles.push({ y0, h, t0, t1, base });
  }

  // Front table: the stroke's height at each time (the spine runs down
  // row by row, so it is monotonic already).
  const samples = 160;
  const frontRows = [];
  for (let i = 0; i <= samples; i++) {
    const t = i / samples;
    frontRows.push([t, atFraction(spine, t).y / height]);
  }

  if (preview) {
    await sharp({
      create: { width, height, channels: 3, background: "#f8f7f3" },
    })
      .composite([{ input: rgba, raw: { width, height, channels: 4 } }])
      .png()
      .toFile("/tmp/story-band.png");
  }

  // The same artwork for each layout, in its design px.
  const paths = {};
  for (const [name, layout] of Object.entries(layouts)) {
    const scale = layout.width / width;
    const designHeight = round(height * scale);
    paths[name] = {
      width: layout.width,
      height: designHeight,
      anchors: {},
      length: round(spine.length * scale),
      tiles: tiles.map((tile) => ({
        src: `/watercolor/story/${tile.base}.webp`,
        time: `/watercolor/story/${tile.base}-time.png`,
        top: round(tile.y0 * scale),
        height: round(tile.h * scale),
        t0: round(tile.t0, 5),
        t1: round(tile.t1, 5),
      })),
      front: frontRows.map(([t, y]) => [round(t, 4), round(y * designHeight)]),
    };
  }
  return paths;
}

// ------------------------------------------------------------ side splashes

// Spilled paint, drawn from the left edge (the runtime mirrors it for the
// right side; about 30 % of it hangs off the screen). One field gives both
// the shape and its time: where the paint landed (a big drop and two
// small ones) and how it ran out from there, faster along a few fingers,
// in lobes. The puddle is the part of the field the paint reached; it is
// lighter inside and pools darker along its edge, and a spray of droplets
// flew further out, each landing a little later.
async function generateSplash(name, mix, seed, texture) {
  const width = 480;
  const height = 640;
  const random = rng(seed);
  const warp = noise2d(seed * 5 + 1);
  const lobes = noise2d(seed * 5 + 2);
  const drops = [
    { x: 0.52, y: 0.47, at: 0, reach: 0.3 },
    {
      x: 0.62 + random() * 0.06,
      y: 0.2 + random() * 0.06,
      at: 0.14,
      reach: 0.1,
    },
    {
      x: 0.58 + random() * 0.08,
      y: 0.74 + random() * 0.06,
      at: 0.2,
      reach: 0.12,
    },
  ].map((drop) => ({ ...drop, x: drop.x * width, y: drop.y * height }));
  const fingers = Array.from({ length: 6 }, () => ({
    angle: random() * Math.PI * 2,
    width: 0.12 + random() * 0.14,
    gain: 0.3 + random() * 0.45,
  }));
  // Field: < 1 inside the puddle; the value is when the paint got there.
  const field = (x, y) => {
    const wx = x + 10 * warp(x / 30, y / 30) + 3 * warp(x / 7 + 3, y / 7);
    const wy =
      y + 10 * warp(x / 30 + 9, y / 30 + 4) + 3 * warp(x / 7, y / 7 + 5);
    let t = Infinity;
    drops.forEach((drop, n) => {
      const dx = wx - drop.x;
      const dy = wy - drop.y;
      const angle = Math.atan2(dy, dx);
      let reach = drop.reach * width;
      if (n === 0) {
        for (const finger of fingers) {
          const off = Math.abs(
            ((angle - finger.angle + Math.PI * 3) % (Math.PI * 2)) - Math.PI,
          );
          reach *= 1 + finger.gain * smoothstep(finger.width, 0, off);
        }
      }
      reach *= 1 + 0.18 * lobes(angle * 2.4 + n * 5, 0.5);
      t = Math.min(t, drop.at + (Math.hypot(dx, dy) / reach) * (1 - drop.at));
    });
    return t;
  };
  // The spray: droplets further out along the fingers and around.
  const droplets = Array.from({ length: 70 }, () => {
    const finger = fingers[Math.floor(random() * fingers.length)];
    const angle = finger.angle + (random() - 0.5) * 0.9;
    const r = (0.32 + random() * 0.3) * width * (1 + finger.gain * 0.5);
    return {
      x: drops[0].x + Math.cos(angle) * r,
      y: drops[0].y + Math.sin(angle) * r,
      size: 1.2 + random() ** 3 * 7,
      at: 0.55 + random() * 0.35,
    };
  });

  const rgba = Buffer.alloc(width * height * 4);
  const grey = Buffer.alloc(width * height);
  const rgb = pigment(mix);
  const sample = [0, 0, 0, 0];
  const tint = [0, 0, 0];
  const texX = (mix < 0.5 ? 0.04 : 0.69) * texture.width;
  const texY = 0.2 * texture.height;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const k = y * width + x;
      const f = field(x, y);
      let a = 0;
      let t = 1;
      tint[0] = rgb[0];
      tint[1] = rgb[1];
      tint[2] = rgb[2];
      if (f < 1.03) {
        // A crisp dried edge, faded out before the picture's own edges.
        const edge =
          smoothstep(1.01, 0.995, f) *
          smoothstep(width, width - 40, x) *
          smoothstep(0, 40, y) *
          smoothstep(height, height - 40, y);
        // Lighter where it pooled deep, darker where it dried at the edge.
        // Real watercolor inside: the approved backdrop's own pigment
        // (its pink or its green side), pooling darker at the edge.
        const rim = smoothstep(0.84, 0.99, f) * smoothstep(1.01, 0.99, f);
        texture.read(texX + x * 0.9, texY + y * 0.9, sample);
        const body = 0.35 + 0.65 * (sample[3] / 255);
        a = edge * Math.min(1, body * (0.62 + 0.38 * rim) + 0.25 * rim);
        // Livelier: halfway to the band's pigment.
        for (let c = 0; c < 3; c++) {
          tint[c] = (sample[c] * 0.55 + rgb[c] * 0.45) * (1 - 0.14 * rim);
        }
        a *= 0.8;
        t = Math.min(1, f);
      }
      for (const drop of droplets) {
        const d = Math.hypot(x - drop.x, y - drop.y);
        if (d < drop.size + 1) {
          const da = smoothstep(drop.size + 1, drop.size - 0.5, d) * 0.7;
          if (da > a) {
            a = da;
            t = drop.at;
          }
        }
      }
      rgba[k * 4] = Math.round(tint[0]);
      rgba[k * 4 + 1] = Math.round(tint[1]);
      rgba[k * 4 + 2] = Math.round(tint[2]);
      rgba[k * 4 + 3] = Math.round(clamp01(a) * 255);
      // Square root: fast at first, slowing as the paint soaks in.
      grey[k] = Math.round(Math.sqrt(clamp01(t)) * 255);
    }
  }
  const base = `spill-${name}`;
  await sharp(rgba, { raw: { width, height, channels: 4 } })
    .webp({ quality: 86, alphaQuality: 90, effort: 6 })
    .toFile(resolve(outDir, `${base}.webp`));
  await sharp(grey, { raw: { width, height, channels: 1 } })
    .resize(width / 2, height / 2)
    .png({ compressionLevel: 9 })
    .toFile(resolve(outDir, `${base}-time.png`));
  if (preview) {
    await sharp({
      create: { width, height, channels: 3, background: "#f8f7f3" },
    })
      .composite([{ input: rgba, raw: { width, height, channels: 4 } }])
      .png()
      .toFile(`/tmp/story-${base}.png`);
  }
  return {
    src: `/watercolor/story/${base}.webp`,
    time: `/watercolor/story/${base}-time.png`,
  };
}

const round = (value, digits = 1) => {
  const f = 10 ** digits;
  return Math.round(value * f) / f;
};

// ------------------------------------------------------------------- main

rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });
const texture = await loadTexture();
stdout.write("band… ");
const paths = await generateBand();
stdout.write(`${paths.desktop.tiles.length} tiles\n`);
const splashes = {
  blush: await generateSplash("blush", 0, 5, texture),
  sage: await generateSplash("sage", 1, 9, texture),
};
stdout.write(`${readdirSync(outDir).length} files\n`);

writeFileSync(
  dataFile,
  `// Generated by packages/design-system/scripts/generate-scroll-story.mjs.
// Do not edit by hand: rerun \`pnpm --filter @repo/design-system generate:story\`.

export const scrollStory = ${JSON.stringify({ paths, splashes }, null, 2)} as const;
`,
);
stdout.write("done\n");
