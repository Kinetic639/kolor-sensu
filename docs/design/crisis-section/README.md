# Crisis section concepts

The homepage now uses the approved combined design through `CrisisStrip`.
This folder also preserves the three earlier standalone concepts and sources.

## Production integration

- `CrisisStrip` reads the existing CMS data via `getCrisisHelp()` on the home
  page: eyebrow, heading, description, details-link label and 1–6 contacts.
- The admin's **CMS → Strona główna → Pomoc w kryzysie** form edits these
  fields, saves a draft and uses the existing page publish action. There are
  no hardcoded contact labels, availability descriptions or phone numbers in
  the presentation component. The details destination stays `/pomoc-w-kryzysie`.
- Old published JSON remains valid: the schema supplies eyebrow and link-label
  defaults when missing. The existing database JSON validator already permits
  these additional fields; no migration or live data changes are needed.
- `HanddrawnLink` is exported from `@repo/ui/public-site`. Text, underline and
  arrow all use the inherited text color; hover and keyboard focus turn all
  three green. It has no native underline under the arrow.
- `InkReveal` uses the existing lazy GSAP loader. The homepage does not load
  the standalone prototype's vendored runtime. Content and painted fills are
  always visible. Only ink is animated; reduced motion or unavailable scripts
  keep complete static artwork.
- The four outlines are compiled as typed SVG data for server rendering,
  preserving `preserveAspectRatio="none"`. No SVG fetch is needed on the live
  page. Painted fills use optimized WebP and Next Image.
- Storybook includes the normal section, one contact, six long contacts, and
  the reusable link with inherited colors.

## Compare the concepts

Open `http://localhost:3000/crisis/concept-preview.html?v=drawn-link-1` while apps/web is
running. The buttons switch between painted washes, brush outlines and the
combined painted cards with animated outlines. The preview uses placeholder contact information; it is not a list
of working support lines. A production implementation should use the existing
CMS content and telephone links.

All directions use the same diagonal color layout:

| Position     | Color |
| ------------ | ----- |
| Top left     | Pink  |
| Top right    | Green |
| Bottom left  | Green |
| Bottom right | Pink  |

The palette is soft blush based on `#FABCBC`, sage based on `#A7C7A2`, dark
ink `#16302F`, and the site's paper `#F8F7F3`.

## A: painted washes

`painted-washes-reference.png` preserves the approved concept mockup. Separate
reusable backgrounds live in `apps/web/public/crisis/`:

- `crisis-wash-pink-1.png` and `.webp`
- `crisis-wash-pink-2.png` and `.webp`
- `crisis-wash-green-1.png` and `.webp`
- `crisis-wash-green-2.png` and `.webp`

Pink and green were extracted/recreated from the mockup with the built-in
image generator on transparent backgrounds, resized to 960 × 640, and encoded
as WebP. Variant 2 mirrors the corresponding first brush shape. PNG sources
are retained; the preview loads only WebP. The center stays light enough for
ordinary HTML text, with texture concentrated towards the irregular edges.

## B: thin hand-drawn cards

The card contours are actual transparent raster artwork, not CSS borders:

- `crisis-outline-pink-1.png` and `.webp`
- `crisis-outline-pink-2.png` and `.webp`
- `crisis-outline-green-1.png` and `.webp`
- `crisis-outline-green-2.png` and `.webp`

`draw-card-outlines.cjs` draws two deliberately asymmetric paths with slight
curvature, multiple translucent bristle strokes, and overlapping tapered
ends at four different positions near the center of the top edge, following
the supplied sketch. The two green cards reverse which end sits above the
other. One end stays nearly horizontal while the other lifts gently, without
curling into a hook. The text remains straight. The line is approximately 2 CSS pixels at the
preview's desktop size, with quiet imperfections rather than exaggerated
wobble. The source is rendered to PNG and encoded as lossless WebP so the
thin line and transparency remain intact.

The generator also saves matching `.svg` sources (about 2.4 KB each).
The outline preview now loads these SVG paths inline and animates them with
GSAP core using stroke dash offset. WebP remains the static fallback and is
used for the painted-wash mode. Each outline draws for 1.6 seconds with
`power2.inOut` easing: a gradual start, faster middle, gentle finish. On desktop
cards start 0.16 seconds apart. IntersectionObserver starts each card once
it becomes visible; on mobile cards draw as the visitor scrolls. The tapered
tips appear at the beginning and end of the stroke. Text remains visible
throughout. The replay button starts the sequence again.

With reduced motion enabled, all outlines are immediately visible and the
replay button is hidden. Switching modes kills pending animations. The green
paint behind the intro heading has been removed at the owner's request.

`public/crisis/vendor/gsap.min.js` is an unchanged copy of the existing project
dependency GSAP 3.15.0, with its original license header retained. The local
copy keeps this standalone HTML preview independent of a CDN. A production
React integration should import the existing dependency instead of adding
another copy. No DrawSVGPlugin is required for the current implementation.
Reference: https://gsap.com/docs/v3/Plugins/DrawSVGPlugin/

Regenerate from the repository root:

```sh
node docs/design/crisis-section/draw-card-outlines.cjs
```

Each outline WebP is about 16–18 KB, versus 32–36 KB for PNG. Each painted
wash WebP is about 124–136 KB, versus 732–751 KB for PNG.

## C: painted cards with animated frames (default)

The combined variant starts with static painted fills and visible text.
Only the outline is animated, with the same easing and timing as variant B.
The two pink cards and two green cards retain their diagonal arrangement.

`crisis-fill-pink-1`, `crisis-fill-pink-2`, `crisis-fill-green-1` and
`crisis-fill-green-2` are saved as PNG and WebP in `public/crisis/`.
The outline generation script enlarges each original wash, then clips it
to the corresponding closed SVG contour with its matching reflection.
This keeps the texture but contains its irregular outer brush fringe
inside the card. The original wash and outline assets are retained.

The replay control preserves the selected variant. Fill opacity remains 1
throughout and GSAP targets only the frame strokes and tips. Under reduced
motion both fill and outline are immediately visible.

## Reusable hand-drawn link

The intro link uses a separate irregular underline below its text and a
hand-drawn arrow beside it. The arrow has no underline. The normal text
decoration is disabled; the two decorations remain separate at all widths.

Reusable files in `public/crisis/`:

- `handdrawn-underline.svg`: subtly uneven double-bristle underline.
- `handdrawn-arrow.svg`: irregular shaft and softly asymmetric arrowhead.
- `handdrawn-link.css`: label, underline and arrow layout; ink can be changed
  with `--handdrawn-ink`.
- `handdrawn-link.js`: independent `window.HandDrawnLink.mount(link, { gsap })`
  enhancement, returning `replay()` and `destroy()` methods.

Markup uses an ordinary anchor, a `handdrawn-link__label` span containing
the text and underline image, and a separate `handdrawn-link__arrow` image.
Both SVGs are inlined by the helper; static images remain as fallbacks.
Call `replay()` after mounting to start when the link enters the viewport.
The underline uses the frame's 1.6-second `power2.inOut` easing. The arrow
shaft follows the same easing, followed by its head. Reduced motion shows
all strokes immediately. The replay control also replays the link.

Checked at 322, 600, 960 and 1440px: the underline ends before the arrow,
the arrow has no native underline, and the page has no horizontal overflow.

## Responsive verification

The exported SVG roots also declare `preserveAspectRatio="none"`; scaling
does not depend solely on the preview's inline-SVG setup. SVG requests carry
a preview version to avoid reusing older definitions. This static HTML
preview requires a page reload after source edits; it does not use Next HMR.
At 322 × 656 px, all four frame and fill boxes match the card height. A
stress check with larger headings and longer descriptions grew the cards
from 229px to 363px while keeping all content inside the frame.

The intro is top-aligned with the card grid on wide screens, and the details
link sits under the intro description. Below 1120px the intro moves above the
cards; below 680px the cards use one column. Grid rows accommodate wrapped
text. Inline SVG uses `preserveAspectRatio="none"` so the frame follows the
same card dimensions as the raster fill instead of letterboxing inside it.
The updated layout was checked at 13 widths from 320px to 1920px: no
horizontal overflow, no content outside the drawn frames, and the details
link stays in the intro at every size.

Both controls switch to the correct four assets. All eight displayed assets
load successfully. Pink occupies top left and bottom right; green occupies
the other diagonal. The prototype was checked at 1440 px and 390 px, with no
horizontal overflow and no browser console errors. The mobile layout stacks
the cards. The preview is a standalone public HTML file; the homepage,
CMS and contact data are unchanged.

## Image generation prompts

### Pink wash

Extract/recreate ONLY a SINGLE standalone hand-painted contact-card background wash from this website mockup. Landscape 3:2, broad irregular real brush strokes with subtle bristle grain, soft organically frayed perimeter and asymmetric gently rounded shape. Interior must be very pale, nearly ivory and smooth enough for dark HTML text. Actual TRANSPARENT background outside painted brush shape, no opaque paper rectangle. Preserve the subtle milky translucent gouache brush style of the reference mockup. No rectangular frame or border. ABSOLUTELY NO TEXT, NO LETTERS, NO PHONE ICONS, NO SYMBOLS, NO DRAWINGS, NO DROP SHADOW, NO FURNITURE OR PLANTS. This is an isolated reusable background asset, not a UI mockup. Do not include multiple swatches. Use the PALE BLUSH PINK wash of the top-left contact group, pigment #FABCBC diluted with ivory. The paint should stay very light and gentle, not vivid.

### Green wash

Extract/recreate ONLY a SINGLE standalone hand-painted contact-card background wash from this website mockup. Landscape 3:2, broad irregular real brush strokes with subtle bristle grain, soft organically frayed perimeter and asymmetric gently rounded shape. Interior must be very pale, nearly ivory and smooth enough for dark HTML text. Actual TRANSPARENT background outside painted brush shape, no opaque paper rectangle. Preserve the subtle milky translucent gouache brush style of the reference mockup. No rectangular frame or border. ABSOLUTELY NO TEXT, NO LETTERS, NO PHONE ICONS, NO SYMBOLS, NO DRAWINGS, NO DROP SHADOW, NO FURNITURE OR PLANTS. This is an isolated reusable background asset, not a UI mockup. Do not include multiple swatches. Use the PALE FRESH SAGE GREEN wash of the bottom-left contact group, pigment #A7C7A2 diluted with ivory. The paint should stay very light and gentle, no gray/khaki.
