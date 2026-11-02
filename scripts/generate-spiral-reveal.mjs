import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
const require = createRequire(
  new URL("../apps/web/package.json", import.meta.url),
);
const sharp = createRequire(require.resolve("next/package.json"))("sharp");
const size = 512;

// One continuous, uneven spiral brush pass. Every pixel stores its arrival
// time for the original WatercolorImage matte player; no runtime geometry.
for (const flow of ["out", "in"]) {
  for (const direction of ["clockwise", "counterclockwise"]) {
    const sign = direction === "clockwise" ? 1 : -1;
    const times = new Float32Array(size * size).fill(Infinity);
    const steps = 2300;
    for (let step = 0; step <= steps; step++) {
      const t = step / steps;
      const a = sign * t * Math.PI * 2 * 3.4 - 1.8;
      const r = 0.765 * t;
      const wobble = Math.sin(a * 3.7) * 0.005 + Math.sin(a * 8.3) * 0.002;
      const cx = 0.5 + Math.cos(a) * (r + wobble);
      const cy = 0.5 + Math.sin(a) * (r + wobble);
      const tx = 0.765 * Math.cos(a) - r * Math.sin(a) * sign * Math.PI * 6.8;
      const ty = 0.765 * Math.sin(a) + r * Math.cos(a) * sign * Math.PI * 6.8;
      const norm = Math.hypot(tx, ty),
        ux = tx / norm,
        uy = ty / norm;
      const halfWidth =
        0.136 * (0.92 + 0.065 * Math.sin(a * 2.7) + 0.035 * Math.sin(a * 9.1));
      const reach = Math.ceil((halfWidth + 0.015) * size);
      for (
        let y = Math.max(0, Math.floor(cy * size - reach));
        y <= Math.min(size - 1, cy * size + reach);
        y++
      ) {
        for (
          let x = Math.max(0, Math.floor(cx * size - reach));
          x <= Math.min(size - 1, cx * size + reach);
          x++
        ) {
          const dx = (x + 0.5) / size - cx,
            dy = (y + 0.5) / size - cy;
          const across = -uy * dx + ux * dy,
            along = ux * dx + uy * dy;
          const pressure =
            halfWidth * (0.96 + 0.035 * Math.sin(across * 900 + a * 0.7));
          if (Math.abs(across) > pressure || Math.abs(along) > 0.006) continue;
          const bristle =
            Math.sin(across * 1600 + Math.sin(a * 0.8)) * 0.006 +
            Math.sin(across * 730) * 0.004;
          const grain = Math.sin(x * 2.17 + y * 1.73) * 0.0015;
          const arrival =
            0.02 + (flow === "out" ? t : 1 - t) * 0.92 + bristle + grain;
          const index = y * size + x;
          times[index] = Math.min(times[index], arrival);
        }
      }
    }
    // Any sub-pixel pinholes inherit nearby paint, rather than appearing late.
    for (let pass = 0; pass < 3; pass++) {
      for (let y = 0; y < size; y++)
        for (let x = 0; x < size; x++) {
          const index = y * size + x;
          if (Number.isFinite(times[index])) continue;
          let closest = Infinity;
          for (const offset of [-size, size, -1, 1]) {
            const value = times[index + offset];
            if (Number.isFinite(value))
              closest = Math.min(closest, value + 0.001);
          }
          times[index] = closest;
        }
    }
    const pixels = Buffer.alloc(times.length);
    for (let index = 0; index < times.length; index++) {
      pixels[index] = Math.round(
        Math.max(0.015, Math.min(0.975, times[index])) * 255,
      );
    }
    if (times.some((time) => !Number.isFinite(time)))
      throw Error("Incomplete spiral coverage");
    const target = fileURLToPath(
      new URL(
        `../apps/web/public/watercolor/circle-concepts/reveal-spiral-${flow}-${direction}-v2.png`,
        import.meta.url,
      ),
    );
    await sharp(pixels, { raw: { width: size, height: size, channels: 1 } })
      .png()
      .toFile(target);
    console.log(`Spiral ${flow} ${direction}: complete coverage`);
  }
}
