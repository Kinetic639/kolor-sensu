import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
const require = createRequire(
  new URL("../apps/web/package.json", import.meta.url),
);
const sharp = createRequire(require.resolve("next/package.json"))("sharp");
const size = 512,
  tau = Math.PI * 2,
  count = 116,
  spacing = 0.74 / count;
const wrap = (value) => ((value % tau) + tau) % tau;
let seed = 192731;
const random = () => {
  seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
  return seed / 4294967296;
};
// Bundles of separate fibres, not a shared wedge or one growing spiral.
const bundles = Array.from({ length: 30 }, () => ({
  start: random() * tau,
  speed: 1.12 + random() * 0.3,
  at: random() * 0.075,
}));
const fibres = Array.from({ length: count + 3 }, (_, index) => {
  const bundle = bundles[Math.floor(index / 4) % bundles.length];
  return {
    radius: index * spacing,
    start: bundle.start + (random() - 0.5) * 1.4,
    speed: bundle.speed + random() * 0.12,
    at: bundle.at + random() * 0.045,
    width: spacing * (0.68 + random() * 0.17),
    phase: random() * tau,
  };
});
for (const direction of ["clockwise", "counterclockwise"]) {
  const sign = direction === "clockwise" ? 1 : -1;
  const pixels = Buffer.alloc(size * size);
  let missing = 0;
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      const dx = (x + 0.5) / size - 0.5,
        dy = (y + 0.5) / size - 0.5;
      const r = Math.hypot(dx, dy),
        a = Math.atan2(dy, dx);
      const nearest = Math.round(r / spacing);
      let arrival = Infinity;
      for (
        let index = Math.max(0, nearest - 2);
        index <= Math.min(fibres.length - 1, nearest + 2);
        index++
      ) {
        const fibre = fibres[index];
        // Subtle bristle irregularity retains a readable orbital motion.
        const wobble =
          Math.sin(a * 7 + fibre.phase) * spacing * 0.08 +
          Math.sin(a * 17 + fibre.phase) * spacing * 0.035;
        const across = (r - fibre.radius - wobble) / fibre.width;
        if (Math.abs(across) > 1.35) continue;
        const progress = wrap(sign * (a - fibre.start)) / tau;
        const tip =
          Math.sin(across * 11 + fibre.phase) * 0.008 +
          Math.sin(across * 23) * 0.003;
        const edge = Math.abs(across) ** 1.7 * 0.055;
        const time = 0.02 + fibre.at + progress / fibre.speed + edge + tip;
        arrival = Math.min(arrival, time);
      }
      if (!Number.isFinite(arrival)) missing++;
      pixels[y * size + x] = Math.round(
        Math.max(0.015, Math.min(0.975, arrival)) * 255,
      );
    }
  if (missing) throw Error(`Uncovered matte pixels: ${missing}`);
  const target = fileURLToPath(
    new URL(
      `../apps/web/public/watercolor/circle-concepts/reveal-star-trails-${direction}-v2.png`,
      import.meta.url,
    ),
  );
  await sharp(pixels, { raw: { width: size, height: size, channels: 1 } })
    .png()
    .toFile(target);
  console.log({ direction, fibres: fibres.length, missing });
}
