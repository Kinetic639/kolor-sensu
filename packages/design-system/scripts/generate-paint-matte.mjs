#!/usr/bin/env node
// Generates the paint matte of WatercolorImage's entrance animation
// (animationPreset="watercolor-reveal"): the brush strokes that paint the
// backdrop in. (The photo is not painted: it spreads in, in blooms;
// generate-watercolor-splash.mjs.) The finished composition never uses them.
//
// How the matte works (packages/ui/src/public-site/watercolor-paint-matte.ts):
// every brush stroke is one image in the layer's atlas with two channels,
//
//   alpha    the finished shape of the stroke: an opaque body, dry-brush
//            streaks along its edges, bristle hairs past them and a ragged,
//            streaky tail where the brush lifted;
//   grey     when each pixel of it gets paint (0 = first, 255 = last): along
//            the brush path from where it touched down, with the belly of
//            the brush ahead of its edges, clumps of bristles and single
//            bristles a little ahead or behind, and a wobble.
//
// While a stroke is painted, an SVG filter shows the pixels whose time has
// come (a threshold on the grey channel, moved by GSAP), times their alpha.
// So the paint front is not a line or a shape that moves: it is wherever the
// time map crosses the threshold, and it frays into bristle streaks the way
// a real brush front does. Many such strokes, started at different moments,
// overlap into the matte; the matte masks the real backdrop layer. This is
// a paint-on "gradient wipe" per stroke, the web version of an animated
// paint matte.
//
// The strokes are not authored here: backdrop-brushwork.mjs derives them
// from the watercolor backdrop picture itself (its streaks and sweeps,
// extended to cover the whole picture), so the backdrop is painted in along
// its own brushwork, as brush strokes only.
//
// Coordinates: the backdrop is authored in a design space of 1000 x 625
// units (16 : 10).
//
// When every stroke is complete, the strokes cover the whole layer (checked
// below), so the component can drop the matte and the picture is the static
// composition, pixel for pixel.
//
// Output: apps/web/public/watercolor/paint-matte-backdrop.png (atlas of
//         stroke textures, 8-bit grey + alpha PNG) and
//         packages/ui/src/public-site/watercolor-paint-matte.data.ts (stroke
//         geometry and atlas rectangles).
// Run:    pnpm --filter @repo/design-system generate:watercolor
// The output is deterministic: the same seeds always produce the same files.

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { argv, stdout } from "node:process";
import { fileURLToPath } from "node:url";
import { backdropRegions } from "./backdrop-brushwork.mjs";
import { encodeAlphaPng, encodeGreyAlphaPng } from "./raster-mask.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const publicDir = resolve(here, "../../../apps/web/public/watercolor");
const dataFile = resolve(
  here,
  "../../ui/src/public-site/watercolor-paint-matte.data.ts",
);

// Texture pixels per design unit. The textures are soft pigment, so 0.8 px
// per unit (800 px across the layer) stays sharp enough at any size the
// component is shown, and keeps the atlases small.
const SCALE = 0.7;

// prettier-ignore
const layers = {
  // Derived from this picture (backdrop-brushwork.mjs).
  backdrop: {
    width: 1000,
    height: 625,
    source: resolve(publicDir, "watercolor-background.webp"),
  },
};

// ------------------------------------------------------------ atlas + data

const PAD = 2;

function buildLayer(name, layer, textures) {
  const width = Math.max(...textures.map((t) => t.w)) + 2 * PAD;
  let height = PAD;
  for (const texture of textures) {
    texture.atlasY = height;
    height += texture.h + PAD;
  }
  const atlas = new Uint8Array(width * height);
  const times = new Uint8Array(width * height);
  for (const t of textures) {
    for (let y = 0; y < t.h; y++) {
      const row = (t.atlasY + y) * width + PAD;
      atlas.set(t.alpha.subarray(y * t.w, (y + 1) * t.w), row);
      times.set(t.grey.subarray(y * t.w, (y + 1) * t.w), row);
    }
  }
  const file = `paint-matte-${name}.png`;
  mkdirSync(publicDir, { recursive: true });
  writeFileSync(
    resolve(publicDir, file),
    encodeGreyAlphaPng(times, atlas, width, height),
  );
  return { name, layer, textures, file, width, height, atlas };
}

// Union of every finished stroke, in texture pixels of the whole layer.
function coverage({ layer, textures }) {
  const w = Math.round(layer.width * SCALE);
  const h = Math.round(layer.height * SCALE);
  const empty = new Float32Array(w * h).fill(1);
  for (const t of textures) {
    for (let y = 0; y < t.h; y++) {
      for (let x = 0; x < t.w; x++) {
        const gx = t.x + x;
        const gy = t.y + y;
        if (gx < 0 || gy < 0 || gx >= w || gy >= h) continue;
        empty[gy * w + gx] *= 1 - t.alpha[y * t.w + x] / 255;
      }
    }
  }
  return { w, h, covered: empty.map((e) => 1 - e) };
}

// The finished matte must cover the whole layer (any backdrop image may be
// passed), or dropping it at the end would change the picture.
function check(built) {
  const { w, h, covered } = coverage(built);
  let checked = 0;
  let open = 0;
  let worst = 1;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      checked++;
      const c = covered[y * w + x];
      worst = Math.min(worst, c);
      if (c < 254.5 / 255) open++;
    }
  }
  return { checked, open, worst };
}

const round = (v) => Math.round(v * 10) / 10;

// `prefix[a, b, …],` as Prettier prints it: on one line if it fits in 80
// columns, else the numbers filled into lines under the prefix.
function numberList(prefix, values) {
  const flat = `${prefix}[${values.join(", ")}],`;
  if (flat.length <= 80) return [flat];
  const indent = " ".repeat(prefix.length - prefix.trimStart().length + 2);
  const out = [`${prefix}[`];
  let row = "";
  for (const value of values) {
    const next = row ? `${row} ${value},` : `${indent}${value},`;
    if (row && next.length > 80) {
      out.push(row);
      row = `${indent}${value},`;
    } else {
      row = next;
    }
  }
  out.push(row, `${" ".repeat(indent.length - 2)}],`);
  return out;
}

function dataModule(builds) {
  const lines = [
    "// Generated by packages/design-system/scripts/generate-paint-matte.mjs.",
    "// Do not edit: change the strokes there and run",
    "// `pnpm --filter @repo/design-system generate:watercolor`.",
    "//",
    "// Paint matte strokes of WatercolorImage's backdrop: the design space",
    "// (width x height units), the atlas of stroke textures, and for each",
    "// stroke where its texture sits in the layer and in the atlas (both",
    "// x y w h, in design units and atlas pixels) and whether it has a softer,",
    "// wetter front.",
    "//",
    "// The strokes are derived from the backdrop picture's brushwork: their",
    "// kind (dry-brush streak or stroke), the side of the picture (pink or",
    "// green), their centreline in painting order (x y pairs) and when they are",
    "// painted (s, GSAP ease).",
    "",
    "export const paintMatte = {",
  ];
  for (const b of builds) {
    lines.push(`  ${b.name}: {`);
    lines.push(`    width: ${b.layer.width},`);
    lines.push(`    height: ${b.layer.height},`);
    lines.push(
      "    atlas: {",
      `      src: "/watercolor/${b.file}",`,
      `      width: ${b.width},`,
      `      height: ${b.height},`,
      "    },",
    );
    lines.push("    strokes: [");
    for (const t of b.textures) {
      const box = [t.x / SCALE, t.y / SCALE, t.w / SCALE, t.h / SCALE].map(
        round,
      );
      lines.push("      {");
      lines.push(`        id: "${t.id}",`);
      lines.push(`        kind: "${t.kind}",`);
      lines.push(`        side: "${t.side}",`);
      lines.push(
        ...numberList(
          "        line: ",
          t.line.flat().map((v) => Math.round(v)),
        ),
      );
      // Every backdrop region is a directional brush stroke, never the
      // wetter, softer front of a wash.
      lines.push(`        soft: false,`);
      lines.push(
        `        timing: { at: ${t.at}, duration: ${t.duration}, ease: "${t.ease}" },`,
      );
      lines.push(`        box: [${box.join(", ")}],`);
      lines.push(`        atlas: [${[PAD, t.atlasY, t.w, t.h].join(", ")}],`);
      lines.push("      },");
    }
    lines.push("    ],");
    lines.push("  },");
  }
  lines.push("} as const;", "");
  return lines.join("\n");
}

// A picture of each finished matte (white = painted), for checking by eye:
// `node generate-paint-matte.mjs --preview <dir>`.
function preview(built, dir) {
  const { w, h, covered } = coverage(built);
  const alpha = Uint8Array.from(covered, (c) => Math.round(c * 255));
  writeFileSync(
    resolve(dir, `paint-matte-${built.name}-union.png`),
    encodeAlphaPng(alpha, w, h, { color: 255 }),
  );
}

const builds = [
  buildLayer(
    "backdrop",
    layers.backdrop,
    await backdropRegions(layers.backdrop.source, layers.backdrop, SCALE),
  ),
];
writeFileSync(dataFile, dataModule(builds));

let failed = false;
for (const built of builds) {
  const { checked, open, worst } = check(built);
  stdout.write(
    `paint-matte-${built.name}.png  ${built.width} x ${built.height}, ${built.textures.length} strokes; ` +
      `finished matte leaves ${open} of ${checked} px open (lowest cover ${worst.toFixed(3)})\n`,
  );
  if (open > 0) failed = true;
}
const previewAt = argv.indexOf("--preview");
if (previewAt > 0) {
  for (const built of builds) preview(built, argv[previewAt + 1]);
}
if (failed && !argv.includes("--allow-gaps")) {
  throw new Error("The finished paint matte does not cover the whole layer.");
}
