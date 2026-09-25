#!/usr/bin/env node
// Generates the paint matte of WatercolorImage's entrance animation
// (animationPreset="watercolor-reveal"): the brush strokes that paint the
// backdrop and the photo in. The finished composition never uses them.
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
// overlap into the matte; the matte masks the real backdrop and photo
// layers. This is a paint-on "gradient wipe" per stroke, the web version of
// an animated paint matte.
//
// The backdrop's strokes are not authored here: backdrop-brushwork.mjs
// derives them from the watercolor backdrop picture itself (its streaks,
// sweeps and washes), so the backdrop is painted in along its own
// brushwork. The photo's strokes are the table below.
//
// Coordinates: each layer is authored in a design space 1000 units wide
// (backdrop 1000 x 625, 16 : 10; photo 1000 x 666, the photo layer's box).
// Photo strokes run from `from` (brush down) to `to` (brush lifted) along a
// quadratic curve bent sideways by `bend`; `half` is half the stroke width.
// `touchdown` strokes start inside the picture with a rounded blot; the
// others enter from outside the edge. `dry` sets how long the ragged tail is,
// `soft` makes a wash (wavier edge, fewer bristle marks, a wetter front).
//
// When every stroke is complete, the strokes cover the whole layer (checked
// below), so the component can drop the matte and the picture is the static
// composition, pixel for pixel.
//
// Output: apps/web/public/watercolor/paint-matte-{backdrop,photo}.png (atlas
//         of stroke textures, 8-bit grey + alpha PNG) and
//         packages/ui/src/public-site/watercolor-paint-matte.data.ts (stroke
//         geometry and atlas rectangles).
// Run:    pnpm --filter @repo/design-system generate:watercolor
// The output is deterministic: the same seeds always produce the same files.

import { Buffer } from "node:buffer";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { argv, stdout } from "node:process";
import { fileURLToPath } from "node:url";
import { inflateSync } from "node:zlib";
import { backdropRegions } from "./backdrop-brushwork.mjs";
import {
  clamp01,
  encodeAlphaPng,
  encodeGreyAlphaPng,
  noise2d,
  smoothstep,
} from "./raster-mask.mjs";

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
  // The photo is painted from its centre outward, in six bands. In every
  // band one stroke sets down near the centre and runs out to the left edge,
  // and another to the right edge; the two start a little apart, so they
  // overlap in the middle. Strokes run past the edges of the layer, so the
  // photo's own painted edge (photo-mask.png) is what ends them.
  photo: {
    width: 1000,
    height: 666,
    strokes: [
      { id: "center-1", from: [430, 275], to: [1130, 245], bend: -10, half: 90, dry: 0.5, touchdown: true, seed: 31 },
      { id: "center-2", from: [575, 376], to: [-130, 406], bend: 10, half: 90, dry: 0.5, touchdown: true, seed: 32 },
      { id: "center-3", from: [560, 266], to: [-130, 296], bend: 8, half: 90, dry: 0.5, touchdown: true, seed: 33 },
      { id: "center-4", from: [445, 386], to: [1130, 356], bend: -8, half: 90, dry: 0.5, touchdown: true, seed: 34 },
      { id: "upper-center", from: [545, 156], to: [-130, 186], bend: -8, half: 90, dry: 0.5, touchdown: true, seed: 35 },
      { id: "lower-center", from: [455, 496], to: [1130, 466], bend: 8, half: 90, dry: 0.5, touchdown: true, seed: 36 },
      { id: "right-1", from: [470, 166], to: [1130, 136], bend: 6, half: 90, dry: 0.5, touchdown: true, seed: 37 },
      { id: "left-1", from: [540, 486], to: [-130, 516], bend: -6, half: 90, dry: 0.5, touchdown: true, seed: 38 },
      { id: "left-2", from: [520, 46], to: [-130, 76], bend: -6, half: 90, dry: 0.5, touchdown: true, seed: 39 },
      { id: "right-2", from: [450, 56], to: [1130, 26], bend: 6, half: 90, dry: 0.5, touchdown: true, seed: 40 },
      { id: "left-3", from: [530, 596], to: [-130, 626], bend: 8, half: 90, dry: 0.5, touchdown: true, seed: 41 },
      { id: "right-3", from: [440, 606], to: [1130, 576], bend: -8, half: 90, dry: 0.5, touchdown: true, seed: 42 },
    ],
  },
};

// ------------------------------------------------------------ stroke shape

function curve({ from, to, bend }) {
  const [x0, y0] = from;
  const [x2, y2] = to;
  const length = Math.hypot(x2 - x0, y2 - y0);
  const nx = -(y2 - y0) / length;
  const ny = (x2 - x0) / length;
  const x1 = (x0 + x2) / 2 + nx * bend;
  const y1 = (y0 + y2) / 2 + ny * bend;
  const at = (t) => [
    (1 - t) * (1 - t) * x0 + 2 * (1 - t) * t * x1 + t * t * x2,
    (1 - t) * (1 - t) * y0 + 2 * (1 - t) * t * y1 + t * t * y2,
  ];
  // Dense samples with arc length, for nearest-point lookups.
  const count = 240;
  const points = [];
  let total = 0;
  let previous = at(0);
  for (let i = 0; i <= count; i++) {
    const point = at(i / count);
    total += Math.hypot(point[0] - previous[0], point[1] - previous[1]);
    points.push({ x: point[0], y: point[1], s: total });
    previous = point;
  }
  return { control: [x0, y0, x1, y1, x2, y2], points, length: total };
}

// Position of a point relative to the stroke: distance along it (`along`,
// design units from the brush-down point, negative before it, past `length`
// after the lift) and signed distance across it.
function locate(points, x, y) {
  let best = 0;
  let bestDistance = Infinity;
  for (let i = 0; i < points.length; i++) {
    const dx = x - points[i].x;
    const dy = y - points[i].y;
    const distance = dx * dx + dy * dy;
    if (distance < bestDistance) {
      bestDistance = distance;
      best = i;
    }
  }
  const i = Math.min(best, points.length - 2);
  const a = points[i];
  const b = points[i + 1];
  const tx = b.x - a.x;
  const ty = b.y - a.y;
  const segment = Math.hypot(tx, ty);
  const ux = tx / segment;
  const uy = ty / segment;
  const along = a.s + (x - a.x) * ux + (y - a.y) * uy;
  const across = -(x - a.x) * uy + (y - a.y) * ux;
  return { along, across };
}

// Alpha of one brush stroke at a point, 0..1.
function brush(stroke, length) {
  const { half, dry = 1, soft = 0, touchdown = false, seed } = stroke;
  const wobble = noise2d(seed * 7 + 1);
  const edges = noise2d(seed * 7 + 2);
  const streaks = noise2d(seed * 7 + 3);
  const lift = noise2d(seed * 7 + 4);
  const gaps = noise2d(seed * 7 + 5);
  // Soft pigment edge: a short ramp (design units), never a blur.
  const ramp = 2.4;
  const tail = 0.3 * dry; // share of the stroke where the brush runs dry

  return (rawAlong, across) => {
    // A stroke that enters from outside the picture has no start to draw.
    const along = touchdown ? rawAlong : Math.max(0, rawAlong);
    const u = along / length;
    if (u > 1.02) return 0;
    const side = across >= 0 ? 1 : -1;

    // Stroke width: a little narrower where a brush touched down and where
    // it lifts, and never quite constant. A wash has a wavier edge and fewer
    // bristle marks.
    let width = 1 + 0.08 * wobble(u * 2.5, 0.5);
    if (touchdown) width *= 0.72 + 0.28 * smoothstep(0, 0.08, u);
    width *= 1 - 0.16 * smoothstep(0.7, 1, u);
    // Each edge wanders on its own: long, slow waves, shorter ripples and,
    // unless it is a wash, fine bristle jitter.
    const edge =
      half *
      width *
      (1 +
        0.12 * edges(u * 3.2 + side * 31, side * 5) +
        (0.05 + 0.04 * soft) * edges(u * 9 + side * 17, side * 7 + 3) +
        0.035 * (1 - soft) * edges(u * 29 + side * 13, side * 3 + 9));
    const v = Math.abs(across) / edge;

    // Bristle streaks run along the stroke: fast noise across it, slow
    // along it.
    const streak = streaks(across / 2.3, along / 70, 2);

    // Before the brush-down point: an uneven blot where the brush touched
    // down inside the picture.
    if (along < 0) {
      const angle = Math.atan2(across, -along);
      const radius = half * 0.62 * (1 + 0.22 * edges(angle * 1.4 + 40, 7));
      return clamp01((radius - Math.hypot(along, across)) / ramp);
    }

    // Body with a soft edge.
    let a = clamp01(((1 - v) * edge) / ramp);
    // Dry-brush gaps in the outer part of the stroke, more toward the edge.
    const edgeDry = smoothstep(0.74, 1, v) * (1 - 0.6 * soft);
    const edgeThreshold = -1.2 + 1.3 * edgeDry;
    a *= smoothstep(edgeThreshold - 0.12, edgeThreshold + 0.12, streak);
    // Bristle hairs just past the edge.
    if (v >= 1 && v < 1.3 && !soft) {
      const hair = 0.5 + 1.2 * (v - 1);
      a = Math.max(
        a,
        smoothstep(hair - 0.06, hair + 0.06, streak) *
          (1 - smoothstep(1.05, 1.3, v)),
      );
    }

    // Where the brush lifts, the bristles run out of paint in clumps and one
    // by one, and the paint breaks up into streaks before it ends.
    if (tail > 0) {
      const clump = lift(across / 16, 3.5, 2);
      const bristle = lift(across / 2.8, 0.5, 2);
      const runOut = clamp01(0.5 + 0.55 * clump + 0.35 * bristle);
      const lastPaint = 1 - tail * (0.25 + 0.75 * runOut);
      a *= smoothstep(lastPaint + 0.012, lastPaint - 0.012, u);
      const breakup = smoothstep(1 - tail * 1.1, 1, u);
      const threshold = -1.2 + 1.1 * breakup;
      a *= smoothstep(
        threshold - 0.1,
        threshold + 0.1,
        gaps(across / 2.6, along / 45, 2),
      );
    }
    return a;
  };
}

// When the paint reaches a point of the stroke, in design units of brush
// travel (turned into the grey channel later). Paint follows the brush path;
// the belly of the brush runs ahead of its edges, clumps of bristles and
// single bristles run a little ahead or behind, and the whole front wobbles.
// A brush that sets down inside the picture first makes a blot that spreads
// from its centre.
function arrival(stroke, length) {
  const { half, seed, soft = 0 } = stroke;
  const clumps = noise2d(seed * 7 + 6);
  const bristles = noise2d(seed * 7 + 7);
  const wobble = noise2d(seed * 7 + 8);
  return (along, across) => {
    if (along < 0) {
      // The blot soaks outward, faster in some directions than others.
      const angle = Math.atan2(across, -along);
      return (
        0.4 * Math.hypot(along, across) * (1 + 0.45 * clumps(angle * 2, 9))
      );
    }
    const v = Math.min(1.3, Math.abs(across) / half);
    return (
      along +
      length *
        (0.02 * (0.5 + clumps(across / 30, 1.5, 2)) +
          0.03 * (1 - soft) * (0.5 + bristles(across / 4, along / 150, 2)) +
          0.012 * wobble(along / 90, across / 40, 2)) +
      half * 0.4 * v * v
    );
  };
}

// Texture of one stroke, cropped to the layer: { x, y, w, h } in texture
// pixels of the layer, and its alpha.
function renderStroke(stroke, layer) {
  const { points, length, control } = curve(stroke);
  const alphaAt = brush(stroke, length);
  const timeAt = arrival(stroke, length);
  const reach = stroke.half * 1.35;
  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  // Cropped to the layer plus a few pixels, so the image is not sampled at
  // its own border along the layer's edge (that would thin the paint in the
  // last pixel column).
  const margin = 4 / SCALE;
  const clampX = (v) => Math.min(layer.width + margin, Math.max(-margin, v));
  const clampY = (v) => Math.min(layer.height + margin, Math.max(-margin, v));
  const left = Math.floor(clampX(Math.min(...xs) - reach) * SCALE);
  const right = Math.ceil(clampX(Math.max(...xs) + reach) * SCALE);
  const top = Math.floor(clampY(Math.min(...ys) - reach) * SCALE);
  const bottom = Math.ceil(clampY(Math.max(...ys) + reach) * SCALE);
  const w = right - left;
  const h = bottom - top;
  const alpha = new Uint8Array(w * h);
  const time = new Float32Array(w * h);
  let first = Infinity;
  let last = -Infinity;
  for (let py = 0; py < h; py++) {
    for (let px = 0; px < w; px++) {
      const x = (left + px + 0.5) / SCALE;
      const y = (top + py + 0.5) / SCALE;
      const { along, across } = locate(points, x, y);
      if (Math.abs(across) > reach) continue;
      const i = py * w + px;
      // 16 levels are plenty for a soft pigment edge and keep the file small.
      alpha[i] = Math.round(clamp01(alphaAt(along, across)) * 15) * 17;
      if (!alpha[i]) continue;
      time[i] = timeAt(along, across);
      first = Math.min(first, time[i]);
      last = Math.max(last, time[i]);
    }
  }
  // Grey: 0 for the first painted pixel of the stroke, 254 for the last, in
  // 128 steps (the image is smoothed again when it is scaled).
  const grey = new Uint8Array(w * h);
  for (let i = 0; i < grey.length; i++) {
    if (alpha[i]) {
      grey[i] = Math.round(((time[i] - first) / (last - first)) * 127) * 2;
    }
  }
  return { x: left, y: top, w, h, alpha, grey, control };
}

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

// Reads photo-mask.png (written by generate-photo-mask.mjs: palette PNG,
// filters None / Sub / Up) back into alpha values.
function readPhotoMask() {
  const file = readFileSync(resolve(publicDir, "photo-mask.png"));
  const width = file.readUInt32BE(16);
  const height = file.readUInt32BE(20);
  const idat = [];
  for (let offset = 8; offset < file.length;) {
    const length = file.readUInt32BE(offset);
    const type = file.toString("ascii", offset + 4, offset + 8);
    if (type === "IDAT")
      idat.push(file.subarray(offset + 8, offset + 8 + length));
    offset += 12 + length;
  }
  const raw = inflateSync(Buffer.concat(idat));
  const alpha = new Uint8Array(width * height);
  for (let y = 0; y < height; y++) {
    const filter = raw[y * (width + 1)];
    for (let x = 0; x < width; x++) {
      const value = raw[y * (width + 1) + 1 + x];
      const left = x > 0 ? alpha[y * width + x - 1] : 0;
      const up = y > 0 ? alpha[(y - 1) * width + x] : 0;
      alpha[y * width + x] =
        (value + (filter === 1 ? left : filter === 2 ? up : 0)) & 255;
    }
  }
  return { width, height, alpha };
}

// The finished matte must cover everything the layer can show, or dropping
// it at the end would change the picture. The backdrop is checked over the
// whole layer (any backdrop image may be passed); the photo over the painted
// silhouette of photo-mask.png, the only part of the photo ever visible.
function check(built) {
  const { w, h, covered } = coverage(built);
  let within = () => true;
  if (built.name === "photo") {
    const mask = readPhotoMask();
    within = (x, y) =>
      mask.alpha[
        Math.min(mask.height - 1, Math.floor((y / h) * mask.height)) *
          mask.width +
          Math.min(mask.width - 1, Math.floor((x / w) * mask.width))
      ] > 0;
  }
  let checked = 0;
  let open = 0;
  let worst = 1;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (!within(x, y)) continue;
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
    "// Paint matte strokes of WatercolorImage's entrance animation, per layer:",
    "// the design space (width x height units), the atlas of stroke textures,",
    "// and for each stroke where its texture sits in the layer and in the atlas",
    "// (both x y w h, in design units and atlas pixels) and whether it is a wash",
    "// (softer front).",
    "//",
    "// Backdrop strokes are derived from the backdrop picture's brushwork: their",
    "// kind (dry-brush streak, stroke or wash), the side of the picture (pink or",
    "// green), their centreline in painting order (x y pairs; a wash has only",
    "// the point it spreads from) and when they are painted (s, GSAP ease).",
    "// Photo strokes have their centreline as a quadratic curve from brush-down",
    "// to lift (x0 y0 cx cy x1 y1) and half their width.",
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
      if (t.stroke) {
        lines.push(`        id: "${t.stroke.id}",`);
        lines.push(`        path: [${t.control.map(round).join(", ")}],`);
        lines.push(`        half: ${t.stroke.half},`);
        lines.push(`        soft: ${Boolean(t.stroke.soft)},`);
      } else {
        lines.push(`        id: "${t.id}",`);
        lines.push(`        kind: "${t.kind}",`);
        lines.push(`        side: "${t.side}",`);
        lines.push(
          ...numberList(
            "        line: ",
            t.line.flat().map((v) => Math.round(v)),
          ),
        );
        lines.push(`        soft: ${t.kind === "wash"},`);
        lines.push(
          `        timing: { at: ${t.at}, duration: ${t.duration}, ease: "${t.ease}" },`,
        );
      }
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
  buildLayer(
    "photo",
    layers.photo,
    layers.photo.strokes.map((stroke) => ({
      stroke,
      ...renderStroke(stroke, layers.photo),
    })),
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
