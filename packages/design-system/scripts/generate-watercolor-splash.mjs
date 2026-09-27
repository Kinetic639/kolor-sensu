#!/usr/bin/env node
// Generates the photo's splash matte for WatercolorImage's entrance
// animation (public site). The backdrop is painted in with brush strokes
// (generate-paint-matte.mjs); the photo is not painted, it spreads in, the
// way watercolor runs across wet paper, in blooms.
//
// A set of blooms, each starting from its own seed at its own moment: near
// the middle first, further out later, on jittered elliptical rings. Every pixel of the layer belongs to whichever bloom reaches it
// first, so the blooms meet along irregular borders the way wet patches of
// paint do. Distances are measured through a warped field with lobes per
// bloom and a cauliflower edge, so no bloom is a circle and its front is
// ragged at every moment. Each bloom spreads with a sine.out ease over a
// duration set by how far it has to travel.
//
// All of it is baked into one time map of the photo layer's box (3 : 2):
// grey = when each pixel gets paint (0 at the photo's start, 255 at
// SPLASH_END), opaque over the whole box. The runtime (packages/ui/src/
// public-site/watercolor-paint-matte.ts) shows the pixels whose time has
// come with one SVG threshold filter and one linear GSAP tween. Once done,
// the map is opaque everywhere, so dropping the matte leaves exactly the
// static composition (the photo keeps its own brushed edge, photo-mask.png).
//
// Output: apps/web/public/watercolor/watercolor-splash-photo.png and
//         packages/ui/src/public-site/watercolor-splash-matte.data.ts
// Run:    pnpm --filter @repo/design-system generate:watercolor
//         (`--preview <dir>` also writes the bloom regions, for checking)
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
} from "./raster-mask.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const publicDir = resolve(here, "../../../apps/web/public/watercolor");
const dataFile = resolve(
  here,
  "../../ui/src/public-site/watercolor-splash-matte.data.ts",
);

// Texture pixels per design unit: blooms are soft, 400 px across is plenty.
const SCALE = 0.4;
// Every bloom is done this long after the photo starts (s).
const SPLASH_END = 0.8;
// How far a bloom spreads per second, in design units: the head start one
// bloom has over another, turned into distance.
const SPREAD = 1100;
// A bloom's wet front, in its own time map (as in the specialist cards).
const BLOOM_FRONT = 1 / 26;

// prettier-ignore
const layers = {
  photo: {
    width: 1000,
    height: 666,
    centre: [500, 340],
    // Rings are ellipses as wide as the box is: radius in design units
    // vertically, `stretch` times that horizontally.
    stretch: 1.5,
    seed: 1301,
    rings: [
      { name: "core", count: 3, radius: 40, start: 0.0 },
      { name: "near", count: 6, radius: 125, start: 0.06 },
      { name: "mid", count: 8, radius: 215, start: 0.12 },
      { name: "far", count: 10, radius: 310, start: 0.19 },
    ],
  },
};

function placeBlooms(layer) {
  const random = rng(layer.seed);
  const placed = [];
  for (const ring of layer.rings) {
    const turn = random() * Math.PI * 2;
    for (let i = 0; i < ring.count; i++) {
      const angle =
        turn + ((i + 0.5 + (random() - 0.5) * 0.6) / ring.count) * Math.PI * 2;
      const radius = ring.radius * (0.85 + 0.3 * random());
      const x = layer.centre[0] + Math.cos(angle) * radius * layer.stretch;
      const y = layer.centre[1] + Math.sin(angle) * radius;
      // One in five lags behind its ring: separate drops before they merge.
      const lag = random() < 0.2 ? 0.05 : 0;
      placed.push({
        id: `${ring.name}-${i + 1}`,
        at: [
          Math.round(Math.min(layer.width - 40, Math.max(40, x))),
          Math.round(Math.min(layer.height - 30, Math.max(30, y))),
        ],
        start: Math.round((ring.start + 0.05 * random() + lag) * 100) / 100,
      });
    }
  }
  placed[0].start = 0;
  return placed;
}

// Distance from a bloom's seed as the paint travels: through a warped field
// (wet paper does not spread evenly), longer in some directions than others
// (lobes), with a cauliflower edge and a fine granulation.
function travelField(seed) {
  const warpX = noise2d(seed + 1);
  const warpY = noise2d(seed + 2);
  const edge = noise2d(seed + 3);
  return (bloom, index) => {
    const lobes = noise2d(seed + 100 + index);
    const ripples = noise2d(seed + 200 + index);
    const [sx, sy] = bloom.at;
    return (x, y) => {
      const qx = x + 70 * warpX(x / 190, y / 190, 3);
      const qy = y + 70 * warpY(x / 190, y / 190, 3);
      const dx = qx - sx;
      const dy = qy - sy;
      const angle = Math.atan2(dy, dx);
      const lobe =
        1 +
        0.32 * lobes(Math.cos(angle) * 1.4 + 3, Math.sin(angle) * 1.4 + 3, 2);
      return (
        Math.hypot(dx, dy) * lobe +
        20 * edge(x / 28, y / 28, 3) +
        9 * ripples(x / 13, y / 13, 2)
      );
    };
  };
}

// Where a bloom's front (sine.out over its duration, running a little past
// both ends of its time map) reaches grey g, as a fraction of its duration.
const reached = (g) =>
  (2 / Math.PI) * Math.asin(clamp01((g + BLOOM_FRONT) / (1 + 2 * BLOOM_FRONT)));

function bake(name, layer) {
  const gw = Math.round(layer.width * SCALE);
  const gh = Math.round(layer.height * SCALE);
  const toX = (px) => (px + 0.5) / SCALE;
  const toY = (py) => (py + 0.5) / SCALE;
  const blooms = placeBlooms(layer);
  const travel = blooms.map(travelField(layer.seed));
  const grain = noise2d(layer.seed + 4);

  // Owner of every pixel (the bloom that reaches it first) and how far that
  // bloom has travelled there.
  const owner = new Int16Array(gw * gh);
  const raw = new Float32Array(gw * gh);
  for (let py = 0; py < gh; py++) {
    for (let px = 0; px < gw; px++) {
      const x = toX(px);
      const y = toY(py);
      let best = 0;
      let bestTime = Infinity;
      let bestTravel = 0;
      blooms.forEach((bloom, k) => {
        const distance = travel[k](x, y);
        const time = bloom.start * SPREAD + distance;
        if (time < bestTime) {
          bestTime = time;
          best = k;
          bestTravel = distance;
        }
      });
      owner[py * gw + px] = best;
      raw[py * gw + px] = bestTravel + 6 * grain(x / 4, y / 4, 2);
    }
  }

  // Per bloom: the span of its travel over its region, and so its duration.
  const first = new Float32Array(blooms.length).fill(Infinity);
  const last = new Float32Array(blooms.length).fill(-Infinity);
  for (let i = 0; i < owner.length; i++) {
    first[owner[i]] = Math.min(first[owner[i]], raw[i]);
    last[owner[i]] = Math.max(last[owner[i]], raw[i]);
  }
  const durations = blooms.map((bloom, k) => {
    if (last[k] < first[k]) return 0;
    const extent = last[k] - first[k];
    const duration = Math.max(
      0.3,
      Math.min(0.6, 0.3 + extent / 1100, SPLASH_END - bloom.start),
    );
    return Math.round(duration * 1000) / 1000;
  });

  // The baked time map: when each pixel gets paint.
  const grey = new Uint8Array(gw * gh);
  for (let i = 0; i < owner.length; i++) {
    const k = owner[i];
    const g = Math.round(
      clamp01((raw[i] - first[k]) / (last[k] - first[k] || 1)) * 63,
    );
    const time = blooms[k].start + durations[k] * reached(g / 63);
    grey[i] = Math.round(255 * clamp01(time / SPLASH_END));
  }
  const file = `watercolor-splash-${name}.png`;
  writeFileSync(
    resolve(publicDir, file),
    encodeGreyAlphaPng(grey, new Uint8Array(gw * gh).fill(255), gw, gh),
  );

  const used = blooms
    .map((bloom, k) => ({ ...bloom, duration: durations[k] }))
    .filter((bloom) => bloom.duration > 0);
  // The same softness as each bloom's own front had, in the map's units.
  const meanDuration =
    used.reduce((sum, bloom) => sum + bloom.duration, 0) / used.length;
  const sharpness = Math.round(SPLASH_END / meanDuration / BLOOM_FRONT);

  if (argv.includes("--preview")) {
    const dir = argv[argv.indexOf("--preview") + 1];
    writeFileSync(
      resolve(dir, `watercolor-splash-${name}-regions.png`),
      encodeAlphaPng(
        Uint8Array.from(owner, (k) => 40 + ((k * 97) % 200)),
        gw,
        gh,
        { color: 255 },
      ),
    );
  }
  return { name, layer, file, gw, gh, blooms: used, sharpness };
}

mkdirSync(publicDir, { recursive: true });
const built = Object.entries(layers).map(([name, layer]) => bake(name, layer));

// ------------------------------------------------------------------ data

const lines = [
  "// Generated by packages/design-system/scripts/generate-watercolor-splash.mjs.",
  "// Do not edit: change the blooms there and run",
  "// `pnpm --filter @repo/design-system generate:watercolor`.",
  "//",
  "// WatercolorImage's photo splash matte: the photo layer's design space",
  "// (width x height units), its baked time map (grey = when each pixel gets",
  "// paint, 0 at the photo's start, 255 at `duration` s) and the sharpness of",
  "// its front. Per bloom (for inspection): its seed (x y), when it starts",
  "// after the photo starts and how long it spreads (s).",
  "",
  "export const watercolorSplash = {",
];
for (const { name, layer, file, gw, gh, blooms, sharpness } of built) {
  lines.push(
    `  ${name}: {`,
    `    width: ${layer.width},`,
    `    height: ${layer.height},`,
    "    time: {",
    `      src: "/watercolor/${file}",`,
    `      width: ${gw},`,
    `      height: ${gh},`,
    `      duration: ${SPLASH_END},`,
    `      sharpness: ${sharpness},`,
    "    },",
    "    blooms: [",
  );
  for (const bloom of blooms) {
    lines.push(
      `      { id: "${bloom.id}", seed: [${bloom.at.join(", ")}], start: ${bloom.start}, duration: ${bloom.duration} },`,
    );
  }
  lines.push("    ],", "  },");
}
lines.push("} as const;", "");
writeFileSync(dataFile, lines.join("\n"));

stdout.write(
  built
    .map(
      ({ file, gw, gh, blooms, sharpness }) =>
        `${file}  ${gw} x ${gh}, ${blooms.length} blooms, sharpness ${sharpness}`,
    )
    .join("\n") + "\n",
);
