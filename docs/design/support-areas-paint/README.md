# Support areas: paint

The drops, rims, blots and washes of the homepage's "Obszary wsparcia"
(`apps/web/public/watercolor/areas-*`), generated rather than painted so
they can be remade in other shapes or colours:

```sh
python3 blots.py <out-dir> apps/web/public/watercolor/photo-mask.png
python3 washes.py blots.py <out-dir>
```

`blots.py` writes, at 640 px: four blot masks (`areas-blot-1…4.png`),
each blot as a drop of sage and of pink paint (`areas-drop-*`) and as a
rim of pigment alone (`areas-rim-*`), and the large circle's brushed edge
(`areas-center-mask.png`, the hero's photo mask made round). The site
uses the drops and rims at 360 px as WebP (quality 82), the blots at
360 px and the centre mask at 720 px. `washes.py` writes the two washes
behind the large circle (`areas-wash-sage.webp`, `areas-wash-pink.webp`).
Needs numpy and Pillow.
