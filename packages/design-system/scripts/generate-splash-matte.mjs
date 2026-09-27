#!/usr/bin/env node
// Generates the raster pieces of SpecialistWatercolorCard (public site):
//
// 1. The splash matte: how the watercolor splash behind a specialist is
//    revealed. Not brush strokes (that is WatercolorImage's paint matte) but
//    watercolor spreading on wet paper: a set of blooms, each starting from
//    its own seed at its own moment, near the specialist's torso first and
//    further out later. Every pixel of the artwork box belongs to whichever
//    bloom reaches it first, so the blooms meet along irregular borders the
//    way wet patches of paint do. Distances are measured through a warped
//    field with lobes per bloom and a cauliflower edge, so no bloom is a
//    circle and its front is ragged at every moment.
//
//    Each bloom is one image in the atlas: alpha = its finished region
//    (grown and feathered a little so neighbours overlap without seams),
//    grey = when each of its pixels gets paint (0 first). The blooms are
//    then baked into one time map of the whole box (splash-time.png: grey =
//    when each pixel gets paint, each bloom's start and ease included). The
//    runtime (packages/ui/src/public-site/specialist-splash-matte.ts) shows
//    the pixels whose time has come with one SVG threshold filter and one
//    GSAP tween; the atlas stays for inspection in Storybook. Together the
//    blooms cover the whole box (checked below), so once they are done the
//    matte can be dropped and the splash asset's own alpha is the final
//    shape.
//
// 2. Two static masks in the same 3 : 4 box, for the portrait's lower edge:
//    portrait-dissolve.png  opaque above ~67 % of the box, then the portrait
//                           breaks up into watercolor blotches and is gone
//                           by ~80 %, where the info plate starts;
//    portrait-stain.png     where the splash's pigment is laid over the
//                           lower portrait, strongest at the bottom.
//
// Coordinates: the artwork box is 750 x 1000 design units (3 : 4, the ratio
// of every supplied splash asset).
//
// Output: apps/web/public/watercolor/{splash-matte,splash-time,
//         portrait-dissolve,portrait-stain}.png and
//         packages/ui/src/public-site/specialist-splash-matte.data.ts
// Run:    pnpm --filter @repo/design-system generate:watercolor
// Deterministic: the same seeds always produce the same files.

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { argv, stdout } from "node:process";
import { fileURLToPath } from "node:url";
import {
  clamp01,
  encodeAlphaPng,
  encodeGreyAlphaPng,
  noise2d,
  rng,
  smoothstep,
} from "./raster-mask.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const publicDir = resolve(here, "../../../apps/web/public/watercolor");
const dataFile = resolve(
  here,
  "../../ui/src/public-site/specialist-splash-matte.data.ts",
);

const WIDTH = 750;
const HEIGHT = 1000;
// Texture pixels per design unit. Blooms are soft and the front is feathered
// anyway, so 300 x 400 px for the box is plenty and keeps the atlas small.
const SCALE = 0.4;
const GW = Math.round(WIDTH * SCALE);
const GH = Math.round(HEIGHT * SCALE);
const toX = (px) => (px + 0.5) / SCALE;
const toY = (py) => (py + 0.5) / SCALE;

// ------------------------------------------------------------------ blooms

// Where each bloom starts and when (s after the splash starts): rings of
// seeds around the portrait's torso, TORSO below, each ring further out and
// later. Rings are ellipses (the box is taller than wide), every seed is
// jittered in angle, radius and time, and one in five lags behind its ring,
// so blooms appear as separate drops left, right, above and below before
// they run together. Deterministic: seeded.
const TORSO = [375, 660];
// prettier-ignore
const rings = [
  { name: "core", count: 3, radius: 55, start: 0.0 },
  { name: "near", count: 7, radius: 190, start: 0.06 },
  { name: "mid", count: 9, radius: 330, start: 0.13 },
  { name: "far", count: 10, radius: 500, start: 0.21 },
];

function placeBlooms() {
  const random = rng(705);
  const placed = [];
  for (const ring of rings) {
    const turn = random() * Math.PI * 2;
    for (let i = 0; i < ring.count; i++) {
      const angle =
        turn + ((i + 0.5 + (random() - 0.5) * 0.6) / ring.count) * Math.PI * 2;
      const radius = ring.radius * (0.85 + 0.3 * random());
      const x = TORSO[0] + Math.cos(angle) * radius * 0.72;
      const y = TORSO[1] + Math.sin(angle) * radius;
      const lag = random() < 0.2 ? 0.05 : 0;
      placed.push({
        id: `${ring.name}-${i + 1}`,
        at: [
          Math.round(Math.min(WIDTH - 50, Math.max(50, x))),
          Math.round(Math.min(HEIGHT - 40, Math.max(40, y))),
        ],
        start: Math.round((ring.start + 0.05 * random() + lag) * 100) / 100,
      });
    }
  }
  placed[0].start = 0;
  return placed;
}

const blooms = placeBlooms();

// How far a bloom spreads per second, in design units: the head start one
// bloom has over another, turned into distance.
const SPREAD = 1100;
// The splash starts 0.2 s into the card's reveal and is complete 0.8 s later.
const SPLASH_END = 0.8;

const warpX = noise2d(701);
const warpY = noise2d(702);
const edge = noise2d(703);
const grain = noise2d(704);

// Distance from a bloom's seed as the paint travels: through a warped field
// (wet paper does not spread evenly), longer in some directions than others
// (lobes), with a cauliflower edge and a fine granulation.
function travel(bloom, index) {
  const lobes = noise2d(800 + index);
  const ripples = noise2d(900 + index);
  const [sx, sy] = bloom.at;
  return (x, y) => {
    const qx = x + 70 * warpX(x / 190, y / 190, 3);
    const qy = y + 70 * warpY(x / 190, y / 190, 3);
    const dx = qx - sx;
    const dy = qy - sy;
    const angle = Math.atan2(dy, dx);
    const lobe =
      1 + 0.32 * lobes(Math.cos(angle) * 1.4 + 3, Math.sin(angle) * 1.4 + 3, 2);
    return (
      Math.hypot(dx, dy) * lobe +
      20 * edge(x / 28, y / 28, 3) +
      9 * ripples(x / 13, y / 13, 2)
    );
  };
}

const distances = blooms.map(travel);

// Owner of every texture pixel: the bloom that reaches it first.
const owner = new Int16Array(GW * GH);
for (let py = 0; py < GH; py++) {
  for (let px = 0; px < GW; px++) {
    const x = toX(px);
    const y = toY(py);
    let best = 0;
    let bestTime = Infinity;
    blooms.forEach((bloom, k) => {
      const time = bloom.start * SPREAD + distances[k](x, y);
      if (time < bestTime) {
        bestTime = time;
        best = k;
      }
    });
    owner[py * GW + px] = best;
  }
}

// Texture of one bloom: its region grown by two pixels (neighbours overlap,
// no seams) and feathered over two more; grey = normalised travel from its
// seed, with a little granulation so the front is not a clean contour.
function renderBloom(bloom, k) {
  let minX = GW;
  let minY = GH;
  let maxX = -1;
  let maxY = -1;
  for (let py = 0; py < GH; py++) {
    for (let px = 0; px < GW; px++) {
      if (owner[py * GW + px] !== k) continue;
      minX = Math.min(minX, px);
      maxX = Math.max(maxX, px);
      minY = Math.min(minY, py);
      maxY = Math.max(maxY, py);
    }
  }
  // Out-run everywhere by its neighbours: no region, no bloom.
  if (maxX < 0) return undefined;
  const grow = 2;
  const feather = 2;
  const reach = grow + feather;
  const x0 = Math.max(0, minX - reach);
  const y0 = Math.max(0, minY - reach);
  const x1 = Math.min(GW - 1, maxX + reach);
  const y1 = Math.min(GH - 1, maxY + reach);
  const w = x1 - x0 + 1;
  const h = y1 - y0 + 1;
  const alpha = new Uint8Array(w * h);
  const raw = new Float32Array(w * h);
  let first = Infinity;
  let last = -Infinity;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let nearest = Infinity;
      for (let j = -reach; j <= reach; j++) {
        for (let i = -reach; i <= reach; i++) {
          const d = i * i + j * j;
          if (d >= nearest || d > reach * reach) continue;
          const gx = x0 + x + i;
          const gy = y0 + y + j;
          if (gx < 0 || gy < 0 || gx >= GW || gy >= GH) continue;
          if (owner[gy * GW + gx] === k) nearest = d;
        }
      }
      const d = Math.sqrt(nearest);
      const a =
        d <= grow ? 255 : Math.round(15 * clamp01((reach - d) / feather)) * 17;
      const index = y * w + x;
      alpha[index] = a;
      if (!a) continue;
      const dx = toX(x0 + x);
      const dy = toY(y0 + y);
      raw[index] = distances[k](dx, dy) + 6 * grain(dx / 4, dy / 4, 2);
      first = Math.min(first, raw[index]);
      last = Math.max(last, raw[index]);
    }
  }
  // 64 steps, 0..252: the front passes several per frame anyway.
  const grey = new Uint8Array(w * h);
  for (let i = 0; i < grey.length; i++) {
    if (alpha[i]) {
      grey[i] =
        Math.round(clamp01((raw[i] - first) / (last - first || 1)) * 63) * 4;
    }
  }
  // How far this bloom has to travel sets how long it takes to spread;
  // every bloom is done by SPLASH_END after the splash starts.
  const extent = last - first;
  const duration = Math.max(
    0.3,
    Math.min(0.6, 0.3 + extent / 1100, SPLASH_END - bloom.start),
  );
  return {
    bloom,
    x: x0,
    y: y0,
    w,
    h,
    alpha,
    grey,
    duration: Math.round(duration * 1000) / 1000,
  };
}

const textures = blooms.map(renderBloom).filter(Boolean);

// ------------------------------------------------------------------ atlas

const PAD = 2;
const atlasWidth = Math.max(...textures.map((t) => t.w)) + 2 * PAD;
let atlasHeight = PAD;
for (const t of textures) {
  t.atlasY = atlasHeight;
  atlasHeight += t.h + PAD;
}
const atlasAlpha = new Uint8Array(atlasWidth * atlasHeight);
const atlasGrey = new Uint8Array(atlasWidth * atlasHeight);
for (const t of textures) {
  for (let y = 0; y < t.h; y++) {
    const row = (t.atlasY + y) * atlasWidth + PAD;
    atlasAlpha.set(t.alpha.subarray(y * t.w, (y + 1) * t.w), row);
    atlasGrey.set(t.grey.subarray(y * t.w, (y + 1) * t.w), row);
  }
}
mkdirSync(publicDir, { recursive: true });
writeFileSync(
  resolve(publicDir, "splash-matte.png"),
  encodeGreyAlphaPng(atlasGrey, atlasAlpha, atlasWidth, atlasHeight),
);

// The finished blooms must cover the whole box, or dropping the matte at the
// end would change the picture.
const empty = new Float32Array(GW * GH).fill(1);
for (const t of textures) {
  for (let y = 0; y < t.h; y++) {
    for (let x = 0; x < t.w; x++) {
      empty[(t.y + y) * GW + t.x + x] *= 1 - t.alpha[y * t.w + x] / 255;
    }
  }
}
const open = empty.filter((e) => e > 0.5 / 255).length;

// ---------------------------------------------------------------- time map

// What the runtime actually draws: all blooms baked into one image of the
// box, grey = when each pixel gets paint (0 at the splash's start, 255 at
// SPLASH_END). A bloom's front runs through its own time map with a
// sine.out ease, so its pixel of grey g is reached ease⁻¹(g) of the way
// through the bloom; where blooms overlap, the first one to arrive counts.
// One threshold filter and one linear tween then play every bloom at once,
// instead of a filter and a tween per bloom (27 filters per card, too much
// for the GPU while a row of cards reveals).
const BLOOM_FRONT = 1 / 26;
const reached = (g) =>
  (2 / Math.PI) * Math.asin(clamp01((g + BLOOM_FRONT) / (1 + 2 * BLOOM_FRONT)));
const arrival = new Float32Array(GW * GH).fill(Infinity);
for (const t of textures) {
  for (let y = 0; y < t.h; y++) {
    for (let x = 0; x < t.w; x++) {
      const i = y * t.w + x;
      if (t.alpha[i] < 128) continue;
      const g = (t.y + y) * GW + t.x + x;
      const time = t.bloom.start + t.duration * reached(t.grey[i] / 252);
      if (time < arrival[g]) arrival[g] = time;
    }
  }
}
const timeGrey = Uint8Array.from(arrival, (time) =>
  Math.round(255 * clamp01(time / SPLASH_END)),
);
writeFileSync(
  resolve(publicDir, "splash-time.png"),
  encodeGreyAlphaPng(timeGrey, new Uint8Array(GW * GH).fill(255), GW, GH),
);
// The same softness as each bloom's front had, in the baked map's units.
const meanDuration =
  textures.reduce((sum, t) => sum + t.duration, 0) / textures.length;
const TIME_SHARPNESS = Math.round(SPLASH_END / meanDuration / BLOOM_FRONT);

// ----------------------------------------------------------- portrait masks

// Box ratios of the card layout (public-site.css, .ks-sp__*): the portrait's
// lower edge dissolves between DISSOLVE_TOP and DISSOLVE_BOTTOM; the plate
// starts at DISSOLVE_BOTTOM.
const DISSOLVE_TOP = 0.67;
const DISSOLVE_BOTTOM = 0.8;
const MASK_W = 300;
const MASK_H = 400;
const blotch = noise2d(711);
const fringe = noise2d(712);
const pigment = noise2d(713);

const dissolve = new Uint8Array(MASK_W * MASK_H);
const stain = new Uint8Array(MASK_W * MASK_H);
for (let py = 0; py < MASK_H; py++) {
  for (let px = 0; px < MASK_W; px++) {
    const u = (px + 0.5) / MASK_W;
    const v = (py + 0.5) / MASK_H;
    // 0 at the top of the band, 1 at its bottom.
    const band = (v - DISSOLVE_TOP) / (DISSOLVE_BOTTOM - DISSOLVE_TOP);
    // Blotches a few percent of the box wide, with a ragged fringe: the
    // watercolor eats into the portrait in patches, not along a line.
    const patches =
      0.6 * blotch(u * 7, v * 10, 3) + 0.25 * fringe(u * 30, v * 40, 2);
    const level = band + 0.85 * patches;
    dissolve[py * MASK_W + px] = Math.round(
      255 * (1 - smoothstep(0.24, 0.72, level)),
    );
    // Pigment laid over the portrait just above where it dissolves, in
    // patches of its own.
    const wash = smoothstep(
      0,
      0.45,
      band + 0.6 + 0.9 * pigment(u * 8, v * 11, 3),
    );
    stain[py * MASK_W + px] = Math.round(255 * wash);
  }
}
writeFileSync(
  resolve(publicDir, "portrait-dissolve.png"),
  encodeAlphaPng(dissolve, MASK_W, MASK_H),
);
writeFileSync(
  resolve(publicDir, "portrait-stain.png"),
  encodeAlphaPng(stain, MASK_W, MASK_H),
);

// ------------------------------------------------------------------ data

const round = (v) => Math.round(v * 10) / 10;
const lines = [
  "// Generated by packages/design-system/scripts/generate-splash-matte.mjs.",
  "// Do not edit: change the blooms there and run",
  "// `pnpm --filter @repo/design-system generate:watercolor`.",
  "//",
  "// The splash matte of SpecialistWatercolorCard: the blooms that reveal the",
  "// watercolor splash behind a specialist. Design space: the 3 : 4 artwork",
  "// box (width x height units). `time`: all blooms baked into one time map",
  "// of the box (what the runtime draws), how long it runs (s) and the",
  "// sharpness of its front. Per bloom (for inspection): its seed (x y), when",
  "// it starts after the splash starts and how long it spreads (s), where its",
  "// texture sits in the box and in the atlas (x y w h, design units / atlas",
  "// px).",
  "",
  "export const splashMatte = {",
  `  width: ${WIDTH},`,
  `  height: ${HEIGHT},`,
  "  time: {",
  '    src: "/watercolor/splash-time.png",',
  `    duration: ${SPLASH_END},`,
  `    sharpness: ${TIME_SHARPNESS},`,
  "  },",
  "  atlas: {",
  '    src: "/watercolor/splash-matte.png",',
  `    width: ${atlasWidth},`,
  `    height: ${atlasHeight},`,
  "  },",
  "  blooms: [",
];
for (const t of textures) {
  const box = [t.x / SCALE, t.y / SCALE, t.w / SCALE, t.h / SCALE].map(round);
  lines.push(
    "    {",
    `      id: "${t.bloom.id}",`,
    `      seed: [${t.bloom.at.join(", ")}],`,
    `      start: ${t.bloom.start},`,
    `      duration: ${t.duration},`,
    `      box: [${box.join(", ")}],`,
    `      atlas: [${[PAD, t.atlasY, t.w, t.h].join(", ")}],`,
    "    },",
  );
}
lines.push("  ],", "} as const;", "");
writeFileSync(dataFile, lines.join("\n"));

stdout.write(
  `splash-matte.png  ${atlasWidth} x ${atlasHeight}, ${textures.length} blooms; ` +
    `finished matte leaves ${open} of ${GW * GH} px open\n` +
    `splash-time.png  ${GW} x ${GH}, sharpness ${TIME_SHARPNESS}\n` +
    `portrait-dissolve.png, portrait-stain.png  ${MASK_W} x ${MASK_H}\n`,
);

// A picture of the bloom regions (one grey per bloom) and of the time map,
// for checking by eye: `node generate-splash-matte.mjs --preview <dir>`.
const previewAt = argv.indexOf("--preview");
if (previewAt > 0) {
  const dir = argv[previewAt + 1];
  const regions = new Uint8Array(GW * GH);
  const time = new Uint8Array(GW * GH);
  for (let i = 0; i < GW * GH; i++) {
    regions[i] = 40 + ((owner[i] * 97) % 200);
  }
  for (const t of textures) {
    for (let y = 0; y < t.h; y++) {
      for (let x = 0; x < t.w; x++) {
        const i = y * t.w + x;
        if (t.alpha[i] < 255) continue;
        const g = (t.y + y) * GW + t.x + x;
        const start = t.bloom.start / 0.31;
        time[g] = Math.round(
          255 * clamp01(0.55 * start + 0.45 * (t.grey[i] / 252)),
        );
      }
    }
  }
  writeFileSync(
    resolve(dir, "splash-regions.png"),
    encodeAlphaPng(regions, GW, GH, { color: 255 }),
  );
  writeFileSync(
    resolve(dir, "splash-time.png"),
    encodeAlphaPng(time, GW, GH, { color: 255 }),
  );
}

if (open > 0 && !argv.includes("--allow-gaps")) {
  throw new Error("The finished splash matte does not cover the whole box.");
}
