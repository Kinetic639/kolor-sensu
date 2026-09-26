// One painted brush stroke as a raster: its alpha (the finished shape: an
// opaque body, dry-brush edges, bristle hairs and a ragged tail where the
// brush lifts) and its grey time map (when each pixel gets paint, along the
// brush path, the belly of the brush ahead of its edges). Shared by
// generate-paint-matte.mjs (WatercolorImage's photo strokes) and
// generate-offer-matte.mjs (the offer tiles' strokes).
//
// A stroke runs from `from` (brush down) to `to` (brush lifted) along a
// quadratic curve bent sideways by `bend`; `half` is half its width, in the
// layer's design units. `touchdown` strokes start inside the picture with a
// rounded blot; the others enter from outside the edge. `dry` sets how long
// the ragged tail is, `soft` makes a wash.

import { clamp01, noise2d, smoothstep } from "./raster-mask.mjs";

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
export function renderStroke(stroke, layer, scale) {
  const { points, length, control } = curve(stroke);
  const alphaAt = brush(stroke, length);
  const timeAt = arrival(stroke, length);
  const reach = stroke.half * 1.35;
  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  // Cropped to the layer plus a few pixels, so the image is not sampled at
  // its own border along the layer's edge (that would thin the paint in the
  // last pixel column).
  const margin = 4 / scale;
  const clampX = (v) => Math.min(layer.width + margin, Math.max(-margin, v));
  const clampY = (v) => Math.min(layer.height + margin, Math.max(-margin, v));
  const left = Math.floor(clampX(Math.min(...xs) - reach) * scale);
  const right = Math.ceil(clampX(Math.max(...xs) + reach) * scale);
  const top = Math.floor(clampY(Math.min(...ys) - reach) * scale);
  const bottom = Math.ceil(clampY(Math.max(...ys) + reach) * scale);
  const w = right - left;
  const h = bottom - top;
  const alpha = new Uint8Array(w * h);
  const time = new Float32Array(w * h);
  let first = Infinity;
  let last = -Infinity;
  for (let py = 0; py < h; py++) {
    for (let px = 0; px < w; px++) {
      const x = (left + px + 0.5) / scale;
      const y = (top + py + 0.5) / scale;
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
