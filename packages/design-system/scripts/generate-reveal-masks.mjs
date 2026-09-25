#!/usr/bin/env node
// Generates the brush masks for WatercolorImage's entrance animation
// (animationPreset="watercolor-reveal"). They are only used while the
// animation runs; the finished composition uses photo-mask.png alone.
//
// Backdrop: the watercolor backdrop is painted from both edges toward the
// centre. Each side has two masks that slide in at different speeds:
//   reveal-backdrop-{left,right}.png       the pigment: a ragged brush front
//                                          with a wet, uneven zone behind it,
//                                          dry-brush gaps and bristle tips;
//   reveal-backdrop-{left,right}-wash.png  a pale, streaky wash that runs
//                                          ahead of the pigment.
// Because the wash moves faster, the edge keeps changing shape as the brush
// travels, instead of sliding in as one rigid wipe. Each mask is twice the
// box wide: painted on one half, empty on the other, the front in the middle.
//
// Photo: reveal-photo.png is a centred patch of horizontal brush strokes with
// a dry-brush edge and a pale wash around it. The component masks the image
// with it and grows it from nothing to 260 % of the photo layer, so the photo
// is painted from its centre outward, a little faster sideways.
//
// Output: apps/web/public/watercolor/reveal-*.png (8-bit alpha, palette PNG).
// Run:    pnpm --filter @repo/design-system generate:watercolor
// The output is deterministic: the same seeds always produce the same files.

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
const outDir = resolve(here, "../../../apps/web/public/watercolor");

// ---------------------------------------------------------------- backdrop

// One box width is BOX px; the 16 : 10 box is BOX x BOX / 1.6, and the mask
// is two boxes wide with the brush front at x = BOX.
const BOX = 1000;
const BW = 2 * BOX;
const BH = Math.round(BOX / 1.6);

// Where the component puts the brush fronts, in box widths from the painted
// edge (public-site.css, .ks-wc__backdrop while the reveal runs): the pigment
// runs from -0.35 to 0.95, the faster wash from -0.35 to 1.15.
const PIGMENT_START = -0.35;
const PIGMENT_END = 0.95;
const WASH_START = -0.35;

// Horizontal brush strokes stacked down the side, overlapping a little. Each
// one ends at its own distance from the front and has a rounded end, so the
// front reads as a row of stroke ends rather than one straight edge.
function strokes(seed, reach) {
  const random = rng(seed);
  const list = [];
  let y = -30;
  while (y < BH + 30) {
    const height = 55 + random() * 75;
    list.push({
      y: y + height / 2,
      half: height / 2,
      end: (random() * 2 - 1) * reach,
      round: 25 + random() * 55,
    });
    y += height * (0.55 + random() * 0.25);
  }
  // Front offset (px, positive = further ahead) for one row.
  return (row) => {
    let best = -Infinity;
    for (const stroke of list) {
      const t = (row - stroke.y) / stroke.half;
      if (Math.abs(t) < 1)
        best = Math.max(best, stroke.end - stroke.round * t * t);
    }
    return best;
  };
}

// Alpha for the left side's pigment mask; the right side is its mirror image
// with its own seed. `d` is the distance behind the brush front, in px.
function pigment(seed) {
  const strokeEnds = strokes(seed, 75);
  const wobble = noise2d(seed + 1); // strokes are not perfectly straight
  const bristles = noise2d(seed + 2); // hair-thin streaks along the front
  const dryBrush = noise2d(seed + 3); // gaps where the brush ran dry
  const tipLength = noise2d(seed + 4);
  const tips = noise2d(seed + 5);
  const SOFT = 170; // wet, uneven paint behind the front
  const TIPS = 110; // bristle tips ahead of it

  const alpha = new Uint8Array(BW * BH);
  for (let y = 0; y < BH; y++) {
    const reach =
      TIPS * (0.25 + 0.75 * clamp01(0.5 + 0.8 * tipLength(3.1, y / 6, 2)));
    for (let x = 0; x < BW; x++) {
      const front =
        BOX +
        strokeEnds(y + 18 * wobble(x / 300, y / 90)) +
        14 * wobble(x / 260, y / 14 + 40) +
        8 * bristles(x / 120, y / 2.4, 2);
      const d = front - x;
      if (d >= SOFT) {
        alpha[y * BW + x] = 255;
        continue;
      }
      if (d <= -TIPS) continue;

      let a = smoothstep(-1.5, 1.5, d);
      if (d > 0) {
        // Pigment gathers at the very edge, is thinner just behind it and
        // builds up to full strength.
        a *=
          Math.min(1, 0.55 + 0.45 * smoothstep(0, SOFT, d)) +
          0.25 * (1 - smoothstep(0, 18, d));
        const threshold = -1 + 1.1 * (1 - d / SOFT);
        const dry = dryBrush(x / 70, y / 2.2, 2);
        a *= smoothstep(threshold - 0.08, threshold + 0.08, dry);
      } else {
        const along = -d / reach;
        if (along < 1) {
          const streak = smoothstep(0.15, 0.35, tips(x / 160, y / 1.9, 2));
          a = Math.max(a, 0.6 * (1 - along) * streak);
        }
      }
      alpha[y * BW + x] = Math.round(clamp01(a) * 255);
    }
  }
  return alpha;
}

// Alpha for the left side's wash mask: thin, streaky paint that bleeds out
// softly at its edge and is never opaque.
function wash(seed) {
  const strokeEnds = strokes(seed, 90);
  const wobble = noise2d(seed + 1);
  const density = noise2d(seed + 2);
  const SOFT = 60;

  const alpha = new Uint8Array(BW * BH);
  for (let y = 0; y < BH; y++) {
    for (let x = 0; x < BW; x++) {
      const front =
        BOX +
        strokeEnds(y + 22 * wobble(x / 340, y / 80)) +
        30 * wobble(x / 380, y / 10 + 40);
      const d = front - x;
      if (d <= -SOFT) continue;
      const paint =
        0.2 + 0.22 * smoothstep(-0.4, 0.4, density(x / 480, y / 7, 2));
      const a = paint * smoothstep(-SOFT, SOFT * 0.6, d);
      alpha[y * BW + x] = Math.round(clamp01(a) * 255);
    }
  }
  return alpha;
}

function mirror(alpha, width, height) {
  const out = new Uint8Array(alpha.length);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      out[y * width + x] = alpha[y * width + (width - 1 - x)];
    }
  }
  return out;
}

// How far (px from the painted edge) every row is fully opaque, and from
// where on every row is fully empty.
function extent(alpha) {
  let solid = BW;
  let empty = 0;
  for (let y = 0; y < BH; y++) {
    const row = alpha.subarray(y * BW, (y + 1) * BW);
    solid = Math.min(
      solid,
      row.findIndex((a) => a < 255),
    );
    empty = Math.max(empty, row.findLastIndex((a) => a > 0) + 1);
  }
  return { solid, empty };
}

function checkBackdrop(masks) {
  const pigments = [masks.left, mirror(masks.right, BW, BH)].map(extent);
  const washes = [masks.leftWash, mirror(masks.rightWash, BW, BH)].map(extent);
  // Before the reveal starts nothing of either mask reaches into the box.
  for (const { empty } of pigments) {
    if (empty / BOX - 1 + PIGMENT_START > 0)
      throw new Error("pigment visible at start");
  }
  for (const { empty } of washes) {
    if (empty / BOX - 1 + WASH_START > 0)
      throw new Error("wash visible at start");
  }
  // At the end the two opaque halves overlap: the backdrop is fully shown.
  const [left, right] = pigments.map(
    ({ solid }) => solid / BOX - 1 + PIGMENT_END,
  );
  if (left + right < 1)
    throw new Error("backdrop not fully painted at the end");
}

// ---------------------------------------------------------------- photo

// Same ratio as the photo layer (3 : 2), so the blob follows its shape.
const PW = 1500;
const PH = 1000;
// Final size of the blob, in photo layers (public-site.css, .ks-wc__photo
// while the reveal runs). At that size its opaque core covers the layer.
const PHOTO_END = 2.6;

// A patch of horizontal strokes around the centre: each row reaches sideways
// as far as its stroke goes, so the patch grows like paint laid on with a
// brush, not like a circle.
function photoReveal(seed) {
  const random = rng(seed);
  const wobble = noise2d(seed + 1);
  const bristles = noise2d(seed + 2);
  const dryBrush = noise2d(seed + 3);
  const washDensity = noise2d(seed + 4);
  // Positions are in layer units, measured from the centre.
  const RX = 0.4; // half width of the patch
  const RY = 0.37; // half height
  const SOFT = 0.045;
  const WASH = 0.04;

  // Stroke rows: the reach of each stroke end, with rounded ends.
  const rows = [];
  for (let v = -RY - 0.05; v < RY + 0.05;) {
    const half = 0.025 + random() * 0.03;
    rows.push({ v: v + half, half, reach: (random() * 2 - 1) * 0.11 });
    v += half * (1.1 + random() * 0.5);
  }
  const strokeReach = (v) => {
    let best = -Infinity;
    for (const row of rows) {
      const t = (v - row.v) / row.half;
      if (Math.abs(t) < 1) best = Math.max(best, row.reach - 0.03 * t * t);
    }
    return best === -Infinity ? 0 : best;
  };

  const alpha = new Uint8Array(PW * PH);
  for (let y = 0; y < PH; y++) {
    const v = (y + 0.5 - PH / 2) / PH;
    for (let x = 0; x < PW; x++) {
      const u = (x + 0.5 - PW / 2) / PW;
      const vy = v + 0.012 * wobble(u * 8, v * 3);
      // An ellipse whose width changes row by row with the stroke that
      // paints the row, so the sides end in stroke ends and the top and
      // bottom stay round.
      const rx = RX * (1 + strokeReach(vy)) + 0.01 * wobble(u * 3 + 9, v * 12);
      let d = (1 - Math.hypot(u / rx, vy / RY)) * RY;
      d += 0.006 * bristles(x / 110, y / 2.3, 2);
      // Keep every stroke clear of the canvas border.
      const border = Math.min(
        x / PW,
        y / PH,
        (PW - 1 - x) / PW,
        (PH - 1 - y) / PH,
      );
      d = Math.min(d, border - 0.004 - WASH);
      if (d >= SOFT) {
        alpha[y * PW + x] = 255;
        continue;
      }
      if (d <= -WASH) continue;

      // A pale, streaky wash lies under and just ahead of the paint.
      const thin =
        (0.2 + 0.2 * smoothstep(-0.3, 0.4, washDensity(x / 260, y / 5, 2))) *
        smoothstep(-WASH, -WASH * 0.3, d);
      let a = thin;
      if (d > 0) {
        const threshold = -1 + 1.1 * (1 - d / SOFT);
        const dry = dryBrush(x / 55, y / 1.9, 2);
        const paint =
          (0.55 + 0.45 * smoothstep(0, SOFT, d)) *
          smoothstep(threshold - 0.08, threshold + 0.08, dry);
        a = Math.max(thin, paint);
      }
      alpha[y * PW + x] = Math.round(clamp01(a) * 255);
    }
  }
  return alpha;
}

function checkPhoto(alpha) {
  // Every point of the layer maps into the blob's core at the final size.
  const reach = 0.5 / PHOTO_END;
  for (let y = Math.floor(PH * (0.5 - reach)); y < PH * (0.5 + reach); y++) {
    for (let x = Math.floor(PW * (0.5 - reach)); x < PW * (0.5 + reach); x++) {
      if (alpha[y * PW + x] !== 255)
        throw new Error("photo not fully shown at the end");
    }
  }
  // The blob never touches the canvas edge, so no straight cut shows.
  for (let x = 0; x < PW; x++) {
    if (alpha[x] || alpha[(PH - 1) * PW + x])
      throw new Error("blob touches the edge");
  }
  for (let y = 0; y < PH; y++) {
    if (alpha[y * PW] || alpha[y * PW + PW - 1])
      throw new Error("blob touches the edge");
  }
}

// ---------------------------------------------------------------- output

const backdrop = {
  left: pigment(20260925),
  leftWash: wash(20260935),
  right: mirror(pigment(20260945), BW, BH),
  rightWash: mirror(wash(20260955), BW, BH),
};
checkBackdrop(backdrop);
const photo = photoReveal(20260965);
checkPhoto(photo);

const files = {
  "reveal-backdrop-left.png": [backdrop.left, BW, BH],
  "reveal-backdrop-left-wash.png": [backdrop.leftWash, BW, BH],
  "reveal-backdrop-right.png": [backdrop.right, BW, BH],
  "reveal-backdrop-right-wash.png": [backdrop.rightWash, BW, BH],
  "reveal-photo.png": [photo, PW, PH],
};

mkdirSync(outDir, { recursive: true });
for (const [name, [alpha, width, height]] of Object.entries(files)) {
  const png = encodeAlphaPng(alpha, width, height);
  writeFileSync(resolve(outDir, name), png);
  stdout.write(`wrote ${name} (${(png.length / 1024).toFixed(0)} KB)\n`);
}
