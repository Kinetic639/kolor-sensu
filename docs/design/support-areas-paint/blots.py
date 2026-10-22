"""Watercolour blots for the support areas: masks and painted drops."""
import math, sys
import numpy as np
from PIL import Image, ImageFilter

OUT = sys.argv[1]
S = 640


def value_noise(rng, size, cells):
    g = rng.random((cells, cells)).astype(np.float32)
    im = Image.fromarray((g * 255).astype(np.uint8)).resize((size, size), Image.BICUBIC)
    return np.asarray(im, dtype=np.float32) / 255.0


def fbm(rng, size, base=4, octaves=5):
    out = np.zeros((size, size), np.float32)
    amp, tot = 1.0, 0.0
    for o in range(octaves):
        out += amp * value_noise(rng, size, base * 2**o)
        tot += amp
        amp *= 0.55
    return out / tot


def blot_field(seed, satellites=7, wobble=0.16, sat_scale=1.0):
    """Signed 'inside-ness' of an irregular blot: > 0 inside."""
    rng = np.random.default_rng(seed)
    y, x = np.mgrid[0:S, 0:S].astype(np.float32)
    cx = cy = S / 2
    dx, dy = x - cx, y - cy
    dist = np.hypot(dx, dy)
    th = np.arctan2(dy, dx)
    R = S * 0.36
    r = np.ones_like(th)
    for k in range(2, 7):
        r += (wobble / k**0.7) * rng.uniform(0.4, 1.0) * np.sin(k * th + rng.uniform(0, 6.3))
    field = (R * r - dist) / R
    # ragged, bleeding edge
    field += (fbm(rng, S, 6, 5) - 0.5) * 0.22
    field += (fbm(rng, S, 24, 3) - 0.5) * 0.10
    # a few satellite drops near the edge, and one small run
    for _ in range(satellites):
        a = rng.uniform(0, 2 * math.pi)
        d = R * rng.uniform(1.08, 1.32)
        rr = R * rng.uniform(0.018, 0.06) * sat_scale
        sx, sy = cx + d * math.cos(a), cy + d * math.sin(a)
        sd = np.hypot(x - sx, y - sy)
        field = np.maximum(field, (rr - sd) / R * 3)
    return field, dist / R


def save_mask(field, name):
    a = np.clip(field * 9 + 0.5, 0, 1)
    im = Image.fromarray((a * 255).astype(np.uint8), "L").filter(ImageFilter.GaussianBlur(0.8))
    Image.merge("LA", (Image.new("L", im.size, 0), im)).save(f"{OUT}/{name}", optimize=True)


def save_paint(field, seed, rgb, name, rim_only=False):
    rng = np.random.default_rng(seed + 100)
    inside = np.clip(field * 9 + 0.5, 0, 1)
    depth = np.clip(field, 0, None)
    # pigment pools at the edge as the water dries (edge darkening)
    rim = np.exp(-depth / 0.06)
    gran = fbm(rng, S, 40, 3)
    bloom = fbm(rng, S, 5, 4)
    if rim_only:
        alpha = inside * (0.85 * rim + 0.05) * (0.75 + 0.5 * gran)
    else:
        alpha = inside * (0.38 + 0.28 * bloom + 0.42 * rim) * (0.8 + 0.4 * gran)
    alpha = np.clip(alpha, 0, 1)
    dark = 0.75 + 0.25 * (1 - rim)  # darker hue in the rim
    mix = fbm(rng, S, 3, 4)[..., None]
    a = np.array(rgb[0], np.float32); b = np.array(rgb[1], np.float32)
    col = a * (1 - mix) + b * mix
    col = col * dark[..., None]
    img = np.dstack([np.clip(col, 0, 255), alpha * 255]).astype(np.uint8)
    Image.fromarray(img, "RGBA").save(f"{OUT}/{name}", optimize=True)


SAGE = ((96, 146, 101), (150, 186, 138))
PINK = ((226, 104, 108), (240, 158, 150))

for i, seed in enumerate([3, 11, 27, 42], start=1):
    f, _ = blot_field(seed)
    save_mask(f, f"areas-blot-{i}.png")
    save_paint(f, seed, SAGE, f"areas-drop-sage-{i}.png")
    save_paint(f, seed, PINK, f"areas-drop-pink-{i}.png")
    save_paint(f, seed, SAGE, f"areas-rim-sage-{i}.png", rim_only=True)
    save_paint(f, seed, PINK, f"areas-rim-pink-{i}.png", rim_only=True)

# The large circle's brushed edge: the hero's photo mask, made round.
pm = Image.open(sys.argv[2]).convert("RGBA").getchannel("A")
sq = pm.resize((880, 940), Image.LANCZOS)
canvas = Image.new("L", (1000, 1000), 0)
canvas.paste(sq, (60, 30))
canvas = canvas.rotate(-8, resample=Image.BICUBIC)
# rounded off: the corners of the brushed square give way to a ragged circle
rng = np.random.default_rng(7)
y, x = np.mgrid[0:1000, 0:1000].astype(np.float32)
th = np.arctan2(y - 500, x - 500)
r = np.hypot(x - 500, y - 500) / 1000
edge = 0.47 + 0.018 * np.sin(3 * th + 1) + 0.012 * np.sin(5 * th + 2)
edge += (np.asarray(Image.fromarray((rng.random((40, 40)) * 255).astype(np.uint8)).resize((1000, 1000), Image.BICUBIC), np.float32) / 255 - 0.5) * 0.04
round_ = np.clip((edge - r) / 0.012, 0, 1)
canvas = Image.fromarray((np.asarray(canvas, np.float32) * round_).astype(np.uint8), "L")
Image.merge("LA", (Image.new("L", canvas.size, 0), canvas)).save(f"{OUT}/areas-center-mask.png", optimize=True)
