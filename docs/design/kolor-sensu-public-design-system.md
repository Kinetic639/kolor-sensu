# Kolor Sensu public design system

The visual foundation of the public website (`apps/web`), reconstructed from two
approved references in `docs/design/references/public/`:

- **A** `homepage-concept.png`: the homepage concept (composition, palette,
  type, spacing, controls, cards).
- **B** `painted-hero.png`: the painted hero photograph (brushed mask, washes,
  paper grain, handwritten overlay).

It is a foundation, not a page: tokens, one painted image component and a
handful of primitives. Pages are built from it later.

| Piece                         | Where                                                                       |
| ----------------------------- | --------------------------------------------------------------------------- |
| Tokens (Tailwind v4 `@theme`) | `packages/design-system/src/public-theme.css`                               |
| Painted layers CSS            | `packages/ui/src/public-site/public-site.css`                               |
| Components                    | `packages/ui/src/public-site/` (`@repo/ui/public-site`)                     |
| Watercolor backdrop (asset)   | `apps/web/public/watercolor/watercolor-background.webp`                     |
| Photo mask                    | `apps/web/public/watercolor/photo-mask.png`                                 |
| Surface masks, paper grain    | `apps/web/public/watercolor/{tile,band,paper}.svg`                          |
| Mask generators               | `packages/design-system/scripts/generate-{photo-mask,watercolor-masks}.mjs` |
| Stories                       | Storybook › Public site (WatercolorImage, Primitives, Examples)             |
| Sample photos (Storybook)     | `apps/storybook/public/kolor-sensu/`                                        |

## 1. Principles

1. **Paper first.** Every page is warm paper (`bg`) with ink text. Colour is
   paint placed on that paper, never a coloured app background.
2. **Paint belongs to images and backgrounds.** Photos, washes, tiles and bands
   are painted. Text, buttons, inputs and navigation stay crisp and clean.
3. **Calm, editorial rhythm.** Serif headings, generous space, one idea per
   section, alternating image and text columns.
4. **Two pigments.** Sage and dusty pink carry the brand; beige and cream are
   the neutrals. Nothing else appears as a surface colour.
5. **Restraint.** Per screen: at most one large painted photo with a
   handwritten line, one or two washes, one botanical accent.
6. **Static first.** The painted picture is a static composition. The
   optional entrance animation plays once, ends on exactly that composition,
   and never loops, bounces or follows the cursor.

## 2. Palette

Sampled from the references, then adjusted only where WCAG contrast required.
Utilities follow the token name: `--color-primary` → `bg-primary`,
`text-primary`, `border-primary`.

| Token                  | Hex       | Source                  | Use                                                                                                                |
| ---------------------- | --------- | ----------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `color-bg`             | `#f8f7f3` | A page, B paper         | Page background                                                                                                    |
| `color-surface`        | `#fdfdfb` | A specialist cards      | Cards, inputs, round icon buttons                                                                                  |
| `color-cream`          | `#f3efe7` | A warm areas            | Alternate surface, neutral wash                                                                                    |
| `color-beige`          | `#e6ddd0` | B linen, wood           | Neutral wash pigment                                                                                               |
| `color-ink`            | `#16302f` | A headings              | Headings and body text (13.1:1 on `bg`)                                                                            |
| `color-text-muted`     | `#566461` | A body copy             | Secondary copy (≥ 5:1 on `bg` and soft tints)                                                                      |
| `color-primary`        | `#527b57` | #87af8c, darkened to AA | Button fill (white label 4.76:1); green text and icons on `bg` (4.53:1), e.g. "Sensu" in the logo, the hero accent |
| `color-primary-strong` | `#45684a` | darker step             | Hover / pressed, focus ring, icons on `cream` / `primary-soft` (5.9:1 on `bg`)                                     |
| `color-primary-soft`   | `#e3ede4` | #87af8c, tint           | Fresh sage tint behind content                                                                                     |
| `color-sage`           | `#c5d0bf` | B right wash            | Wash pigment only                                                                                                  |
| `color-pink`           | `#b86e6b` | A "Więcej sensu."       | Display text ≥ 24 px, icons (3.6:1)                                                                                |
| `color-pink-strong`    | `#9c5754` | darker step             | Pink text below 24 px (5:1), hero eyebrow                                                                          |
| `color-pink-soft`      | `#f6e6e1` | A pink tiles            | Blush tint behind content                                                                                          |
| `color-blush`          | `#ebcdc6` | B left wash             | Wash pigment only                                                                                                  |
| `color-border`         | `#e4e1da` | A dividers              | Hairlines, card edges                                                                                              |
| `color-border-strong`  | `#7a8a87` | A "Poznaj nas" outline  | Outline button (3.4:1, meets non-text 3:1)                                                                         |
| `color-on-primary`     | `#fdfdfb` |                         | White labels on `primary` and `primary-strong`                                                                     |

Rules:

- Body text is `ink` or `text-muted` on `bg`, `surface`, `cream` or a `*-soft`
  tint. On pigment (`sage`, `blush`, painted bands) use `ink` only.
- `pink` is never body text. Use `pink-strong` for small pink text.
- The brand green is #87af8c (same hue and saturation) darkened only as far
  as WCAG AA needs: white labels on it and green text on the paper both
  pass 4.5:1 (checked by the Storybook accessibility tests). `primary-strong`
  is the hover step and the colour for icons on tints.
- Colour never carries meaning alone; status always has a word or an icon.
- Success, warning and error colours are not part of this layer yet; the
  public site has no status UI. Add them when forms arrive.

## 3. Typography

| Role (utility) | Size                                   | Family / weight    | Reference                         |
| -------------- | -------------------------------------- | ------------------ | --------------------------------- |
| `text-display` | 38 → 54 px, lh 1.08, −0.015em          | `font-display` 600 | A H1 "Więcej zrozumienia."        |
| `text-h2`      | 32 → 46 px, lh 1.14                    | `font-display` 600 | A section titles                  |
| `text-h3`      | 22 → 26 px, lh 1.25                    | `font-display` 600 | Sub-headings, call-to-action      |
| `text-title`   | 17 px, lh 1.35, 600                    | `font-body`        | A tile and card titles            |
| `text-lead`    | 17 → 19 px, lh 1.6                     | `font-body`        | A hero paragraph                  |
| `text-body`    | 16 px, lh 1.65                         | `font-body`        | Paragraphs                        |
| `text-small`   | 14 px, lh 1.5                          | `font-body`        | Card meta, links, labels          |
| `text-eyebrow` | 12 px, 0.28em tracking, 600, uppercase | `font-body`        | A "NASZA OFERTA"                  |
| `text-hand`    | 26 → 42 px                             | `font-hand`        | B "Przestrzeń dla ważnych rozmów" |

Families: **Lora** (headings; a warm serif set in 600, full even strokes
without hairlines; chosen on 2026-09-26 over Fraunces and Cormorant
Garamond, which read too thin), **Figtree** (text and
UI; warm, legible, full Polish support) and **Dancing Script** (handwritten
overlay only). The font tokens read the variables `--font-lora`,
`--font-figtree` and `--font-dancing-script`, so `next/font` can provide them
when the site is built; Storybook loads the same families from Google Fonts.

Headings use `text-balance`; copy is capped at `max-w-copy` (~65 characters).
The coloured accent line of a heading is `EditorialHeading accent="…"`,
dusty pink by default or brand green with `accentTone="primary"`. The
homepage hero uses green for "Więcej sensu." and puts the pink on its
eyebrow instead (`pink-strong`, the step readable at eyebrow size).

## 4. Spacing and layout

- Tailwind's 4 px spacing scale stays the base.
- `max-w-page` (78 rem) container with `px-gutter` (20 → 40 px) side padding.
- Sections are separated by space, not lines: `py-section` (56 → 88 px) or
  `py-section-sm` (40 → 56 px).
- Desktop sections are two columns (text 4–5 parts, visual 6–7 parts) that
  alternate sides; on mobile the text comes first, then the visual, full width.
- The watercolor backdrop of `WatercolorImage` stays inside the component's
  own box, so a full-width image never causes horizontal scrolling.

## 5. Shape and surfaces

| Token               | Value               | Use                                |
| ------------------- | ------------------- | ---------------------------------- |
| `rounded-button`    | pill                | Every button and round icon button |
| `rounded-card-sm`   | 8 px                | Small chips, inputs                |
| `rounded-card`      | 12 px               | `SoftCard` (specialist cards)      |
| `rounded-card-lg`   | 20 px               | Large panels                       |
| `shadow-card`       | diffuse, ink-tinted | Resting cards                      |
| `shadow-card-hover` | deeper              | Hover / focus-within               |
| `shadow-button`     | soft green          | Primary button                     |

Surfaces, from quiet to expressive:

1. **Paper** (`bg`): the default.
2. **SoftCard**: white, soft radius, hairline edge, diffuse shadow. Only for
   content that needs a readable panel (specialist cards, forms).
3. **Painted tile** (`PastelIconTile`): a pastel patch with brushed edges
   instead of a card box (A's service tiles).
4. **Painted band** (`WatercolorSectionBackground`): a wet-on-wet band that
   drifts from sage to pink (A's closing call to action).

## 6. Watercolor image language

`WatercolorImage` turns an ordinary rectangular photo into the approved painted
composition (reference B, `painted-hero.png`). It is a static composition of
two layers around one box with a stable ratio (3 / 2 by default). The box is
the photo itself (the solid part of its painted silhouette), so the picture
fills the space the layout gives it; the watercolor backdrop and the photo's
brushed fringe overflow it onto the neighbouring elements, breaking the
page's grid a little on purpose. They take no room in the layout; keep the
component inside an `overflow-x: clip` ancestor (the page's `<main>` is), so
the overflow never scrolls the page sideways:

```
WatercolorImage (.ks-wc, aspect-ratio box)
├── backdrop   the watercolor asset, decorative (16 : 10), overflowing the
│              box by about 9 % either side and 5 % above and below
├── photo      the uploaded photo, cropped by the component and cut by the
│              dry-brush photo mask
└── caption    optional handwritten line (real text)
```

```tsx
import { WatercolorImage } from "@repo/ui/public-site";

<WatercolorImage
  src={upload} // any rectangular photo, as uploaded
  alt="Jasny gabinet z fotelem przy oknie"
  objectPosition="52% 44%" // what stays in frame; default "50% 50%"
  caption="Przestrzeń dla ważnych rozmów" // optional
  priority // hero only
  sizes="(min-width: 1024px) 55vw, 100vw"
/>;
```

Other props: `watercolorSrc` (another backdrop, or `null` for none),
`aspectRatio` (the box, drawn for 3 / 2; up to about 2 / 1 still looks right,
beyond that the mask and backdrop stretch visibly), `quality`,
`className`, `imageClassName`, `style`.

**Backdrop.** `watercolor-background.webp` is the approved painted backdrop
itself (reference 1 of the correction brief): dusty pink on the left, sage on
the right, a neutral blend between and dry-brush edges. It is a real asset, not
CSS, and it is larger than the photo: its paint shows around the photo on
every side, most on the left (pink) and right (sage), as in the target. It is
decorative (`alt=""` inside an `aria-hidden` wrapper).

**Source photo.** The photo is any ordinary rectangular image an admin
uploads. It needs no preparation: no crop, no painted edge, no fixed ratio.
The component does the presentation crop with `object-fit: cover`, and
`objectPosition` decides which part stays in frame when the upload's ratio
differs from the frame (for a 3 : 2 photo in the default composition nothing
is cropped). The photo stays a normal `next/image` `<img>` with its `alt`.

**Photo mask.** `photo-mask.png` is an alpha mask applied to the photo layer
with CSS `mask-image`. Its silhouette is traced from the approved target (the
outline of the photographed room in reference B); its edge is procedural: dry-
brush streaks that all run one way, uneven stroke ends, gaps where the brush
ran dry, a few flecks and some translucent stretches where the backdrop shows
through the photo. The photo layer box has the mask's own 3 : 2 ratio, so the
mask is never distorted, and it is smaller than the backdrop, so the
watercolor always extends beyond the photo.

**Why the photo needs no preprocessing.** The painted edge, the crop and the
backdrop all come from the component and two static assets. Replacing the
photo therefore changes nothing else, which is what lets editors upload
photos without an image editor.

**Caption.** Real text in `<figcaption>`, lower right, rotated, one or two
words per line, with a brush underline. A soft text shadow keeps white text
readable on any photo.

## 7. Mask technique

- **Photo mask:** one static alpha PNG (1500 × 1000, 8-bit palette with
  transparency, about 70 KB), applied with `mask-image` and
  `mask-size: 100% 100%` to the photo layer only. Raster rather than SVG so the
  edge can carry bristle-fine detail and partial alpha without SVG filters.
- **Entrance animation mattes** (only where the animation plays):
  `paint-matte-backdrop.png`, one image per backdrop paint region (21,
  derived from the backdrop picture), grey + alpha: the alpha is the
  finished region, the grey says when each pixel gets paint; and
  `watercolor-splash-photo.png`, the photo's blooms baked into one time map
  (400 × 266). About 280 KB together. See §11.
- **Surface masks** (service tile `tile.svg`, section band `band.svg`) are
  plain SVG geometry; their colour comes from tokens.
- Both are generated, deterministic and reproducible:
  `pnpm --filter @repo/design-system generate:watercolor`. To tune the look,
  change the generator parameters, never the files by hand.
- Rejected: canvas and WebGL (heavy, not SSR-able; the entrance animation
  does not need them either), `clip-path` polygons (no soft or streaked
  edges), `border-radius` blobs and ellipses (read as CSS,
  not paint), baking the edge into each photo (every photo would need an
  editor), runtime image processing.

## 8. Responsive behaviour

- The component is fluid (`width: 100%`) and reserves its box with
  `aspect-ratio`, so nothing shifts while the images load.
- The backdrop, the photo layer and the mask are positioned in percentages of
  that one box, so they scale together and keep the same relation at every
  width (checked at 1440, 768 and 390 px). The mask never stretches in the
  default ratio.
- Relative to the backdrop, the photo layer is the approved target's
  footprint scaled up 1.1× (it covers more of the backdrop). In the mask
  (`generate-photo-mask.mjs`) the silhouette's left bulge is pulled in, so
  the pink shows down the whole left edge, and its lower left corner is
  pushed out, where too much pink showed.
- Pass `sizes` for the layers, about 1.17× the box (they overflow it).
- The painted edge covers roughly 5–10 % of the photo on each side; keep
  subjects away from the very edge or move them in with `objectPosition`.
- The caption scales with the picture (container query units), not with the
  viewport, with a 16 px floor on phones.

## 9. Accessibility

- `alt` is required. Pass `alt=""` only when the photo is purely decorative.
- The watercolor backdrop and the caption underline are `aria-hidden`; the
  mask is CSS only. The photo is the only image exposed to assistive tech.
- The handwritten line is real text in `<figcaption>`, never baked into the
  photo or the backdrop.
- Painted surfaces never carry body text in muted grey; see the palette rules.
- Buttons and links have visible focus outlines (`outline-ring`, 2 px, offset).
- The entrance animation respects `prefers-reduced-motion`: by default the
  finished composition shows at once, or, with
  `reducedMotionMode="simple-fade"`, it fades in over 0.4 s with no painting.
  The paint matte is `aria-hidden` and never replaces the photo: the real
  `<img>` with its alt text is in the page from the first HTML.

## 10. Performance

- Both layers use `next/image`: responsive `sizes` (default
  `(min-width: 1024px) 60vw, 100vw`), modern formats and `srcset` from the
  Next.js optimiser. `priority` preloads the photo with `fetchPriority=high`
  and loads the backdrop eagerly; everything else is `loading="lazy"`.
- No layout shift: the ratio box is reserved before the images arrive.
- The painted look is two cached static assets (backdrop WebP about 400 KB at
  full size, served resized by Next.js; photo mask about 70 KB) and CSS. No
  canvas, WebGL, JavaScript or per-image processing; the component is a
  server component.
- The entrance animation adds GSAP (about 28 KB gzipped) and one small client
  component, only where `animationPreset="watercolor-reveal"` is used, plus
  the two matte atlases (§7). It animates only the matte (an off-layout SVG):
  no layout properties, so no layout shift (CLS 0 measured). Script time is
  about 40 ms per reveal. Measured in headless Chromium without a GPU (a
  pessimistic setting, all rasterised on the CPU): the backdrop stage runs at
  about 60 fps, the photo stage, where both masked layers repaint each frame,
  at about 15 fps. Check on the target phones before using it widely. After
  the reveal nothing is left: no matte, no masks, no filters, no running
  timeline (GSAP's ticker goes to sleep).

## 11. Entrance animation

`<WatercolorImage animationPreset="watercolor-reveal" />` paints the
composition in once, when it first comes into view (a quarter of it on
screen). The default is `animationPreset="none"`: the static composition, with
no script at all.

The picture is not faded, wiped or scaled in. Like a paint matte in After
Effects, an animated matte decides which pixels of the finished backdrop and
photo are visible: the backdrop is painted in with brush strokes, one by one;
the photo spreads in like watercolor on wet paper, in blooms (the same kind
of effect as the specialist cards' splash, with its own generator).

**Sequence** (one GSAP timeline, about 1.15 s):

| Time       | What happens                                                                                                        |
| ---------- | ------------------------------------------------------------------------------------------------------------------- |
| 0 s        | The first backdrop strokes start from the left (pink) and the right (green) edge at once.                           |
| 0.05–0.6 s | Further backdrop regions follow, outer ones first, 20–90 ms apart on each side, each with its own speed and ease.   |
| 0.32 s     | While the backdrop is still being painted, the first blooms of the photo open in its middle.                        |
| 0.4–0.9 s  | The photo spreads outward in many uneven blooms; the two sides of the backdrop overlap in the middle.               |
| 0.85 s     | The caption fades in (0.3 s, no movement).                                                                          |
| 0.95 s     | The backdrop is complete.                                                                                           |
| 1.15 s     | The last blooms of the photo and the caption finish. The matte is removed: the static composition, pixel for pixel. |

The exact schedule is `paintSchedule` and `photoSplashTiming` in
`watercolor-paint-matte.ts` (the backdrop's part comes with its regions, the
photo's blooms with its time map, from the generators).

**How it works**

- The matte (`watercolor-paint-matte.ts`) is an SVG with one `<mask>` per
  layer. The backdrop element and the photo's `<img>` are masked with it
  (`mask-image: url(#…)`) while the reveal runs; the photo layer keeps its
  static photo mask on top, so the painted edge never changes.
- The backdrop's mask holds paint regions, each an image from its atlas:
  its alpha is the finished region, its grey channel a time map (when each
  pixel gets paint). The photo's mask holds a single time map of the whole
  photo layer.
- **Backdrop: 21 regions derived from the backdrop picture itself**
  (`backdrop-brushwork.mjs`), not drawn by hand. A structure tensor of the
  picture gives the direction its paint streaks run in, everywhere, and how
  clear they are. Evenly spaced streamlines of that field, started where the
  streaks are clearest, are the brush strokes: at whatever angle and with
  whatever curve the brushwork has (dry-brush strokes where the streaks are
  very clear). What no stroke's band reaches (soft, low-coherence pockets,
  mostly toward the middle of the picture) joins whichever traced stroke is
  nearest, so every pixel belongs to a directional brush stroke, never a
  shape spreading from a point. Borders are streaky along the brush. Stroke
  time runs along the curved centreline, with the picture's own darker
  streaks ahead of the paper between them, so a dry-brush front breaks up
  into the streaks that are really there. The region's colour picks its
  side: pink regions start at the left edge, green ones at the right.
  Outside the painted area (transparent in the picture) a pixel takes the
  region and time of the nearest paint, so nothing lights up on its own
  there. Needs `sharp` (a dev dependency of `@repo/design-system`) to read
  the picture.
- **Photo: blooms, baked into one time map**
  (`generate-watercolor-splash.mjs`). About 22 blooms, each from its own
  seed on jittered elliptical rings around the middle of the photo, the
  middle ones first and the outer ones later, one in five lagging behind.
  Every pixel belongs to whichever bloom reaches it first, through a warped
  field with lobes and a cauliflower edge, so blooms meet along irregular
  borders. Each bloom spreads with its own sine.out ease; the generator
  folds starts and eases into the map, so the runtime needs one filter and
  one linear tween for the whole photo, with a soft, wet front.
- Per backdrop stroke (and once for the photo), an SVG colour-matrix
  filter shows the pixels whose time has come. GSAP moves that threshold, so the paint front is wherever the time
  map crosses it: a frayed brush front, not a moving edge or a growing shape.
  Where the paint has arrived the layer is fully opaque: nothing fades.
  When a stroke is done its filter is dropped.
- Backdrop regions run from both edges toward the centre, where the two
  sides' strokes close it (its splatter is in its picture).
- When everything is done, the strokes cover the whole backdrop (the
  generator checks this and fails otherwise) and the photo's map is opaque
  over the whole layer, so removing the matte changes no pixel.
- GSAP only schedules: one master timeline with a child timeline per
  backdrop stroke and one tween for the photo. The paint itself comes from
  the images.
- The backdrop's strokes and atlas are generated by
  `packages/design-system/scripts/generate-paint-matte.mjs`, its regions by
  `backdrop-brushwork.mjs` next to it; the photo's time map by
  `generate-watercolor-splash.mjs` (all part of `generate:watercolor`). Change the generators (or, for a new backdrop picture, just
  run them again), never the PNGs.
- No canvas or WebGL, no `clip-path`, no blur.

**Browsers**

- Chromium and Firefox paint the reveal. WebKit (Safari) ignores SVG masks on
  HTML elements, so there the stylesheet and the script both keep the static
  composition (`@supports not (font: -apple-system-body)`).

**Server rendering and no-script**

- `WatercolorImage` stays a server component; only the small wrapper
  `WatercolorReveal` (`"use client"`) is added around the same layers. The
  server HTML is the finished composition, with no hidden inline styles and
  no matte. The matte is created by the script and removed again.
- The layers are hidden by CSS only inside
  `@media (scripting: enabled) and (prefers-reduced-motion: no-preference)`,
  so there is no flash of the finished picture before it paints. Without
  JavaScript, nothing is hidden. If the script never takes over, a 3 s CSS
  fallback shows the finished composition.
- States on the root, `data-reveal`: none (server HTML), `waiting` (until in
  view and the images and atlases are loaded, at most 1.5 s), `playing`,
  `fading` (reduced motion), `done`.
- **Warm-up** (all three reveals, `reveal-support.ts`): about half a screen
  before an image comes into view, its images and atlases are loaded and
  decoded and the matte and a paused timeline are built; once enough of it is
  visible, it only has to start. The fallback check (did the 3 s CSS safety
  net already show it?) reads computed styles only after those 3 s, never
  while the page is hydrating.

**Reduced motion** (`reducedMotionMode`): `"static"` (default) shows the
finished picture at once; `"simple-fade"` fades it in over 0.4 s. No brush
painting either way.

**Storybook** (Public site / WatercolorImage): Static Approved, Animated
Paint Reveal, Slow Motion Debug (5× slower, with the backdrop matte and its
brush lines beside it and a stroke chart), Matte Debug (both mattes, white =
visible; the backdrop matte alone and only where its picture has paint, the
regions and brush lines found in the picture, their time maps; scrub or play
slowly), Reduced Motion, Final Composition (last frame beside the static
picture, with a difference overlay), Frame Strip (every 100 ms, with the
mattes under each frame).

**Not in scope yet:** the portrait version, page-level orchestration,
scroll-linked animation and choreography between sections.

### Specialist cards (splash reveal)

`SpecialistsSection` / `SpecialistWatercolorCard` ("Nasi specjaliści",
reference `specialists-concept.png`) share the language and the mechanism of
WatercolorImage but not its matte: the splash behind a specialist is
revealed by **blooms**, never brush strokes.

- **Layers** in one 3 : 4 box (the ratio of every supplied splash): the
  supplied splash asset, whole and unframed; the cut-out portrait at full box
  width, its lower edge dissolving into the watercolor in patches between
  67 % and 80 % of the box (`portrait-dissolve.png`), with the splash's own
  pigment multiplied over the clothes there (`portrait-stain.png`); then the
  info plate, the only rectangular element, overlapping from 80 %.
- **Splash matte** (`generate-splash-matte.mjs` →
  `specialist-splash-matte.data.ts`, `splash-time.png`): 27 bloom regions.
  Seeds sit on jittered elliptical rings around the torso; every pixel
  belongs to whichever bloom reaches it first, through a warped field with
  lobes and a cauliflower edge, so blooms meet along irregular borders. The
  generator bakes all blooms, each with its start and ease, into one time
  map of the box; the runtime runs the same SVG threshold as the brush matte
  over it, with a softer, wet front, in one linear tween: one filter per
  card, however many blooms (27 filters per card were too much for the GPU
  in a row of cards). The per-bloom atlas (`splash-matte.png`) is only for
  Splash Matte Debug. Variant "b" is "a" mirrored; a row alternates them.
- **Sequence** (about 1.05 s, plus 0.12 s stagger per card in a row):
  portrait fades in and lifts 14 px (0–0.5 s); splash starts behind the torso
  at 0.2 s and is complete at 1.0 s; pigment on the portrait 0.5–0.9 s; plate
  fades in, without moving (it holds the link overlay; 0.66–1.04 s). Then
  no matte, no inline styles.
- **Fallbacks:** reduced motion as WatercolorImage (`static` or
  `simple-fade`); WebKit (no SVG masks on HTML) fades the splash instead of
  blooming it; a 3 s CSS safety net if the script never runs.
- **Layout:** stacked cards at most 20 rem wide on phones; three in a row
  from 48 rem. Plate type scales with the card (container units).
- **Storybook:** SpecialistWatercolorCard (Pink, Green, Static, Animated,
  Reduced Motion, Splash Matte Debug, Slow Motion Debug, Frame Strip) and
  SpecialistsSection (Desktop, Tablet, Mobile).

### Offer tiles (brush reveal)

`OfferSection` / `OfferTile` ("Nasza oferta", reference A's service tiles)
put each service on one of four supplied watercolor patches
(`offer-{sage,pink}-{1,2}.png`), painted in with brush strokes, but not
WatercolorImage's (from both sides to the middle): five quick strokes, one
band after another.

- **Layers** in one 5 : 8 tile: the supplied patch, its painted area
  (measured from the file by `generate-offer-matte.mjs`) stretched onto the
  tile, at most ~5 %, so the four different files line up; the icon in
  paper colour, as if cut out of the paint; title (the link), description
  in ink (never muted grey on paint); a round arrow.
- **Brush matte** (`generate-offer-matte.mjs` → `offer-brush-matte.data.ts`,
  `offer-matte.png`): five strokes at 22°, rising to the right like the
  brushwork in the patches, each crossing the whole tile and starting and
  lifting outside it, back and forth. The brush itself (body, dry-brush
  edge, bristle hairs) is the one of WatercolorImage's photo strokes
  (`brush-stroke.mjs`). Variant "a" (odd tiles) paints top to bottom, its
  first stroke left to right; variant "b" (even tiles) the opposite:
  bottom to top, first stroke right to left.
- **Sequence** (about 0.9 s, plus 0.1 s stagger per tile in a row): strokes
  every 0.11 s, 0.3 s each, overlapping (painted by 0.74 s); content fades
  in without moving (it holds the link overlay; 0.3–0.75 s); arrow lifts in
  (0.55–0.9 s). Then no matte, no
  inline styles.
- **Fallbacks:** reduced motion `static` or `simple-fade`; WebKit fades the
  paint instead of painting it; a 3 s CSS safety net.
- **Layout:** 2 x 2 on phones, a row of four from 48 rem; type scales with
  the tile (container units).
- **Storybook:** OfferTile (Sage, Pink, Static, Animated, Reduced Motion,
  Brush Matte Debug, Slow Motion Debug, Frame Strip, All Paints Animated)
  and OfferSection (Desktop, Tablet, Mobile).

### Page motion around the pictures (`PageMotion`)

The homepage is wrapped in `<PageMotion>` (page-motion.tsx), which moves what
the pictures' own reveals leave still. Other pages don't use it, so the
`data-motion` marks on shared components do nothing there.

- **Text columns** (`data-motion="text"`): as the column comes into view its
  children rise 14 px into place, 0.09 s apart; a heading comes in line by
  line from behind its own baseline (GSAP SplitText line masks), 0.9 s.
  Afterwards the split is reverted and no inline styles remain.
- **Painted band** (`data-motion="band"`, ClosingCta): the band's paint is
  dragged in from the left by its own brushed edge (its mask intersected with
  a copy of itself sliding into place, 1.5 s), then the ink sprig settles
  with one sway; the band's text follows after `data-motion-delay`.
- **Parallax in the frame** (CSS only, scroll-driven, Chromium and Safari
  26+): a WatercolorImage's photo drifts ±3 % (±1.75 % on phones) against its
  frame, scaled 1.07 so no edge shows; the backdrop drifts half as far the
  other way. Browsers without scroll-driven animations keep the still
  picture.
- **Microinteractions:** ArrowLink draws a green stroke over its hairline
  underline; offer tiles swell their paint a touch and fill the arrow
  circle; specialist portraits lean in 3.5 % and the arrow fills; button
  arrows move 4 px.
- **FAQ:** answers open and close to their intrinsic height
  (`interpolate-size`, Chromium); other browsers open instantly.
- **Site header** (HeaderScroll): hairline only once the page has moved;
  slides away while reading down past four header heights, back on the first
  scroll up or when focus enters it; never hides under reduced motion.
- **Talking Walls layer** (2026-10-01, michal's chosen references: David
  Whyte Experience and Talking Walls): Lenis inertia scroll (wheel and
  trackpad only); a pink hairline cursor ring that grows over links and
  becomes a "Zobacz" disc over pictures and cards (fine pointers only);
  `DriftingWords` (two huge outlined lines sliding apart,
  decorative, aria-hidden); `DriftingPhotos` (tilted room photos travelling
  sideways, from the rooms' published photos, shown from 3 photos); the hero
  picture rising a little faster than its text.
- **Painted story** (`PaintedStory`, after David Whyte Experience): "Jak
  zacząć" in three steps (first conversation, rooms, workshops). From 64 rem
  with motion it pins one screen while the steps change; each step's
  picture is painted over the previous one with the WatercolorImage brush
  strokes, a pink line fills with progress, scrolling back lifts the later
  pictures. Phones: steps in flow, each picture painted in on view. Safari
  cross-fades. Reduced motion or no script: the plain stacked steps.
- **Fallbacks:** reduced motion or no scripting gives the static page; the
  starting state lifts itself after 3 s if the script never runs.

## 12. Primitives

Only what the references repeat:

| Component                     | Reference A                                |
| ----------------------------- | ------------------------------------------ |
| `SectionEyebrow`              | "CENTRUM PSYCHOTERAPII I ROZWOJU"          |
| `EditorialHeading`            | Serif H1/H2 with optional accent line      |
| `HeroSection`, `HeroPoints`   | Homepage first screen, reassurance row     |
| `FeatureSection`              | "Nasze gabinety", "Warsztaty i rozwój"     |
| `PrimaryButton`               | Solid green pill "Umów wizytę →"           |
| `SecondaryButton`             | Outline pill "Poznaj nas"                  |
| `ArrowLink`                   | "Zobacz całą ofertę →"                     |
| `SoftCard`                    | Readable panels (forms)                    |
| `SpecialistWatercolorCard`    | Specialist cards (specialists-concept.png) |
| `OfferTile`                   | Service tiles                              |
| `PastelIconTile`              | Pastel patch tiles                         |
| `BotanicalAccent`             | Ink sprig and leaf line art                |
| `WatercolorSectionBackground` | Closing call-to-action band                |

Buttons accept `asChild` to render a `next/link` `<Link>`.

### Site layout (reference A's header and footer)

`SiteLayout` frames every public page, in landmark order: `SkipLink`
("Przejdź do treści", first focusable element) → `SiteHeader` → `<main
id="tresc">` → `SiteFooter`. Everything is server HTML; only three small
islands hydrate: the desktop dropdown, the phone menu and the cookie notice.

- **Brand:** the Kolor Sensu owl (`apps/web/public/brand`, used as
  delivered). `generate:brand` makes `favicon.ico` (16/32/48), `icon.png`
  (512) and `apple-icon.png` (180, on paper) for Next.js's icon conventions,
  and the 2x header mark. `SiteLogo`: the mark plus "Kolor Sensu" in
  Figtree 600; the name is the link text, the mark is decorative.
- **Header:** sticky on paper with a hairline, no blur or shadow. Logo,
  navigation (shadcn `NavigationMenu`, from 64 rem; "Oferta" opens its
  services with a line each), "Umów wizytę" (from 40 rem), menu button
  (below 64 rem). The current page is `aria-current="page"`, in green.
- **Phone menu:** shadcn `Sheet` from the right, on paper (no blur behind
  it): pages in the display serif, services indented, the booking action
  full width, phone and e-mail.
- **Footer:** logo with tagline and a sentence about the centre, social
  profiles (line icons in lucide's style), "Nawigacja", "Oferta", contact
  as an `<address>` (tap to call, tap to write, hours), then a hairline
  (shadcn `Separator`), the copyright and legal links.
- **Subpages:** `SiteBreadcrumbs` (shadcn `Breadcrumb`) above the page's
  eyebrow and H1.
- **FAQ:** `FaqSection` (shadcn `Accordion`); closed answers stay in the
  HTML, only hidden.
- **Cookie notice:** `CookieConsent`, a small card in the lower corner,
  client-only (never in the first paint, no layout shift); the choice is
  kept in localStorage and passed to the app before any analytics load.
- **First-visit intro:** `SiteIntro` (first in `SiteLayout`, `intro`
  prop): paper, a pink and sage watercolor patch spreading, the owl mark,
  the name, a pink brush swash drawn under it, the tagline, then the paper
  fades away (about 1.5 s). Pure CSS from the first paint, no JavaScript
  bundle needed; an inline script before the first paint lets it play only
  on the first visit (localStorage `ks-intro`), never under reduced motion
  or where storage is blocked. It takes no clicks or focus and is hidden
  from assistive technology; the page underneath is already rendered, so
  it is not a preloader and does not delay LCP. The page's reveals start as
  it fades (1.1 s; `introRemaining` in `reveal-support.ts`). Returning
  visitors download nothing for it (lazy image, CSS images of a hidden
  element).
- **SEO:** one H1 per page; landmarks and labelled navigations;
  structured data as JSON-LD (`JsonLd`, `<` escaped): `MedicalBusiness`
  for the centre (from `SiteLayout` when `siteUrl` is set),
  `BreadcrumbList`, `FAQPage`.
- **Storybook:** Public site/Layout (header in every width, the dropdown
  and the phone menu open, footer, logo, breadcrumbs, FAQ, cookie notice,
  intro with a replay button)
  and Public site/Pages (the home page at every width, first visit, phone
  menu open, a subpage).

## 13. What NOT to do

- No generic SaaS gradients (purple-blue, mesh, "aurora").
- No neon or saturated colour; no colour outside the palette.
- No glassmorphism, frosted panels or backdrop blur.
- No heavy or stacked shadows; `shadow-card` is the ceiling.
- No hard photo rectangles as the default. A plain rectangle or a rounded
  rectangle photo is an exception that needs a reason.
- No CSS blobs (`border-radius: 60% 40% …`) pretending to be paint.
- No hyper-feminine floral styling: no roses, no swirls, no glitter.
- No childish wellness illustrations, cartoon people or emoji decoration.
- No random colour usage: every colour is a token with a role.
- No paint behind or through body text, no textured buttons, no handwriting
  font in headings, buttons, navigation or long sentences.
- No text baked into photos.
- No pre-cut, pre-painted or hand-cropped photos: upload the ordinary photo
  and let `WatercolorImage` crop and paint it.
- No wipes, fades, blurs or growing shapes to reveal painted layers: paint
  them in through the matte (§11).
- No looping, bouncing or cursor-following animation. Nothing may stay hidden
  without a script: pre-hide only under `(scripting: enabled)`, with a CSS
  fallback that shows the content anyway.
- No new mask shapes drawn by hand; extend the generators.
- No second photo mask "variant" until there is a layout that needs it; one
  well-matched mask beats several weak ones.
