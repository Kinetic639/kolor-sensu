// Shared helpers for the raster alpha masks of WatercolorImage: a seeded
// random generator, 2D value noise, easing helpers and a minimal PNG writer.
// Used by generate-photo-mask.mjs and generate-reveal-masks.mjs.

import { Buffer } from "node:buffer";
import { crc32, deflateSync } from "node:zlib";

export function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// 2D value noise with fractal octaves, roughly in [-1, 1].
export function noise2d(seed) {
  const r = rng(seed);
  const size = 256;
  const perm = Array.from({ length: size }, (_, i) => i);
  for (let i = size - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [perm[i], perm[j]] = [perm[j], perm[i]];
  }
  const values = Float32Array.from({ length: size }, () => r() * 2 - 1);
  const hash = (ix, iy) => values[perm[(perm[ix & 255] + iy) & 255]];
  const at = (x, y) => {
    const ix = Math.floor(x);
    const iy = Math.floor(y);
    const fx = x - ix;
    const fy = y - iy;
    const sx = fx * fx * (3 - 2 * fx);
    const sy = fy * fy * (3 - 2 * fy);
    const a = hash(ix, iy);
    const b = hash(ix + 1, iy);
    const c = hash(ix, iy + 1);
    const d = hash(ix + 1, iy + 1);
    return a + (b - a) * sx + (c - a + (a - b + d - c) * sx) * sy;
  };
  return (x, y, octaves = 3) => {
    let sum = 0;
    let amp = 1;
    let freq = 1;
    let norm = 0;
    for (let o = 0; o < octaves; o++) {
      sum += at(x * freq + o * 17.3, y * freq - o * 11.9) * amp;
      norm += amp;
      amp *= 0.5;
      freq *= 2.03;
    }
    return sum / norm;
  };
}

export const clamp01 = (v) => Math.min(1, Math.max(0, v));
export const smoothstep = (a, b, v) => {
  const t = clamp01((v - a) / (b - a));
  return t * t * (3 - 2 * t);
};

// Minimal PNG writer: 8-bit palette image whose index is the alpha value.
export function encodeAlphaPng(alpha, width, height) {
  const chunk = (type, data) => {
    const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
    const length = Buffer.alloc(4);
    length.writeUInt32BE(data.length);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(body));
    return Buffer.concat([length, body, crc]);
  };
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8; // bit depth
  header[9] = 3; // palette
  const palette = Buffer.alloc(256 * 3); // black; only alpha matters
  const transparency = Buffer.from(Array.from({ length: 256 }, (_, i) => i));
  // Per-row filter: pick None, Sub or Up, whichever deflates best.
  const raw = Buffer.alloc((width + 1) * height);
  for (let y = 0; y < height; y++) {
    const row = alpha.subarray(y * width, (y + 1) * width);
    const above = y > 0 ? alpha.subarray((y - 1) * width, y * width) : null;
    const candidates = [
      [0, (x) => row[x]],
      [1, (x) => (row[x] - (x > 0 ? row[x - 1] : 0)) & 255],
      [2, (x) => (row[x] - (above ? above[x] : 0)) & 255],
    ];
    let best = null;
    let bestCost = Infinity;
    for (const [type, filter] of candidates) {
      let cost = 0;
      for (let x = 0; x < width; x++) {
        const value = filter(x);
        cost += value < 128 ? value : 256 - value;
      }
      if (cost < bestCost) {
        bestCost = cost;
        best = [type, filter];
      }
    }
    const offset = y * (width + 1);
    raw[offset] = best[0];
    for (let x = 0; x < width; x++) raw[offset + 1 + x] = best[1](x);
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", header),
    chunk("PLTE", palette),
    chunk("tRNS", transparency),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}
