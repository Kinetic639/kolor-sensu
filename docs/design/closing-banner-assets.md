# Closing banner assets

## Active configuration

- Desktop uses `closing-banner-paint.webp`, green left and soft pink right,
  framed at `120% 100%` and anchored right to shift the color transition left.
- Below 64rem the banner uses `closing-banner-paint-mobile.webp`, green above
  pink, framed at `100% 115%` and anchored bottom so pink begins higher.
- The chair and plants use `closing-banner-chair.webp` with preserved alpha.
- Alternative backgrounds below are retained for future design work. Their
  chronological generation notes describe experiments, not the active layout.

The banner keeps the heading and action labels from the existing closing CTA
CMS settings. Its shared layout lives in `ClosingBanner`; Storybook includes
the default invitation, a short heading, the specialist invitation and long
CMS content.

- `apps/web/public/watercolor/closing-banner-chair.webp`: the supplied
  transparent chair and plants image, converted to WebP with its alpha retained.
- `apps/web/public/watercolor/closing-banner-paint.webp`: generated using the
  built-in image generation tool, then encoded as WebP. Sage on the left blends
  into blush on the right, with broad visible brush strokes and no botanicals.

## Initial desktop prompt (superseded)

Generate a production-ready background texture for a refined psychotherapy website banner. Very wide landscape 6:1 composition, a horizontal swath of hand-painted pastel paint on warm off-white paper #faf8f3. Match this exact visual direction: LEFT quarter pale muted pastel sage green #d7dfc9 fading into warm ivory in the left-center, RIGHT two-thirds pale warm salmon blush pink #f6c9c1 with slightly richer pastel coral #efb4ad on the far right. The sage and pink merge softly in the middle, no hard seam. Thick broad sweeping horizontal and gently diagonal brush strokes, visible flat-brush bristle streaks and dry-brush dragged paint, layered milky opaque gouache with subtle paper texture and broad edges like a large painter's brush. Bold long brush gestures rather than watercolor spots. Top and bottom contour irregular hand-brushed and feathered into the surrounding ivory paper, the painted band covers most of the canvas height, no generous blank border. Center-right remains pale enough for dark text. Warm soothing elegant handmade tactile design. Strictly background paint texture only: NO splatters, NO speckles, NO blotches, NO isolated watery puddles, NO leaves, NO branches, NO botanical drawings, NO flowers, NO furniture, NO text, NO symbols, NO shadows. Flat scan, not 3D.

## Mobile background

`apps/web/public/watercolor/closing-banner-paint-mobile.webp` is a separate
portrait asset generated with the built-in image generation tool and encoded
as WebP. It is used below 64rem, where the banner stacks vertically: sage at
the top, blush at the bottom, with the same broad brush strokes. Desktop
continues to use the horizontal asset.

### Initial mobile prompt (superseded)

Generate a portrait 2:3 background texture for the MOBILE version of a refined psychotherapy website banner. Hand-painted pastel gouache on warm off-white paper #faf8f3. TOP third pale muted pastel sage green #d7dfc9, softly merging through a warm ivory transition in the middle, BOTTOM half pale warm salmon blush pink #f6c9c1 with slightly richer pastel coral #efb4ad towards the bottom. The green is above the pink, NOT side by side. Match a handmade thick broad-brush painting: long sweeping horizontal and gently diagonal flat-brush strokes, visible bristle grooves, dry-brush dragged edges, milky opaque layered pastel paint, subtle paper texture. Broad continuous strokes, never watery spots. Irregular organically brushed outer contours fading into the ivory paper, painting occupies nearly the full canvas with no generous blank border. Keep the middle pale for dark HTML text readability. Texture only: NO text, symbols, leaves, branches, plants, flowers, furniture, people, splatters, speckles, blotches, isolated puddles or decorative drawings. Flat scanned paint, not 3D. Warm calming palette consistent with the desktop sage-green-to-blush-pink banner.

## Current palette and texture revision

Both backgrounds were regenerated with the built-in image tool using
`offer-sage-1.png` and `offer-pink-1.png`, the actual Why Us card textures,
as visual references. Target pigments are fresh green `#A7C7A2` and rose
`#FABCBC`. The current assets use translucent watercolor layers and broad
brush strokes rather than opaque impasto. The file paths above still apply.

### Current desktop prompt

Edit the FIRST image, the existing wide horizontal banner background. The second image is the GREEN CARD STYLE reference, the third is the PINK CARD STYLE reference. Preserve the wide landscape composition. Fresh green occupies the LEFT quarter, softly merges into pale white-green at left-center, and rose pink occupies the RIGHT half. Soft blend through the middle, seamless continuous hand-painted band extending edge to edge. Ragged painted top and bottom edges gently dissolve into paper. Keep middle pale enough for dark HTML text. Use the supplied green and pink reference card textures as the primary style reference. Match their translucent layered watercolor brush strokes, visible paper grain, broad diagonal overlapping strokes, softly ragged brush edges, pigment pooling along some stroke edges, delicate washed lighter centers and richer tinted edges. Replace the previous thick opaque gouache / oil paint texture entirely: no raised ridges, no impasto. Color direction is CRITICAL: cheerful fresh pastel botanical green #A7C7A2, absolutely no grey, khaki, olive, beige green or dull yellow tint; paired with true soft rose pink #FABCBC, absolutely no peach, orange or salmon tint. Mix these exact target colors with white for translucent light washes; retain enough fresh green and rose saturation to match the reference cards. No text, plants, twigs, branches, flowers, furniture, drawings or symbols. Do not add large splashes, circles, dots or isolated droplets from the reference cards. No hard frame. Paint texture only on off-white #F8F7F3 paper, flat scanned watercolor.

### Current mobile prompt

Edit the FIRST image, the existing portrait mobile banner background. The second image is the GREEN CARD STYLE reference, the third is the PINK CARD STYLE reference. Preserve PORTRAIT 2:3 composition. Fresh green occupies the TOP third, merges softly through a pale white center, rose pink occupies the BOTTOM half. Colors must run vertically GREEN ABOVE PINK, not side by side. Entire shape is one continuous connected painted patch, irregular softly feathered outer brush edges. Keep middle pale enough for dark HTML text. Use the supplied green and pink reference card textures as the primary style reference. Match their translucent layered watercolor brush strokes, visible paper grain, broad diagonal overlapping strokes, softly ragged brush edges, pigment pooling along some stroke edges, delicate washed lighter centers and richer tinted edges. Replace the previous thick opaque gouache / oil paint texture entirely: no raised ridges, no impasto. Color direction is CRITICAL: cheerful fresh pastel botanical green #A7C7A2, absolutely no grey, khaki, olive, beige green or dull yellow tint; paired with true soft rose pink #FABCBC, absolutely no peach, orange or salmon tint. Mix these exact target colors with white for translucent light washes; retain enough fresh green and rose saturation to match the reference cards. No text, plants, twigs, branches, flowers, furniture, drawings or symbols. Do not add large splashes, circles, dots or isolated droplets from the reference cards. No hard frame. Paint texture only on off-white #F8F7F3 paper, flat scanned watercolor.

## Restored brush texture (current banner)

The banner uses the earlier dense brush-stroke textures recolored to fresh
pastel green `#A7C7A2` and rose `#FABCBC`, generated through a color-only edit
with the built-in image generation tool. The active paths remain
`closing-banner-paint.webp` and `closing-banner-paint-mobile.webp`.

The watercolor alternatives are preserved for future use in
`apps/web/public/watercolor/closing-banner-paint-watercolor.webp` and
`apps/web/public/watercolor/closing-banner-paint-mobile-watercolor.webp`.

### Current desktop edit prompt

undefined

### Current mobile edit prompt

undefined

## Desktop green saturation refinement

The desktop brush texture received a further green-only edit using the Why Us
sage card as a palette reference. Its green midtones are more saturated and
closer to `#A7C7A2`; the mobile asset and archived watercolor versions remain
available. Active desktop file: `apps/web/public/watercolor/closing-banner-paint.webp`.
The built-in image generation edit used this prompt:

Edit FIRST image: the desktop banner painted background. SECOND image is a reference ONLY for the fresh green pigment hue and saturation from the website's Why Us cards. STRICTLY preserve the FIRST image's dense broad dry-brush / gouache texture, every stroke, bristle groove, layering, composition and feathered edges. Do NOT copy the second image's watercolor texture or splatters. Change ONLY the GREEN LEFT THIRD. Its present gray beige olive cast must be removed completely. Make it noticeably fresher, livelier and more colorful: clean soft botanical spring green with #A7C7A2 as the MIDTONE PIGMENT, not a nearly-white tint. Pigmented ridges can be #83B982, lit strokes #C3DEBC, shadows remain green not gray. Increase green chroma substantially while preserving brightness and all brush texture detail. No yellow/khaki, no gray/desaturated sage, no muddy beige. The green patch should feel as joyful and fresh as the reference card's green while still gentle pastel. Keep the pale central transition, original off-white paper and ENTIRE RIGHT PINK HALF PIXEL-FAITHFUL, same pink hue and saturation, no recolor there. Preserve wide landscape orientation. No new shapes, leaves, branches, text, furniture, dots or ornament.

## Desktop pink refinement (current)

A localized built-in image generation edit restores the previous softer pink
while retaining the approved fresh green and brush texture. Active asset:
`apps/web/public/watercolor/closing-banner-paint.webp`. The brighter-pink
alternative is retained as `closing-banner-paint-brighter-pink.webp`.

### Edit prompt

Precise localized COLOR-ONLY edit. FIRST image is the CURRENT desktop banner: preserve its ENTIRE LEFT GREEN THIRD exactly, the green is approved, do not change its hue, saturation, brightness or texture. SECOND image is the PREVIOUS banner: use ONLY its RIGHT PINK HALF as a color reference. Restore the FIRST image's right pink paint to the SECOND image's gentler, lighter, less vivid muted pastel blush pink. The current pink is too bright/saturated: match the previous image's quieter pink and its tonal distribution faithfully. Retain every original dense broad brush stroke, fine bristle ridges, opaque gouache texture, pale center transition and paper background. No shape changes, no new texture, no watercolor washes, no objects, no text. Do not let the reference image affect the approved current green. Same wide landscape dimensions.

## Alternate desktop: pink left, green right

`apps/web/public/watercolor/closing-banner-paint-pink-left.webp` is a separate
variant generated with the built-in image tool. It swaps the approved color
placement while retaining the broad brush texture. The original banner asset
is preserved. Desktop CSS currently selects this alternate for comparison;
mobile continues to use the vertical background.

### Variant prompt

Create an alternate version of this approved wide desktop banner background by SWAPPING THE TWO PAINT COLORS ONLY. LEFT third should now be the exact gentle soft pale blush PINK currently on the right. RIGHT half should now be the exact fresh pastel GREEN currently on the left. Keep the soft pale ivory blending transition in the middle. Preserve the approved image's overall lightness, each color's saturation and hue, broad dry-brush strokes, fine bristle grooves, dense milky gouache texture, paper grain, organic feathered edges and landscape proportions. Do not brighten or intensify the pink; keep it delicate. Do not desaturate or gray the green; retain its freshness. No change of texture, no watercolor washes or blotches. Texture only: no text, plants, branches, furniture, icons or added objects. This is a separate alternate color-layout asset, not a new design.

## Current desktop: one-third pink, two-thirds green

The desktop banner now uses
`apps/web/public/watercolor/closing-banner-paint-pink-third.webp`. The transition
is near one third of the width so the heading sits over a continuous green
area. Earlier versions are retained. Generated with the built-in image tool.

### Prompt

Edit this wide painted website banner background. Change ONLY the relative WIDTHS OF THE COLOR REGIONS: pink must occupy the LEFT ONE THIRD (0-30% of total width), a narrow soft blending transition centered at 33% (approximately x=30%-37%), then the approved pastel GREEN must occupy the RIGHT TWO THIRDS (37%-100%). The color transition must be distinctly left of center, NOT in the middle. The entire central text area, from x=40% to x=75%, must be a consistent pale fresh green with gentle texture and NO pink-to-green hue boundary, so dark text is easier to read. Keep the reference image's approved gentle pink hue and fresh green hue, same brightness and saturation. Preserve dense broad dry-brush / gouache strokes, bristle grooves, paper grain, irregular feathered top and bottom edges, and wide landscape proportions. Only move the blending zone to one-third of width and extend green across the rest. No new objects, text, leaves, botanical drawings, splatters, watercolor puddles or new texture style.

## Current desktop: organic direct color blend

`apps/web/public/watercolor/closing-banner-paint-organic-blend.webp` is the
current desktop background. Pink and green brush strokes interlock near the
one-third boundary without an ivory separator. Prior variants remain in public.
Generated with the built-in image generation tool.

### Prompt

Edit this approved desktop banner background ONLY in the narrow color blending region around x=one-third. Preserve the approved pale pink LEFT third, fresh green RIGHT two-thirds, their hues and saturation, the broad dry-brush gouache texture and fine bristle grooves, paper background and overall wide landscape shape. TWO REQUIRED FIXES: (1) Remove the pale white/ivory vertical stripe between the colors completely. Pink pigment must meet and overlap green pigment DIRECTLY, with color present throughout the transition, never fading through a white blank strip. No ivory/white separator, no washed-out central stripe. (2) Make the junction organically IRREGULAR rather than a straight regular vertical boundary. Let broad diagonal brush strokes interlock like fingers: pink strokes extend different distances rightwards and green strokes sweep different distances leftwards, with staggered soft irregular brush tips across the full height. The boundary should meander around one-third, e.g. 27%-37% at different heights. Pink and green remain distinct color families, with only a narrow gently mixed overlap; avoid muddy brown or gray. The center/right text zone starting x=40% stays continuous pale green for readability. Retain feathered outer top and bottom edges and the tactile long painted strokes. No objects, text, plants, decorative drawings, splatters or isolated watercolor blotches.

## Current desktop: soft organic blend

Current asset: `apps/web/public/watercolor/closing-banner-paint-soft-blend.webp`.
This built-in image-generation edit uses the earlier pink-third texture as its
baseline, with a soft direct blend near one-third instead of the sharper
interlocking edge. Previous variants remain available.

### Prompt

Refine this desktop banner background with a very restrained localized edit. This FIRST supplied image is the earlier approved SUBTLE TEXTURE baseline: preserve its original quiet low-contrast fine brush grain, smooth milky painted surface, stroke detail, approved pink and green hues, brightness, saturation and feathered outer edges. Do NOT increase texture contrast, sharpness, raised ridges, pigment thickness, roughness or brush visibility anywhere. Only improve its color transition near x=one-third. Replace the ivory/white separator with a SOFT DIFFUSE DIRECT PINK-TO-GREEN BLEND: a gentle air-soft painterly feathering where the two pastel pigments dissolve into each other, without a visible edge, without interlocking sharp tips, without a zigzag seam. The blending zone should have an irregular gently meandering position centered near 33% of width, occupying approximately 26%-39%, with soft irregular translucent overlapping brush veils. Keep color in this overlap: no white or cream stripe, no gap, no pale vertical divider. Avoid muddy brown or gray. Pink occupies roughly the left third; green occupies roughly the right two-thirds. From x=40% rightwards maintain uniform gentle green for dark text readability. This is NOT a new painting: preserve the original subtle texture rather than making bold new strokes. Wide landscape, no text, objects, plants, symbols, splatters or extra decoration.

## Current desktop: irregular soft color transition

Active asset: `apps/web/public/watercolor/closing-banner-paint-irregular-soft.webp`.
The soft transition now meanders visibly across the height rather than forming
a vertical strip. Earlier variants are retained. Built-in image generation edit.

### Prompt

Correct ONLY the geometry of the color transition in this desktop painted background. The current near-vertical divider is WRONG. The transition MUST visibly wander SIDEWAYS across the height in an asymmetric broad organic S-shaped cloud with large staggered paint sweeps. Concrete geometry: at the TOP the pink-to-green transition is around x=22% of total width; at y=25% it sweeps right to x=36%; near mid-height it recedes LEFT to x=26%; at y=75% a broad pink sweep extends right again to x=37%; at the BOTTOM it recedes to x=24%. Thus green intrudes deep into pink in some bands and pink extends into green in others. Do NOT produce a straight or roughly vertical strip, even a blurred one. The irregularity must be large enough to remain obvious when displayed as a shallow wide website banner. These interpenetrating shapes have VERY SOFT diffuse feathered edges, not hard tips, not a jagged zigzag, not a drawn line. Pink and green blend directly; NO white/ivory vertical separator or blank stripe. Preserve the original approved gentle pink and fresh green, the subtle fine low-contrast broad-brush texture, and exact lightness everywhere else. Do NOT increase texture contrast, add ridges or make brush marks sharper. Pink remains roughly the left third overall, green the right two-thirds. Keep x=40%-100% continuously green behind the heading. Maintain wide landscape ratio, quiet tactile paint, feathered outer edges. No new objects, text, flowers, branches, splatters or decorations.

## Current selection restored

Desktop again uses the preserved closing-banner-paint.webp: green on the left, soft pink on the right. All comparison variants remain available.

### Current desktop framing

The approved original is displayed at 120% width, anchored right, to move its transition left and give pink more of the visible banner. The source image is unchanged.
