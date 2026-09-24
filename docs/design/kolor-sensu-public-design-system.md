# Kolor Sensu public design system

The visual foundation of the public website (`apps/web`), reconstructed from two
approved references in `docs/design/references/public/`:

- **A** `homepage-concept.png`: the homepage concept (composition, palette,
  type, spacing, controls, cards).
- **B** `painted-hero.png`: the painted hero photograph (brushed mask, washes,
  paper grain, handwritten overlay).

It is a foundation, not a page: tokens, one painted image component, a paint
reveal hook and a handful of primitives. Pages are built from it later.

| Piece                               | Where                                                              |
| ----------------------------------- | ------------------------------------------------------------------ |
| Tokens (Tailwind v4 `@theme`)       | `packages/design-system/src/public-theme.css`                      |
| Painted layers and reveal CSS       | `packages/ui/src/public-site/public-site.css`                      |
| Components                          | `packages/ui/src/public-site/` (`@repo/ui/public-site`)            |
| Mask assets                         | `apps/web/public/watercolor/*.svg`                                 |
| Mask generator                      | `packages/design-system/scripts/generate-watercolor-masks.mjs`     |
| Stories                             | Storybook › Public site (WatercolorImage, Primitives, Examples)    |
| Placeholder photos (Storybook only) | `apps/storybook/public/kolor-sensu/` (crops of references A and B) |

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
6. **Quiet motion.** Paint is brushed on once; nothing loops, bounces or
   follows the cursor.

## 2. Palette

Sampled from the references, then adjusted only where WCAG contrast required.
Utilities follow the token name: `--color-primary` → `bg-primary`,
`text-primary`, `border-primary`.

| Token                  | Hex       | Source                 | Use                                           |
| ---------------------- | --------- | ---------------------- | --------------------------------------------- |
| `color-bg`             | `#f8f7f3` | A page, B paper        | Page background                               |
| `color-surface`        | `#fdfdfb` | A specialist cards     | Cards, inputs, round icon buttons             |
| `color-cream`          | `#f3efe7` | A warm areas           | Alternate surface, neutral wash               |
| `color-beige`          | `#e6ddd0` | B linen, wood          | Neutral wash pigment                          |
| `color-ink`            | `#16302f` | A headings             | Headings and body text (13.1:1 on `bg`)       |
| `color-text-muted`     | `#566461` | A body copy            | Secondary copy (≥ 5:1 on `bg` and soft tints) |
| `color-primary`        | `#305c4a` | A "Umów wizytę" button | Primary button, icons, focus ring             |
| `color-primary-strong` | `#244a3b` | darker step            | Hover / pressed                               |
| `color-primary-soft`   | `#e3eadf` | A sage tiles           | Sage tint behind content                      |
| `color-sage`           | `#c5d0bf` | B right wash           | Wash pigment only                             |
| `color-pink`           | `#b86e6b` | A "Więcej sensu."      | Display text ≥ 24 px, icons (3.6:1)           |
| `color-pink-strong`    | `#9c5754` | darker step            | Pink text below 24 px (5:1)                   |
| `color-pink-soft`      | `#f6e6e1` | A pink tiles           | Blush tint behind content                     |
| `color-blush`          | `#ebcdc6` | B left wash            | Wash pigment only                             |
| `color-border`         | `#e4e1da` | A dividers             | Hairlines, card edges                         |
| `color-border-strong`  | `#7a8a87` | A "Poznaj nas" outline | Outline button (3.4:1, meets non-text 3:1)    |
| `color-on-primary`     | `#fdfdfb` |                        | Text on primary (7.5:1)                       |

Rules:

- Body text is `ink` or `text-muted` on `bg`, `surface`, `cream` or a `*-soft`
  tint. On pigment (`sage`, `blush`, painted bands) use `ink` only.
- `pink` is never body text. Use `pink-strong` for small pink text.
- Colour never carries meaning alone; status always has a word or an icon.
- Success, warning and error colours are not part of this layer yet; the
  public site has no status UI. Add them when forms arrive.

## 3. Typography

| Role (utility) | Size                                   | Family / weight    | Reference                         |
| -------------- | -------------------------------------- | ------------------ | --------------------------------- |
| `text-display` | 40 → 60 px, lh 1.06, −0.015em          | `font-display` 400 | A H1 "Więcej zrozumienia."        |
| `text-h2`      | 32 → 46 px, lh 1.12                    | `font-display` 400 | A section titles                  |
| `text-h3`      | 22 → 26 px, lh 1.25                    | `font-display` 400 | Sub-headings, call-to-action      |
| `text-title`   | 17 px, lh 1.35, 600                    | `font-body`        | A tile and card titles            |
| `text-lead`    | 17 → 19 px, lh 1.6                     | `font-body`        | A hero paragraph                  |
| `text-body`    | 16 px, lh 1.65                         | `font-body`        | Paragraphs                        |
| `text-small`   | 14 px, lh 1.5                          | `font-body`        | Card meta, links, labels          |
| `text-eyebrow` | 12 px, 0.28em tracking, 600, uppercase | `font-body`        | A "NASZA OFERTA"                  |
| `text-hand`    | 26 → 42 px                             | `font-hand`        | B "Przestrzeń dla ważnych rozmów" |

Families: **Fraunces** (headings; soft editorial serif), **Figtree** (text and
UI; warm, legible, full Polish support) and **Dancing Script** (handwritten
overlay only). The font tokens read the variables `--font-fraunces`,
`--font-figtree` and `--font-dancing-script`, so `next/font` can provide them
when the site is built; Storybook loads the same families from Google Fonts.

Headings use `text-balance`; copy is capped at `max-w-copy` (~65 characters).
The pink accent line of a heading is `EditorialHeading accent="…"`.

## 4. Spacing and layout

- Tailwind's 4 px spacing scale stays the base.
- `max-w-page` (78 rem) container with `px-gutter` (20 → 40 px) side padding.
- Sections are separated by space, not lines: `py-section` (56 → 88 px) or
  `py-section-sm` (40 → 56 px).
- Desktop sections are two columns (text 4–5 parts, visual 6–7 parts) that
  alternate sides; on mobile the text comes first, then the visual, full width.
- Painted washes bleed past their image. On phones the overhang shrinks to
  about 3 %, which stays inside `px-gutter`; an edge-to-edge image needs
  `overflow-x-clip` on its section.

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

`WatercolorImage` is the one component for every photo on the public site:
hero, specialists, rooms and workshops. It stacks five layers:

1. **Washes** (two `<span aria-hidden>`): pastel pigment in a brushed wash
   shape with paper grain, lower-left and upper-right of the photo, bleeding
   past it.
2. **Painted mask**: an SVG alpha mask with dry-brush rows, ragged stroke ends
   and bristle trails, applied with `mask-image` to the frame.
3. **Image**: a real `next/image` `<img>` with `alt`, `object-fit: cover` and a
   focal point.
4. **Botanical accent** (optional): ink line art over the edge.
5. **Handwritten overlay** (optional): real text in `<figcaption>`, rotated,
   with a brush underline.

```tsx
import { WatercolorImage } from "@repo/ui/public-site";

<WatercolorImage
  src={room}
  alt="Jasny gabinet z fotelem przy oknie"
  shape="wide-brush" // soft-horizontal | wide-brush | portrait-soft | compact-brush
  tone="sage-blush" // sage | blush | sage-blush | neutral
  caption="Przestrzeń dla ważnych rozmów"
  priority // hero only
  sizes="(min-width: 1024px) 55vw, 100vw"
/>;
```

| Shape             | Native ratio | For                                  |
| ----------------- | ------------ | ------------------------------------ |
| `wide-brush`      | 16:10        | Hero, workshops (2:1, 21:9 fine too) |
| `soft-horizontal` | 4:3          | Rooms, content images                |
| `portrait-soft`   | 4:5          | Specialists, portraits, tall crops   |
| `compact-brush`   | 1:1          | Small squares, thumbnails            |

| Tone         | Back wash → front wash  | Reference            |
| ------------ | ----------------------- | -------------------- |
| `sage-blush` | `blush` → `sage`        | B, A hero            |
| `sage`       | `sage` → `primary-soft` | A specialist washes  |
| `blush`      | `blush` → `pink-soft`   | A "Gabinety" section |
| `neutral`    | `beige` → `cream`       | Quiet sections       |

Other props: `aspectRatio` (any ratio; the mask stretches with it),
`focalPoint` (object-position), `washes={false}` (inside cards), `accent`
(`sprig` | `leaf`) with `accentPosition`, `captionPosition`, `captionTone`
(`light` on the photo with a soft veil, `ink` on paper), `paint="on-load"`.

## 7. Mask technique

- **Static SVG alpha masks** (`/watercolor/mask-*.svg`, 9–11 KB gzipped each),
  applied with CSS `mask-image` and `mask-size: 100% 100%`, so they stretch to
  any box and the image stays a normal, crawlable, lazy-loadable `<img>`.
- The masks are **plain geometry without SVG filters**: they rasterise once,
  cost nothing per frame and render the same in every browser.
- They are **generated**, deterministic and reproducible:
  `pnpm --filter @repo/design-system generate:watercolor`. To tune the look,
  change the parameters in the generator, never the SVGs by hand.
- Washes, the service tile (`tile.svg`) and the section band (`band.svg`) use
  the same technique; colour comes from tokens, not from the files.
- Rejected: canvas and WebGL (heavy, not SSR-able), `clip-path` polygons (no
  soft or streaked edges), `border-radius` blobs (read as CSS, not paint),
  baking the edge into each photo (every photo would need an editor).

## 8. Responsive behaviour

- The component is fluid (`width: 100%`) and reserves its box with
  `aspect-ratio`, so nothing shifts while the photo loads.
- Masks stretch with the box; any ratio from 21:9 to 3:5 stays painterly.
- `focalPoint` keeps faces and key objects inside the painted area on narrow
  crops. The painted edge covers about 5–10 % on each side, so keep subjects
  away from the very edge.
- The handwritten caption scales with the image (container query units), not
  with the viewport, so it keeps its proportion on phones.
- On mobile the text column comes first and the picture follows at full
  width; the washes pull in so they never cause horizontal scrolling.

## 9. Accessibility

- `alt` is required. Pass `alt=""` only when the photo is purely decorative.
- Washes, masks, grain, accents and the underline are `aria-hidden`; only the
  photo is exposed as an image.
- The handwritten line is real text in `<figcaption>`, never baked into the
  photo. Light captions sit on an ink veil that keeps them above 4.5:1.
- Painted surfaces never carry body text in muted grey; see the palette rules.
- Buttons and links have visible focus outlines (`outline-ring`, 2 px, offset).
- Every animation is off under `prefers-reduced-motion`; content is never
  hidden by default (see below).

## 10. Performance

- `next/image`: responsive `sizes` per shape (overridable), modern formats and
  `srcset` from the Next.js optimiser, `priority` → preload + `fetchPriority=high`
  for the hero, `loading="lazy"` everywhere else.
- No layout shift: the ratio box is reserved before the image arrives.
- The painted look is CSS and a few small cached SVGs; no large PNG overlays,
  no per-image processing, no JavaScript for the static picture.
- The only client code is `PaintReveal` (an IntersectionObserver that sets one
  attribute).

## 11. Animation direction

The reveal feels like the picture being painted, in this order:

1. washes are brushed on (a bristled wipe sweeps across each wash),
2. the botanical line art draws itself (`stroke-dashoffset`, `pathLength=1`),
3. the photo is brushed in, still desaturated (same wipe on the frame),
4. colour fills in (`filter` from grey to full colour),
5. the handwritten caption writes itself last (`clip-path` wipe).

How it works:

- Everything is CSS in `public-site.css`, keyed on a `data-paint` attribute on
  the image or any ancestor: `load` (plays on first render, CSS only),
  `idle` (held at the first frame), `play` (runs).
- **Hero:** `paint="on-load"`. No JavaScript; the server HTML is the finished
  image and the browser animates it on first paint.
- **Below the fold:** `AnimatedWatercolorImage` or wrap a section in
  `PaintReveal`. After hydration it holds blocks that are still off-screen and
  paints them as they scroll in. Blocks already on screen are left alone, so
  visible content is never hidden.
- **Reduced motion:** all animation rules live inside
  `@media (prefers-reduced-motion: no-preference)` and `PaintReveal` does
  nothing, so the finished picture shows at once.
- Timings are CSS variables (`--ks-paint-*-delay`, `--ks-paint-*-duration`), so
  a future Motion or WAAPI timeline can drive the same layers without changing
  the component.

Storybook › Public site › WatercolorImage › _Paint Reveal Demo_ shows the
sequence with a replay button; _Paint Reveal Reduced Motion_ shows the result
for visitors who opted out.

## 12. Primitives

Only what the references repeat:

| Component                     | Reference A                                |
| ----------------------------- | ------------------------------------------ |
| `SectionEyebrow`              | "CENTRUM PSYCHOTERAPII I ROZWOJU"          |
| `EditorialHeading`            | Serif H1/H2 with optional pink accent line |
| `PrimaryButton`               | Solid green pill "Umów wizytę →"           |
| `SecondaryButton`             | Outline pill "Poznaj nas"                  |
| `ArrowLink`                   | "Zobacz całą ofertę →"                     |
| `SoftCard`                    | Specialist cards                           |
| `PastelIconTile`              | Service tiles                              |
| `BotanicalAccent`             | Ink sprig and leaf line art                |
| `WatercolorSectionBackground` | Closing call-to-action band                |

Buttons accept `asChild` to render a `next/link` `<Link>`.

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
- No looping, bouncing or cursor-following animation; nothing that hides
  content until JavaScript runs.
- No new mask shapes drawn by hand; extend the generator.
