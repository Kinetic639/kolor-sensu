# Public website references

Approved visual references for the public website (`apps/web`). They are the
specification for `docs/design/kolor-sensu-public-design-system.md`.

| File                      | Reference | What it specifies                                                                                                                                           |
| ------------------------- | --------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `homepage-concept.png`    | A         | Page composition, palette, typography, spacing rhythm, buttons, service tiles, specialist cards, call-to-action band, how painted images sit on paper       |
| `painted-hero.png`        | B         | The painted image language in detail: brushed mask, sage and dusty-pink washes, paper grain, handwritten overlay with brush underline                       |
| `specialists-concept.png` | C         | "Nasi specjaliści": cut-out portraits on watercolor splashes, lower edge dissolving into the paint, small rounded info plates; desktop row and mobile stack |

The supplied splash backgrounds (`apps/web/public/watercolor/splash-{pink,sage}-{1,2}.png`),
the offer tiles' patches (`apps/web/public/watercolor/offer-{pink,sage}-{1,2}.png`)
and the cut-out portraits (`apps/storybook/public/kolor-sensu/*-*.png`) are
used exactly as delivered.

The `WatercolorImage` correction brief (2026-09-25) calls reference B
"reference 3", the approved target. Its two inputs live where the code uses
them: reference 1, the watercolor backdrop, is
`apps/web/public/watercolor/watercolor-background.webp`, and reference 2, an
ordinary uploaded photo, is
`apps/storybook/public/kolor-sensu/therapy-room-upload.png` (unchanged).

Both are concepts, not screenshots: take the language from them, not every
pixel. The photographs in them are placeholders and are replaced by real
photography of the centre.
