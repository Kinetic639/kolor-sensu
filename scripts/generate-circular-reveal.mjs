import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
const require = createRequire(
  new URL("../apps/web/package.json", import.meta.url),
);
const sharp = createRequire(require.resolve("next/package.json"))("sharp");
const size = 512;
const tau = Math.PI * 2;

// Bake hundreds of separate hand-guided brush passes into one time map.
// Playback still uses exactly the existing WatercolorImage threshold engine.
for (const [variantIndex, variant] of ["rings", "paired", "sweep"].entries()) {
  for (const direction of ["clockwise", "counterclockwise"]) {
    let seed = 19087 + variantIndex * 7919;
    const random = () => {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      return seed / 4294967296;
    };
    const sign = direction === "clockwise" ? 1 : -1;
    const times = new Float32Array(size * size).fill(Infinity);
    const stroke = (x, y, late = false) => {
      const radial = Math.atan2(y - size / 2, x - size / 2);
      const heading = radial + (sign * Math.PI) / 2 + (random() - 0.5) * 1.35;
      const length = size * (0.085 + random() * (0.12 + variantIndex * 0.045));
      const width = size * (0.022 + random() * 0.036);
      const bend = (random() - 0.25) * length * 0.9 * sign;
      const at = late ? 0.64 + random() * 0.13 : random() * 0.61;
      const duration = 0.08 + random() * 0.19;
      const phase = random() * tau;
      const ux = Math.cos(heading),
        uy = Math.sin(heading);
      const steps = Math.ceil(length / 1.7);
      for (let step = 0; step <= steps; step++) {
        const t = step / steps;
        const along = length * (t - 0.5);
        const sideways =
          bend * (t * t - 0.25) + Math.sin(t * 7 + phase) * width * 0.12;
        const cx = x + ux * along - uy * sideways;
        const cy = y + uy * along + ux * sideways;
        const pressure =
          (0.32 + 0.68 * Math.sin(Math.PI * (0.08 + 0.84 * t))) *
          (0.89 + 0.11 * Math.sin(t * 17 + phase));
        const halfWidth = width * pressure;
        const reach = Math.ceil(halfWidth + 5);
        for (
          let py = Math.max(0, Math.floor(cy - reach));
          py <= Math.min(size - 1, cy + reach);
          py++
        ) {
          for (
            let px = Math.max(0, Math.floor(cx - reach));
            px <= Math.min(size - 1, cx + reach);
            px++
          ) {
            const dx = px - cx,
              dy = py - cy;
            const across = -uy * dx + ux * dy;
            const forward = ux * dx + uy * dy;
            // Short, broken bristle tips; broad sides wander with pressure.
            const edge =
              halfWidth * (0.91 + 0.055 * Math.sin(across * 1.7 + phase));
            if (Math.abs(across) > edge || Math.abs(forward) > 3.5) continue;
            const dry =
              (Math.sin(across * 2.3 + phase) + Math.sin(across * 0.79)) *
              0.009;
            const edgeDelay =
              Math.max(0, Math.abs(across) / halfWidth - 0.65) * 0.055;
            const arrival = at + t ** 0.8 * duration + dry + edgeDelay;
            const index = py * size + px;
            times[index] = Math.min(times[index], arrival);
          }
        }
      }
    };
    // Small offset centres, different curvature and timing: no compass rings.
    for (let index = 0; index < 300; index++) {
      const a = random() * tau,
        r = Math.sqrt(random()) * size * 0.76;
      stroke(size / 2 + Math.cos(a) * r, size / 2 + Math.sin(a) * r);
    }
    // Finish uncovered paper with more actual strokes, never a late flat wipe.
    for (let y = 0; y < size; y += 5)
      for (let x = 0; x < size; x += 5) {
        if (!Number.isFinite(times[y * size + x])) stroke(x, y, true);
      }
    const pixels = Buffer.alloc(size * size);
    let uncovered = 0;
    for (let index = 0; index < times.length; index++) {
      if (!Number.isFinite(times[index])) uncovered++;
      pixels[index] = Math.round(
        Math.max(0.015, Math.min(0.975, times[index])) * 255,
      );
    }
    const target = fileURLToPath(
      new URL(
        `../apps/web/public/watercolor/circle-concepts/reveal-${variant}-${direction}-v3.png`,
        import.meta.url,
      ),
    );
    await sharp(pixels, { raw: { width: size, height: size, channels: 1 } })
      .png()
      .toFile(target);
    console.log({ variant, direction, strokes: 300, uncovered });
  }
}
