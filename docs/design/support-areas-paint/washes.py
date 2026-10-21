import sys, math
import numpy as np
from PIL import Image, ImageFilter
exec(open(sys.argv[1]).read().split("SAGE =")[0].replace("S = 640", "S = 900"))
OUT = sys.argv[2]
def halo(seed, rgb, name):
    f, _ = blot_field(seed, satellites=10, wobble=0.22, sat_scale=0.45)
    rng = np.random.default_rng(seed + 5)
    inside = np.clip(f * 7 + 0.5, 0, 1)
    depth = np.clip(f, 0, None)
    rim = np.exp(-depth / 0.05)
    bloom = fbm(rng, S, 4, 5)
    gran = fbm(rng, S, 50, 2)
    # pale in the middle, where the photo sits; pigment pools outward
    centre = np.clip(1 - depth / 0.55, 0, 1)
    alpha = inside * (0.10 + 0.55 * centre * bloom + 0.45 * rim) * (0.8 + 0.4 * gran)
    mix = fbm(rng, S, 3, 4)[..., None]
    a = np.array(rgb[0], np.float32); b = np.array(rgb[1], np.float32)
    col = (a * (1 - mix) + b * mix) * (0.8 + 0.2 * (1 - rim))[..., None]
    img = np.dstack([np.clip(col, 0, 255), np.clip(alpha, 0, 1) * 255]).astype(np.uint8)
    Image.fromarray(img, "RGBA").save(f"{OUT}/{name}", quality=80, method=6)
halo(5, ((96, 146, 101), (160, 192, 146)), "areas-wash-sage.webp")
halo(9, ((226, 104, 108), (242, 168, 158)), "areas-wash-pink.webp")
