#!/usr/bin/env node
// Generates the brush matte of OfferTile (the "Nasza oferta" service tiles
// of the public site) and the frames of their supplied watercolor patches.
//
// 1. Brush matte. A tile's paint is laid down in five quick strokes, each
//    running across the whole tile at the angle of the brushwork in the
//    supplied patches (22°, rising to the right), back and forth like a
//    painter filling a patch. Variant "a" (odd tiles of a row) paints top
//    to bottom, its first stroke left to right; variant "b" (even tiles)
//    the opposite way: bottom to top, its first stroke right to left. The
//    strokes are real brush shapes (brush-stroke.mjs: opaque body,
//    dry-brush edges, bristle hairs, ragged lift outside the tile), each an
//    image in the atlas with its time map; the runtime (packages/ui/src/
//    public-site/offer-brush-matte.ts) reveals them with an SVG threshold,
//    one GSAP tween per stroke. Together the strokes cover the whole tile
//    (checked below), so the matte can be dropped at the end.
//
// 2. Frames. The four supplied patches are different files (one 2 : 3,
//    three 3 : 4, with different margins); each tile shows its patch's
//    painted area stretched onto the same 5 : 8 box, so the tiles line up
//    and the matte has one design space. Measured here from each file's
//    alpha, so the files themselves stay exactly as delivered.
//
// Coordinates: the tile box is 500 x 800 design units (5 : 8).
//
// Output: apps/web/public/watercolor/offer-matte.png and
//         packages/ui/src/public-site/offer-brush-matte.data.ts
// Run:    pnpm --filter @repo/design-system generate:watercolor
// Deterministic: the same seeds always produce the same files.

import { writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { argv, stdout } from "node:process";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { renderStroke } from "./brush-stroke.mjs";
import { encodeAlphaPng, encodeGreyAlphaPng } from "./raster-mask.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const publicDir = resolve(here, "../../../apps/web/public/watercolor");
const dataFile = resolve(
  here,
  "../../ui/src/public-site/offer-brush-matte.data.ts",
);

const layer = { width: 500, height: 800 };
// Texture pixels per design unit: a tile is ~170 CSS px wide.
const SCALE = 0.45;

// ------------------------------------------------------------------ strokes

const ANGLE = (22 * Math.PI) / 180;
const BANDS = 5;
// How far past the tile a stroke runs, so its ragged lift and its start are
// outside the paint.
const OVERRUN = 150;

// Along the stroke (rising to the right) and across it (downward).
const along = [Math.cos(ANGLE), -Math.sin(ANGLE)];
const across = [Math.sin(ANGLE), Math.cos(ANGLE)];
const reach = layer.width * across[0] + layer.height * across[1];
const spacing = reach / BANDS;

// Where the line through `centre` (a point) along the stroke direction
// enters and leaves the tile box grown by OVERRUN.
function crossing([cx, cy]) {
  let t0 = -Infinity;
  let t1 = Infinity;
  for (const [p, d, lo, hi] of [
    [cx, along[0], -OVERRUN, layer.width + OVERRUN],
    [cy, along[1], -OVERRUN, layer.height + OVERRUN],
  ]) {
    const a = (lo - p) / d;
    const b = (hi - p) / d;
    t0 = Math.max(t0, Math.min(a, b));
    t1 = Math.min(t1, Math.max(a, b));
  }
  return [t0, t1];
}

// In painting order: "a" from the top band down, "b" from the bottom up.
function strokes(variant) {
  return Array.from({ length: BANDS }, (_, k) => {
    const band = variant === "a" ? k : BANDS - 1 - k;
    const c = spacing * (band + 0.5);
    const centre = [c * across[0], c * across[1]];
    const [t0, t1] = crossing(centre);
    const point = (t) => [
      Math.round(centre[0] + t * along[0]),
      Math.round(centre[1] + t * along[1]),
    ];
    // Back and forth: "a" starts at the left, "b" at the right.
    const leftToRight = (k % 2 === 0) === (variant === "a");
    const [from, to] = leftToRight
      ? [point(t0), point(t1)]
      : [point(t1), point(t0)];
    return {
      id: `band-${k + 1}`,
      from,
      to,
      bend: (k % 2 ? -1 : 1) * 14,
      half: Math.round(spacing * 0.74),
      dry: 0.35,
      seed: (variant === "a" ? 60 : 80) + k,
    };
  });
}

const variants = { a: strokes("a"), b: strokes("b") };
const textures = Object.entries(variants).flatMap(([variant, list]) =>
  list.map((stroke) => ({
    variant,
    stroke,
    ...renderStroke(stroke, layer, SCALE),
  })),
);

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
writeFileSync(
  resolve(publicDir, "offer-matte.png"),
  encodeGreyAlphaPng(atlasGrey, atlasAlpha, atlasWidth, atlasHeight),
);

// Every variant's finished strokes must cover the whole tile, or dropping
// the matte at the end would change the picture.
const GW = Math.round(layer.width * SCALE);
const GH = Math.round(layer.height * SCALE);
const report = [];
let failed = false;
for (const variant of Object.keys(variants)) {
  const empty = new Float32Array(GW * GH).fill(1);
  for (const t of textures.filter((texture) => texture.variant === variant)) {
    for (let y = 0; y < t.h; y++) {
      for (let x = 0; x < t.w; x++) {
        const gx = t.x + x;
        const gy = t.y + y;
        if (gx < 0 || gy < 0 || gx >= GW || gy >= GH) continue;
        empty[gy * GW + gx] *= 1 - t.alpha[y * t.w + x] / 255;
      }
    }
  }
  const open = empty.filter((e) => e > 0.5 / 255).length;
  if (open > 0) failed = true;
  report.push(`${variant}: ${open} of ${GW * GH} px open`);
  if (argv.includes("--preview")) {
    const dir = argv[argv.indexOf("--preview") + 1];
    writeFileSync(
      resolve(dir, `offer-matte-${variant}-union.png`),
      encodeAlphaPng(
        Uint8Array.from(empty, (e) => Math.round((1 - e) * 255)),
        GW,
        GH,
        { color: 255 },
      ),
    );
  }
}

// ------------------------------------------------------------------ frames

// The supplied patches, in the order the tiles use them by default.
const paints = ["sage-1", "pink-1", "sage-2", "pink-2"];

async function frame(name) {
  const file = resolve(publicDir, `offer-${name}.png`);
  const { data, info } = await sharp(file)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const { width: w, height: h } = info;
  let x0 = w;
  let x1 = -1;
  let y0 = h;
  let y1 = -1;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      // Every trace of paint, splatter included, so none of it is outside
      // the tile (and so outside the matte) while the strokes run.
      if (data[(y * w + x) * 4 + 3] <= 8) continue;
      x0 = Math.min(x0, x);
      x1 = Math.max(x1, x);
      y0 = Math.min(y0, y);
      y1 = Math.max(y1, y);
    }
  }
  const f = (v, t) => Math.round((v / t) * 10000) / 10000;
  return {
    name,
    src: `/watercolor/offer-${name}.png`,
    width: w,
    height: h,
    // Painted area as fractions of the file: left, top, right, bottom.
    frame: [f(x0, w), f(y0, h), f(x1 + 1, w), f(y1 + 1, h)],
  };
}

const frames = await Promise.all(paints.map(frame));

// ------------------------------------------------------------------ data

const round = (v) => Math.round(v * 10) / 10;
const lines = [
  "// Generated by packages/design-system/scripts/generate-offer-matte.mjs.",
  "// Do not edit: change the strokes there and run",
  "// `pnpm --filter @repo/design-system generate:watercolor`.",
  "//",
  "// OfferTile's brush matte: five strokes per variant, top to bottom, in the",
  "// 5 : 8 tile box (width x height units). Per stroke: its centreline as a",
  "// quadratic curve from brush-down to lift (x0 y0 cx cy x1 y1) and half its",
  "// width, where its texture sits in the box and in the atlas (x y w h,",
  "// design units / atlas px). Per supplied patch: its file and the painted",
  "// area of it (left top right bottom, fractions) that fills the tile.",
  "",
  "export const offerMatte = {",
  `  width: ${layer.width},`,
  `  height: ${layer.height},`,
  "  atlas: {",
  '    src: "/watercolor/offer-matte.png",',
  `    width: ${atlasWidth},`,
  `    height: ${atlasHeight},`,
  "  },",
  "  variants: {",
];
for (const variant of Object.keys(variants)) {
  lines.push(`    ${variant}: [`);
  for (const t of textures.filter((texture) => texture.variant === variant)) {
    const box = [t.x / SCALE, t.y / SCALE, t.w / SCALE, t.h / SCALE].map(round);
    lines.push(
      "      {",
      `        id: "${t.stroke.id}",`,
      `        path: [${t.control.map(round).join(", ")}],`,
      `        half: ${t.stroke.half},`,
      `        box: [${box.join(", ")}],`,
      `        atlas: [${[PAD, t.atlasY, t.w, t.h].join(", ")}],`,
      "      },",
    );
  }
  lines.push("    ],");
}
lines.push("  },", "  paints: {");
for (const { name, src, width, height, frame: box } of frames) {
  lines.push(
    `    "${name}": {`,
    `      src: "${src}",`,
    `      width: ${width},`,
    `      height: ${height},`,
    `      frame: [${box.join(", ")}],`,
    "    },",
  );
}
lines.push("  },", "} as const;", "");
writeFileSync(dataFile, lines.join("\n"));

stdout.write(
  `offer-matte.png  ${atlasWidth} x ${atlasHeight}, ${textures.length} strokes; ` +
    `finished matte leaves ${report.join(", ")}\n`,
);
if (failed && !argv.includes("--allow-gaps")) {
  throw new Error("The finished offer matte does not cover the whole tile.");
}
