import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
const require = createRequire(
  new URL("../apps/web/package.json", import.meta.url),
);
const sharp = createRequire(require.resolve("next/package.json"))("sharp");
const directory = new URL(
  "../apps/web/public/watercolor/circle-concepts/",
  import.meta.url,
);
const size = 512;
const { data, info } = await sharp(
  fileURLToPath(new URL("painted-circle-01.png", directory)),
)
  .resize(size, size)
  .ensureAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true });
const pigment = Buffer.alloc(size * size);
const brush = Buffer.alloc(size * size);
for (let y = 0; y < size; y++)
  for (let x = 0; x < size; x++) {
    const index = y * size + x,
      offset = index * info.channels;
    const values = [data[offset], data[offset + 1], data[offset + 2]];
    const chroma = (Math.max(...values) - Math.min(...values)) / 255;
    const darkness = 1 - (values[0] + values[1] + values[2]) / 765;
    const coverage = Math.min(1, chroma * 2.3 + darkness * 1.9);
    // Follow the accepted artwork's actual pigment, not a new geometric shape.
    pigment[index] = Math.round((0.07 + (1 - coverage) * 0.82) * 255);
    const u = x / size,
      v = y / size;
    const across = -0.55 * u + 0.83 * v;
    const travel = (0.83 * u + 0.55 * v) / 1.38;
    const bristles =
      Math.sin(across * 430 + Math.sin(travel * 8)) * 0.017 +
      Math.sin(across * 155 + travel * 3) * 0.024;
    const pressure =
      Math.sin(across * 17) * 0.034 + Math.sin(across * 41) * 0.016;
    brush[index] = Math.round(
      Math.max(0.015, Math.min(0.975, travel + bristles + pressure)) * 255,
    );
  }
for (const [name, pixels] of [
  ["pigment", pigment],
  ["brushed-wipe", brush],
]) {
  await sharp(pixels, { raw: { width: size, height: size, channels: 1 } })
    .png()
    .toFile(fileURLToPath(new URL(`reveal-${name}-v1.png`, directory)));
  console.log(`${name}: ready`);
}
