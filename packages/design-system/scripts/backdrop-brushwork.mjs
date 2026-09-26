// The backdrop half of the paint matte (generate-paint-matte.mjs), derived
// from the approved watercolor backdrop itself rather than from a stroke
// table: the matte paints the backdrop in along the brushwork that is
// actually in the picture.
//
// 1. Brush direction. A structure tensor of the picture's darkness gives,
//    everywhere, the direction the paint streaks run in and how strongly
//    (coherence): high along dry-brush streaks and sweeps, low in the softer,
//    more even parts of the picture.
// 2. Brush strokes. Evenly spaced streamlines of that direction field,
//    started where the streaks are clearest, give the centrelines of the
//    brush strokes: curved where the brushwork curves, at whatever angle it
//    has. Strokes with very clear streaks are dry-brush strokes.
// 3. Regions. Every texture pixel of the layer goes to the nearest stroke
//    (within its band; wider where the picture is streaky), with a noisy
//    border streaky along the local brush direction. What no stroke's band
//    reaches (soft, low-coherence pockets, mostly toward the middle of the
//    picture) joins whichever traced stroke is nearest, so every pixel is
//    still part of a directional brush stroke, never a shape spreading from
//    a point. The regions tile the whole layer, so the finished matte
//    covers it.
// 4. Time maps. Along a stroke, paint arrives in the brush's direction; the
//    picture's own streaks (darker than their surroundings) arrive first and
//    the gaps between them later, so the paint front breaks up into the
//    streaks that are really there.
// 5. Timing. Pink regions start from the left edge, green ones from the
//    right, outer ones first; each has its own duration and ease.

import sharp from "sharp";
import { clamp01, noise2d } from "./raster-mask.mjs";

// ---------------------------------------------------------------- helpers

function hash(text, salt) {
  let h = 2166136261 ^ salt;
  for (let i = 0; i < text.length; i++) {
    h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  }
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

// Gaussian blur (three box blurs), edges clamped.
function blur(source, w, h, sigma) {
  const n = 3;
  const ideal = Math.sqrt((12 * sigma * sigma) / n + 1);
  let lower = Math.floor(ideal);
  if (lower % 2 === 0) lower--;
  const upper = lower + 2;
  const m = Math.round(
    (12 * sigma * sigma - n * lower * lower - 4 * n * lower - 3 * n) /
      (-4 * lower - 4),
  );
  let a = Float32Array.from(source);
  let b = new Float32Array(w * h);
  for (let pass = 0; pass < n; pass++) {
    const r = ((pass < m ? lower : upper) - 1) / 2;
    const span = 2 * r + 1;
    for (let y = 0; y < h; y++) {
      const row = y * w;
      let sum = 0;
      for (let i = -r; i <= r; i++)
        sum += a[row + Math.min(w - 1, Math.max(0, i))];
      for (let x = 0; x < w; x++) {
        b[row + x] = sum / span;
        sum +=
          a[row + Math.min(w - 1, x + r + 1)] - a[row + Math.max(0, x - r)];
      }
    }
    for (let x = 0; x < w; x++) {
      let sum = 0;
      for (let i = -r; i <= r; i++)
        sum += b[Math.min(h - 1, Math.max(0, i)) * w + x];
      for (let y = 0; y < h; y++) {
        a[y * w + x] = sum / span;
        sum +=
          b[Math.min(h - 1, y + r + 1) * w + x] - b[Math.max(0, y - r) * w + x];
      }
    }
  }
  return a;
}

// Dominant direction of a 2 x 2 structure tensor (the direction the streaks
// run in, across the gradient) and how clear it is (0..1).
function orientation(xx, xy, yy) {
  const trace = xx + yy;
  const d = Math.sqrt((xx - yy) ** 2 + 4 * xy * xy);
  return {
    angle: 0.5 * Math.atan2(2 * xy, xx - yy) + Math.PI / 2,
    coherence: trace > 1e-12 ? (d / trace) ** 2 : 0,
  };
}

// ---------------------------------------------------------------- analysis

// Everything the matte needs from the picture, sampled in design units.
async function analyse(file, layer) {
  const { data, info } = await sharp(file)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const { width: w, height: h } = info;
  const dark = new Float32Array(w * h);
  const alpha = new Float32Array(w * h);
  const pink = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++) {
    const a = data[i * 4 + 3] / 255;
    const r = data[i * 4] / 255;
    const g = data[i * 4 + 1] / 255;
    const b = data[i * 4 + 2] / 255;
    alpha[i] = a;
    // Darkness over white paper: the picture's own cut-out edge counts as
    // brushwork too (its streaky fingers are brush marks).
    dark[i] = 1 - ((0.299 * r + 0.587 * g + 0.114 * b) * a + (1 - a));
    pink[i] = (r - g) * a;
  }

  // Structure tensor: fine (single streaks) and coarse (the flow of a whole
  // brush zone), each normalised, mixed so washes follow the larger flow.
  const smooth = blur(dark, w, h, 1.2);
  const jxx = new Float32Array(w * h);
  const jxy = new Float32Array(w * h);
  const jyy = new Float32Array(w * h);
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = y * w + x;
      const gx =
        (smooth[i - w + 1] +
          2 * smooth[i + 1] +
          smooth[i + w + 1] -
          smooth[i - w - 1] -
          2 * smooth[i - 1] -
          smooth[i + w - 1]) /
        8;
      const gy =
        (smooth[i + w - 1] +
          2 * smooth[i + w] +
          smooth[i + w + 1] -
          smooth[i - w - 1] -
          2 * smooth[i - w] -
          smooth[i - w + 1]) /
        8;
      jxx[i] = gx * gx;
      jxy[i] = gx * gy;
      jyy[i] = gy * gy;
    }
  }
  const fine = [jxx, jxy, jyy].map((c) => blur(c, w, h, 8));
  const coarse = [jxx, jxy, jyy].map((c) => blur(c, w, h, 28));
  // Pigment structure: streaks (fine) and cloud cells (medium), as darkness
  // relative to the surroundings.
  const streaks = blur(dark, w, h, 1);
  const streakBase = blur(dark, w, h, 7);
  const cells = blur(dark, w, h, 3);
  const cellBase = blur(dark, w, h, 18);
  const body = blur(dark, w, h, 10);

  const sx = w / layer.width;
  const sy = h / layer.height;
  const index = (x, y) =>
    Math.min(h - 1, Math.max(0, Math.round(y * sy))) * w +
    Math.min(w - 1, Math.max(0, Math.round(x * sx)));

  return {
    // Brush direction and coherence at a point (design units).
    field(x, y) {
      const i = index(x, y);
      const f = orientation(fine[0][i], fine[1][i], fine[2][i]);
      const nf = fine[0][i] + fine[2][i] || 1;
      const nc = coarse[0][i] + coarse[2][i] || 1;
      const mixed = orientation(
        fine[0][i] / nf + (0.35 * coarse[0][i]) / nc,
        fine[1][i] / nf + (0.35 * coarse[1][i]) / nc,
        fine[2][i] / nf + (0.35 * coarse[2][i]) / nc,
      );
      return { angle: mixed.angle, coherence: f.coherence, alpha: alpha[i] };
    },
    alpha: (x, y) => alpha[index(x, y)],
    pink: (x, y) => pink[index(x, y)],
    darkness: (x, y) => body[index(x, y)],
    streak: (x, y) => {
      const i = index(x, y);
      return streaks[i] - streakBase[i];
    },
    cell: (x, y) => {
      const i = index(x, y);
      return cells[i] - cellBase[i];
    },
  };
}

// ------------------------------------------------------------ brush strokes

const SEPARATION = 48; // design units between neighbouring streamlines
// The widest a stroke's band reaches, in half-widths.
const MAX_CLAIM = 3.2;
const STEP = 2;

// Evenly spaced streamlines of the brush direction (Jobard & Lefer), started
// where the streaks are clearest and ended where the paint ends, where they
// would crowd another stroke, where the streaks fade out or where they turn
// back on themselves.
function traceStrokes(art, layer) {
  const cell = SEPARATION / 2;
  const occupied = new Map();
  const key = (cx, cy) => `${cx},${cy}`;
  const near = (x, y, limit, own) => {
    const cx = Math.floor(x / cell);
    const cy = Math.floor(y / cell);
    for (let i = -2; i <= 2; i++) {
      for (let j = -2; j <= 2; j++) {
        for (const p of occupied.get(key(cx + i, cy + j)) ?? []) {
          if (p.id !== own && (p.x - x) ** 2 + (p.y - y) ** 2 < limit * limit) {
            return true;
          }
        }
      }
    }
    return false;
  };
  const occupy = (points, id) => {
    for (const { x, y } of points) {
      const k = key(Math.floor(x / cell), Math.floor(y / cell));
      if (!occupied.has(k)) occupied.set(k, []);
      occupied.get(k).push({ x, y, id });
    }
  };

  const follow = (sx, sy, direction, id) => {
    const points = [];
    let x = sx;
    let y = sy;
    const start = art.field(x, y);
    let vx = Math.cos(start.angle) * direction;
    let vy = Math.sin(start.angle) * direction;
    let turned = 0;
    let faint = 0;
    for (let n = 0; n < 700; n++) {
      const f = art.field(x, y);
      let tx = Math.cos(f.angle);
      let ty = Math.sin(f.angle);
      if (tx * vx + ty * vy < 0) {
        tx = -tx;
        ty = -ty;
      }
      const turn = Math.acos(Math.min(1, tx * vx + ty * vy));
      if (n > 0 && turn > Math.PI / 5) break;
      turned += turn;
      if (turned > (Math.PI * 5) / 9) break;
      vx = tx;
      vy = ty;
      x += vx * STEP;
      y += vy * STEP;
      if (x < -10 || y < -10 || x > layer.width + 10 || y > layer.height + 10) {
        break;
      }
      const here = art.field(x, y);
      if (here.alpha < 0.05) break;
      faint = here.coherence < 0.08 ? faint + 1 : 0;
      if (faint > 12) break;
      if (near(x, y, SEPARATION * 0.5, id)) break;
      points.push({ x, y });
    }
    return points;
  };

  const seeds = [];
  for (let y = SEPARATION / 2; y < layer.height; y += SEPARATION / 4) {
    for (let x = SEPARATION / 2; x < layer.width; x += SEPARATION / 4) {
      const f = art.field(x, y);
      if (f.alpha > 0.5 && f.coherence > 0.2)
        seeds.push({ x, y, c: f.coherence });
    }
  }
  seeds.sort((a, b) => b.c - a.c || a.y - b.y || a.x - b.x);

  const strokes = [];
  for (const seed of seeds) {
    if (near(seed.x, seed.y, SEPARATION, -1)) continue;
    const id = strokes.length;
    const points = [
      ...follow(seed.x, seed.y, -1, id).reverse(),
      { x: seed.x, y: seed.y },
      ...follow(seed.x, seed.y, 1, id),
    ];
    let length = 0;
    for (let i = 1; i < points.length; i++) {
      length += Math.hypot(
        points[i].x - points[i - 1].x,
        points[i].y - points[i - 1].y,
      );
    }
    const coherence =
      points.reduce((sum, p) => sum + art.field(p.x, p.y).coherence, 0) /
      points.length;
    if (length < 120 || coherence < 0.18) continue;
    strokes.push({ points, length, coherence });
    occupy(points, id);
  }
  return strokes;
}

// Resampled centreline with arc length, for nearest-point lookups.
function resample(points, spacing) {
  const out = [{ ...points[0], s: 0 }];
  let s = 0;
  let carry = 0;
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1];
    const b = points[i];
    const segment = Math.hypot(b.x - a.x, b.y - a.y);
    let t = spacing - carry;
    while (t <= segment) {
      out.push({
        x: a.x + ((b.x - a.x) * t) / segment,
        y: a.y + ((b.y - a.y) * t) / segment,
        s: s + t,
      });
      t += spacing;
    }
    carry = segment - (t - spacing);
    s += segment;
  }
  const last = points.at(-1);
  if (s - out.at(-1).s > spacing / 4) out.push({ ...last, s });
  return out;
}

function locate(points, x, y) {
  let best = 0;
  let bestDistance = Infinity;
  for (let i = 0; i < points.length; i++) {
    const d = (x - points[i].x) ** 2 + (y - points[i].y) ** 2;
    if (d < bestDistance) {
      bestDistance = d;
      best = i;
    }
  }
  const i = Math.min(best, points.length - 2);
  const a = points[i];
  const b = points[i + 1];
  const segment = Math.hypot(b.x - a.x, b.y - a.y) || 1;
  const ux = (b.x - a.x) / segment;
  const uy = (b.y - a.y) / segment;
  return {
    along: a.s + (x - a.x) * ux + (y - a.y) * uy,
    across: -(x - a.x) * uy + (y - a.y) * ux,
    distance: Math.sqrt(bestDistance),
  };
}

// For every pixel, the index of the nearest pixel marked in `seeds` (jump
// flooding with a final one-pixel pass).
function nearestPainted(seeds, w, h) {
  let near = new Int32Array(w * h).fill(-1);
  for (let i = 0; i < w * h; i++) if (seeds[i]) near[i] = i;
  const distance = (i, j) => {
    const dx = (i % w) - (j % w);
    const dy = (i - (i % w)) / w - (j - (j % w)) / w;
    return dx * dx + dy * dy;
  };
  const steps = [1];
  for (let k = 1; k < Math.max(w, h); k *= 2) steps.unshift(k);
  for (const k of steps) {
    const next = Int32Array.from(near);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = y * w + x;
        for (let dy = -k; dy <= k; dy += k) {
          for (let dx = -k; dx <= k; dx += k) {
            const nx = x + dx;
            const ny = y + dy;
            if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
            const candidate = near[ny * w + nx];
            if (candidate < 0) continue;
            if (next[i] < 0 || distance(i, candidate) < distance(i, next[i])) {
              next[i] = candidate;
            }
          }
        }
      }
    }
    near = next;
  }
  return near;
}

// Keeps each label's largest 4-connected piece; every other piece takes the
// label most of its neighbours have.
function dropIslands(labels, w, h) {
  for (let round = 0; round < 8; round++) {
    const piece = new Int32Array(w * h).fill(-1);
    const pieces = [];
    for (let start = 0; start < w * h; start++) {
      if (piece[start] >= 0) continue;
      const id = pieces.length;
      const label = labels[start];
      const members = [start];
      const around = new Map();
      piece[start] = id;
      for (let head = 0; head < members.length; head++) {
        const i = members[head];
        const x = i % w;
        for (const j of [
          x > 0 ? i - 1 : -1,
          x < w - 1 ? i + 1 : -1,
          i - w,
          i + w,
        ]) {
          if (j < 0 || j >= w * h) continue;
          if (labels[j] !== label) {
            around.set(labels[j], (around.get(labels[j]) ?? 0) + 1);
          } else if (piece[j] < 0) {
            piece[j] = id;
            members.push(j);
          }
        }
      }
      pieces.push({ label, members, around });
    }
    const largest = new Map();
    for (const p of pieces) {
      if ((largest.get(p.label)?.members.length ?? 0) < p.members.length) {
        largest.set(p.label, p);
      }
    }
    let changed = false;
    for (const p of pieces) {
      if (largest.get(p.label) === p || !p.around.size) continue;
      const [label] = [...p.around].sort((a, b) => b[1] - a[1])[0];
      for (const i of p.members) labels[i] = label;
      changed = true;
    }
    if (!changed) return;
  }
}

// Mean red-over-green below which a region counts as neither pink nor green.
const NEUTRAL = 0.012;

// ------------------------------------------------------------------ regions

/**
 * Derives the backdrop's paint regions from the picture at `file`. Returns
 * one texture per region (x y w h in texture pixels of the layer at `scale`,
 * alpha, grey time map) with its id, kind, side, centreline or origin and
 * timing.
 */
export async function backdropRegions(file, layer, scale) {
  const art = await analyse(file, layer);
  const traced = traceStrokes(art, layer);

  // Texture grid of the layer, a few pixels past its edges.
  const margin = 4;
  const gx0 = -margin;
  const gy0 = -margin;
  const gw = Math.round(layer.width * scale) + 2 * margin;
  const gh = Math.round(layer.height * scale) + 2 * margin;
  const toX = (px) => (gx0 + px + 0.5) / scale;
  const toY = (py) => (gy0 + py + 0.5) / scale;

  const bands = traced.map((stroke) => ({
    ...stroke,
    kind: stroke.coherence > 0.33 ? "dry" : "stroke",
    half: stroke.coherence > 0.33 ? 26 : 32,
    samples: resample(stroke.points, 3),
  }));

  // Nearest stroke per texture pixel (distance over band half-width).
  const bestStroke = new Int16Array(gw * gh).fill(-1);
  const bestRatio = new Float32Array(gw * gh).fill(Infinity);
  bands.forEach((band, k) => {
    // Past the widest a band can claim (claimAt), so the search boxes
    // never cut its border.
    const reach = band.half * (MAX_CLAIM + 0.1);
    const coarse = resample(band.points, 6);
    for (let i = 1; i < coarse.length; i++) {
      const a = coarse[i - 1];
      const b = coarse[i];
      const minX = Math.max(
        0,
        Math.floor((Math.min(a.x, b.x) - reach) * scale) - gx0,
      );
      const maxX = Math.min(
        gw - 1,
        Math.ceil((Math.max(a.x, b.x) + reach) * scale) - gx0,
      );
      const minY = Math.max(
        0,
        Math.floor((Math.min(a.y, b.y) - reach) * scale) - gy0,
      );
      const maxY = Math.min(
        gh - 1,
        Math.ceil((Math.max(a.y, b.y) + reach) * scale) - gy0,
      );
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const len2 = dx * dx + dy * dy || 1;
      for (let py = minY; py <= maxY; py++) {
        for (let px = minX; px <= maxX; px++) {
          const x = toX(px);
          const y = toY(py);
          const t = Math.min(
            1,
            Math.max(0, ((x - a.x) * dx + (y - a.y) * dy) / len2),
          );
          const d = Math.hypot(x - a.x - t * dx, y - a.y - t * dy);
          const ratio = d / band.half;
          const i2 = py * gw + px;
          if (ratio < bestRatio[i2]) {
            bestRatio[i2] = ratio;
            bestStroke[i2] = k;
          }
        }
      }
    }
  });

  // A stroke claims its band; where the picture is streaky, the band widens
  // to meet the next stroke. Its border is streaky along the brush.
  const streakNoise = noise2d(401);
  const claimAt = (x, y, ratio) => {
    const f = art.field(x, y);
    const u = x * Math.cos(f.angle) + y * Math.sin(f.angle);
    const v = -x * Math.sin(f.angle) + y * Math.cos(f.angle);
    // Darker streaks of the picture reach further out than the paper-light
    // gaps between them, so the band's edge breaks up along the real streaks.
    const streak = clamp01(0.5 + 12 * art.streak(x, y));
    const limit =
      (f.coherence > 0.15 ? 2 : 1) *
      (1 + 0.4 * streakNoise(u / 50, v / 5, 4) + 0.35 * (streak - 0.5));
    return ratio <= Math.min(MAX_CLAIM, limit);
  };
  const owner = new Int16Array(gw * gh).fill(-1);
  for (let py = 0; py < gh; py++) {
    for (let px = 0; px < gw; px++) {
      const i = py * gw + px;
      if (bestStroke[i] >= 0 && claimAt(toX(px), toY(py), bestRatio[i])) {
        owner[i] = bestStroke[i];
      }
    }
  }

  // What no stroke's band reaches (soft, low-coherence pockets, mostly
  // toward the middle of the picture) joins whichever traced stroke is
  // nearest (jump flooding from the already-claimed pixels), so the whole
  // layer stays directional brush strokes: never a shape spreading from a
  // point.
  const strokeClaimed = new Uint8Array(gw * gh);
  for (let i = 0; i < gw * gh; i++) if (owner[i] >= 0) strokeClaimed[i] = 1;
  const nearestStroke = nearestPainted(strokeClaimed, gw, gh);
  for (let i = 0; i < gw * gh; i++) {
    if (owner[i] < 0) owner[i] = owner[nearestStroke[i]];
  }

  // Outside the painted picture (transparent), each pixel takes the region
  // and the arrival time of the nearest painted pixel (jump flooding), so
  // there the matte simply carries the paint's own edge outward.
  const painted = new Uint8Array(gw * gh);
  for (let py = 0; py < gh; py++) {
    for (let px = 0; px < gw; px++) {
      painted[py * gw + px] = art.alpha(toX(px), toY(py)) > 0.03 ? 1 : 0;
    }
  }
  const source = nearestPainted(painted, gw, gh);
  for (let i = 0; i < gw * gh; i++) owner[i] = owner[source[i]];
  // A region is one piece: stray bits of it elsewhere (a speck of paint far
  // from its stroke) join the region around them, so nothing lights up late
  // in the middle of paint that is already there.
  dropIslands(owner, gw, gh);

  // Regions: one per traced brush stroke, each with its side of the picture.
  const regions = bands.map((band, k) => ({ index: k, kind: band.kind, band }));
  for (const region of regions) {
    let sum = 0;
    let count = 0;
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (let py = 0; py < gh; py++) {
      for (let px = 0; px < gw; px++) {
        if (owner[py * gw + px] !== region.index) continue;
        sum += art.pink(toX(px), toY(py));
        count++;
        minX = Math.min(minX, px);
        maxX = Math.max(maxX, px);
        minY = Math.min(minY, py);
        maxY = Math.max(maxY, py);
      }
    }
    // Its colour decides the side; the few neutral (lilac, grey) regions in
    // the middle go with the nearer edge.
    const centre = toX((minX + maxX) / 2);
    region.side =
      Math.abs(sum / count) >= NEUTRAL
        ? sum > 0
          ? "pink"
          : "green"
        : centre < layer.width / 2
          ? "pink"
          : "green";
    region.count = count;
    region.bounds = { minX, minY, maxX, maxY };
  }

  // Strokes run from the end nearer their own side's edge toward the
  // centre (from the top or bottom rim, for upright ones).
  for (const region of regions) {
    const { points } = region.band;
    const a = points[0];
    const b = points.at(-1);
    let reverse;
    if (Math.abs(a.x - b.x) < 40) {
      reverse =
        Math.abs(b.y - layer.height / 2) > Math.abs(a.y - layer.height / 2);
    } else {
      reverse = region.side === "pink" ? b.x < a.x : b.x > a.x;
    }
    if (reverse) points.reverse();
    region.band.samples = resample(points, 3);
    region.start = points[0];
  }

  const textures = regions
    .filter((r) => r.count > 0)
    .map((region) =>
      renderRegion(region, {
        art,
        owner,
        painted,
        source,
        gw,
        gh,
        gx0,
        gy0,
        toX,
        toY,
      }),
    );
  schedule(textures, layer);
  return textures;
}

// Texture of one region: alpha (the region, grown by two pixels so
// neighbours overlap and the finished matte has no seams, then fading out
// over two more, so its edge is soft rather than stepped where the
// neighbour is not painted yet) and its time map.
function renderRegion(region, grid) {
  const { art, owner, painted, source, gw, gh, toX, toY } = grid;
  const grow = 2;
  const feather = 2;
  const reach = grow + feather;
  const minX = Math.max(0, region.bounds.minX - reach);
  const minY = Math.max(0, region.bounds.minY - reach);
  const maxX = Math.min(gw - 1, region.bounds.maxX + reach);
  const maxY = Math.min(gh - 1, region.bounds.maxY + reach);
  const w = maxX - minX + 1;
  const h = maxY - minY + 1;
  const alpha = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      // Distance to the region, in pixels (up to `reach`).
      let nearest = Infinity;
      for (let j = -reach; j <= reach; j++) {
        for (let i = -reach; i <= reach; i++) {
          const d = i * i + j * j;
          if (d >= nearest || d > reach * reach) continue;
          const gx = minX + x + i;
          const gy = minY + y + j;
          if (gx < 0 || gy < 0 || gx >= gw || gy >= gh) continue;
          if (owner[gy * gw + gx] === region.index) nearest = d;
        }
      }
      const d = Math.sqrt(nearest);
      alpha[y * w + x] =
        d <= grow ? 255 : Math.round(15 * clamp01((reach - d) / feather)) * 17;
    }
  }

  const bristles = noise2d(500 + region.index);
  const raw = new Float32Array(w * h);
  // Outside the paint, a pixel takes the time of the nearest painted one,
  // a little later the further away it is: the paint runs on to the frame.
  const at = (x, y) => {
    const i = source[(minY + y) * gw + minX + x];
    const px = i % gw;
    const sx = toX(px);
    const sy = toY((i - px) / gw);
    return [sx, sy, Math.hypot(toX(minX + x) - sx, toY(minY + y) - sy)];
  };
  const pigment = [];
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (!alpha[y * w + x] || !painted[(minY + y) * gw + minX + x]) continue;
      const dx = toX(minX + x);
      const dy = toY(minY + y);
      pigment.push(art.streak(dx, dy));
    }
  }
  // The region's own pigment contrast, 5th to 95th percentile, as 0..1.
  const sorted = Float32Array.from(pigment).sort();
  const low = sorted[Math.floor(sorted.length * 0.05)] ?? 0;
  const high = sorted[Math.floor(sorted.length * 0.95)] ?? 1;
  const strength = (v) => clamp01((v - low) / (high - low || 1));

  let first = Infinity;
  let last = -Infinity;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      if (!alpha[i]) continue;
      const [dx, dy, beyond] = at(x, y);
      const { half, kind, samples } = region.band;
      const { along, across } = locate(samples, dx, dy);
      const travel = along < 0 ? -along * 1.4 : along;
      const v = Math.min(1.6, Math.abs(across) / half);
      const t =
        travel +
        (kind === "dry" ? 70 : 50) * (1 - strength(art.streak(dx, dy))) +
        0.45 * half * v * v +
        (kind === "dry" ? 18 : 12) * bristles(across / 3.2, along / 55, 2);
      raw[i] = t + 0.8 * beyond;
      if (beyond) continue;
      first = Math.min(first, t);
      last = Math.max(last, t);
    }
  }
  // 64 steps, 0..252, over the painted part (finer ones would not show: the
  // front passes several of them per frame); beyond the paint, never later
  // than it.
  const grey = new Uint8Array(w * h);
  for (let i = 0; i < grey.length; i++) {
    if (alpha[i]) {
      grey[i] =
        Math.round(clamp01((raw[i] - first) / (last - first || 1)) * 63) * 4;
    }
  }

  const line = resample(region.band.points, 12).map((p) => [p.x, p.y]);
  return {
    region,
    kind: region.kind,
    side: region.side,
    line,
    length: region.band.length,
    x: minX + grid.gx0,
    y: minY + grid.gy0,
    w,
    h,
    alpha,
    grey,
  };
}

// ------------------------------------------------------------------ timing

const END = 0.95; // the backdrop is complete by then
const MIN_GAP = 0.02;
const MAX_GAP = 0.09;
const LAST_START = 0.6;

// Two brushes, one per side: pink regions start from the left edge and green
// ones from the right, both at once, outer ones first. On each side, starts
// are 20 to 90 ms apart, unevenly: wider where the next region is further
// in, with some jitter. Strokes take as long as their length needs; the
// whole backdrop is complete by 0.95 s.
function schedule(textures, layer) {
  for (const t of textures) {
    const [x] = t.line[0];
    const outer = clamp01(
      t.side === "pink" ? x / layer.width : 1 - x / layer.width,
    );
    const seed = `${t.region.index}`;
    t.order = outer + (hash(seed, 7) - 0.5) * 0.12;
    t.duration = Math.min(0.62, Math.max(0.4, 0.3 + t.length / 1000));
    t.ease =
      t.kind === "dry"
        ? "power2.out"
        : hash(seed, 9) < 0.5
          ? "power1.out"
          : "power1.inOut";
  }
  for (const side of ["pink", "green"]) {
    const own = textures
      .filter((t) => t.side === side)
      .sort((a, b) => a.order - b.order);
    if (!own.length) continue;
    const gaps = own
      .slice(1)
      .map((t, i) =>
        Math.min(
          MAX_GAP,
          Math.max(
            MIN_GAP,
            MIN_GAP +
              0.35 * (t.order - own[i].order) +
              0.03 * hash(`${t.region.index}`, 11),
          ),
        ),
      );
    // Squeeze the spread above the minimum if the side would start too late.
    const first = side === "pink" ? 0 : 0.03;
    const total = gaps.reduce((a, b) => a + b, 0);
    const room = LAST_START - first - MIN_GAP * gaps.length;
    const squeeze =
      total - MIN_GAP * gaps.length > room
        ? room / (total - MIN_GAP * gaps.length)
        : 1;
    let at = first;
    own[0].at = at;
    gaps.forEach((gap, i) => {
      at += MIN_GAP + (gap - MIN_GAP) * squeeze;
      own[i + 1].at = at;
    });
  }
  for (const t of textures) {
    if (t.at + t.duration > END) t.duration = END - t.at;
  }
  const shortest = Math.min(...textures.map((t) => t.duration));
  if (shortest < 0.3) {
    throw new Error(
      `Backdrop paint regions do not fit into ${END} s (shortest ${shortest.toFixed(2)} s).`,
    );
  }
  textures.sort((a, b) => a.at - b.at || (a.side === "pink" ? -1 : 1));
  // Ids in painting order per side and kind, e.g. "pink-dry-1".
  const counts = {};
  for (const t of textures) {
    const k = `${t.side}-${t.kind}`;
    counts[k] = (counts[k] ?? 0) + 1;
    t.id = `${k}-${counts[k]}`;
    t.at = Math.round(t.at * 1000) / 1000;
    t.duration = Math.round(t.duration * 1000) / 1000;
  }
}
