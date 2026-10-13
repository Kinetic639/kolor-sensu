#!/usr/bin/env node
// The brush stroke behind "Pierwszy krok" (FirstSteps) and its time map.
//
// The stroke is the supplied picture
// (docs/design/references/public/first-steps-ribbon.png: pink flowing into
// sage on a transparent ground), cropped to the stroke with a little air.
// The time map says when each pixel gets paint as the band scrolls by
// (black first): from both sides to the middle, the pink from the left
// edge and the sage from the right, meeting in the middle; along the
// brush's bristles (streaks running with the stroke) so the front is
// ragged, not a straight edge. FirstSteps moves a threshold on it with
// scroll (first-steps-matte.ts, after #11's scroll story).
//
// Output: apps/web/public/watercolor/first-steps-ribbon.webp
//         apps/web/public/watercolor/first-steps-ribbon-time.png
// Run:    pnpm --filter @repo/design-system generate:first-steps
// Deterministic: the same seed always gives the same map.

import { Buffer } from "node:buffer";
import { dirname, resolve } from "node:path";
import { stdout } from "node:process";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { clamp01, noise2d } from "./raster-mask.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const source = resolve(
  here,
  "../../../docs/design/references/public/first-steps-ribbon.png",
);
const folder = resolve(here, "../../../apps/web/public/watercolor");

// The stroke's own box in the source, found by its alpha, plus some air.
const AIR = 12;
const { data, info } = await sharp(source)
  .ensureAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true });
let top = info.height;
let bottom = 0;
for (let y = 0; y < info.height; y++) {
  for (let x = 0; x < info.width; x++) {
    if (data[(y * info.width + x) * 4 + 3] > 8) {
      top = Math.min(top, y);
      bottom = Math.max(bottom, y);
    }
  }
}
const crop = {
  left: 0,
  top: Math.max(0, top - AIR),
  width: info.width,
  height: Math.min(info.height, bottom + AIR) - Math.max(0, top - AIR),
};

const stroke = await sharp(source)
  .extract(crop)
  .webp({ quality: 88, alphaQuality: 90 })
  .toFile(resolve(folder, "first-steps-ribbon.webp"));
stdout.write(`first-steps-ribbon.webp: ${stroke.width} x ${stroke.height}\n`);

// The time map, at half size (the filter stretches it over the stroke).
const W = Math.round(crop.width / 2);
const H = Math.round(crop.height / 2);
const bristles = noise2d(20261013);
const blots = noise2d(1013);
const grey = Buffer.alloc(W * H);
for (let y = 0; y < H; y++) {
  for (let x = 0; x < W; x++) {
    const u = x / (W - 1);
    // 0 at either edge, 1 in the middle: both colours paint inward.
    const inward = u < 0.5 ? u / 0.5 : (1 - u) / 0.5;
    // Streaks along the stroke (stretched along x), and a few softer
    // blots, so the front frays like a dry brush.
    const streak = bristles(x * 0.006, y * 0.09, 3) * 0.5 + 0.5;
    const blot = blots(x * 0.02, y * 0.02, 2) * 0.5 + 0.5;
    const time = clamp01(0.06 + inward * 0.8 + streak * 0.1 + blot * 0.04);
    grey[y * W + x] = Math.round(time * 255);
  }
}
const map = await sharp(grey, { raw: { width: W, height: H, channels: 1 } })
  .png({ compressionLevel: 9 })
  .toFile(resolve(folder, "first-steps-ribbon-time.png"));
stdout.write(`first-steps-ribbon-time.png: ${map.width} x ${map.height}\n`);
