#!/usr/bin/env node
// Generates the apps' icons from the Kolor Sensu logo
// (apps/web/public/brand/kolor-sensu-logo.png, used as delivered). The
// first three go to every app (web, admin, specialist), so the public site
// and both portals share one favicon:
//
//   apps/*/src/app/favicon.ico       16, 32 and 48 px (browser tabs)
//   apps/*/src/app/icon.png          512 px, transparent (modern browsers,
//                                    search results)
//   apps/*/src/app/apple-icon.png    180 px on paper colour (iOS home
//                                    screen ignores transparency)
//   apps/web/public/brand/logo-mark.png
//                                    the mark for the site header, 2x of its
//                                    largest rendered size
//
// Next.js picks the three app/ files up by file convention and writes the
// <link> tags itself. The logo is not square (650 x 590): it is centred on a
// square canvas with a little air, never stretched.
//
// Run: pnpm --filter @repo/design-system generate:brand

import { Buffer } from "node:buffer";
import { writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { stdout } from "node:process";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const here = dirname(fileURLToPath(import.meta.url));
const web = resolve(here, "../../../apps/web");
const source = resolve(web, "public/brand/kolor-sensu-logo.png");

// Paper colour of the public site (--color-bg).
const PAPER = { r: 248, g: 247, b: 243, alpha: 1 };
const CLEAR = { r: 0, g: 0, b: 0, alpha: 0 };

// The logo centred on a square of `size`, filling `fill` of it.
async function square(size, { fill = 0.92, background = CLEAR } = {}) {
  const inner = Math.round(size * fill);
  const logo = await sharp(source)
    .trim()
    .resize(inner, inner, { fit: "contain", background: CLEAR })
    .png()
    .toBuffer();
  return sharp({
    create: { width: size, height: size, channels: 4, background },
  })
    .composite([{ input: logo, gravity: "centre" }])
    .png({ compressionLevel: 9, palette: true, quality: 95, effort: 10 })
    .toBuffer();
}

// A .ico holding PNG images (supported by every current browser).
function ico(images) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(images.length, 4);
  let offset = 6 + 16 * images.length;
  const entries = images.map(({ size, png }) => {
    const entry = Buffer.alloc(16);
    entry[0] = size >= 256 ? 0 : size;
    entry[1] = size >= 256 ? 0 : size;
    entry.writeUInt16LE(1, 4); // colour planes
    entry.writeUInt16LE(32, 6); // bits per pixel
    entry.writeUInt32LE(png.length, 8);
    entry.writeUInt32LE(offset, 12);
    offset += png.length;
    return entry;
  });
  return Buffer.concat([header, ...entries, ...images.map((i) => i.png)]);
}

const favicon = ico(
  await Promise.all(
    // Tiny sizes fill more of the square: every pixel counts at 16 px.
    [16, 32, 48].map(async (size) => ({
      size,
      png: await square(size, { fill: 1 }),
    })),
  ),
);
// The same three icons for every app: the public site and both portals.
const icon = await square(512);
const appleIcon = await square(180, { fill: 0.8, background: PAPER });
for (const app of ["web", "admin", "specialist"]) {
  const appDir = resolve(here, "../../../apps", app, "src/app");
  writeFileSync(resolve(appDir, "favicon.ico"), favicon);
  writeFileSync(resolve(appDir, "icon.png"), icon);
  writeFileSync(resolve(appDir, "apple-icon.png"), appleIcon);
}

// Header mark: at most 48 CSS px tall, so 96 px, width by its own ratio.
const mark = await sharp(source)
  .trim()
  .resize({ height: 96 })
  .png({ compressionLevel: 9, palette: true, quality: 95, effort: 10 })
  .toBuffer({ resolveWithObject: true });
writeFileSync(resolve(web, "public/brand/logo-mark.png"), mark.data);

stdout.write(
  `favicon.ico (16, 32, 48), icon.png 512, apple-icon.png 180, ` +
    `logo-mark.png ${mark.info.width} x ${mark.info.height}\n`,
);
