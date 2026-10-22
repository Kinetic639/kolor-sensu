# CMS: fixed routes, predefined content only

## Correction note

An earlier phase built a generic, page-builder-style CMS (`cms_pages`,
`cms_page_sections`, arbitrary slugs, a section-type-driven renderer, a
create/delete-page admin UI). That was the wrong shape for this product and
has been fully removed via forward migrations
(`20260920100949_remove_generic_cms_page_builder.sql`,
`20260920101005_site_content_foundation.sql`) — dropped, not edited in
place, since there was no valuable production data in it. This document
describes the corrected, current model only.

## Hard product rule: the public site's structure is code-owned

Next.js owns routes, page structure, component hierarchy, section
ordering, and layout. The CMS never creates pages, sections, or routes —
it only edits predefined, typed content fields inside fixed pages that
already exist in code. There is no "create page," no arbitrary slug entry,
no block/section picker, and no page-builder UI anywhere in the admin app.

## Current routes

- `/` — Home. A real, fixed Next.js route (`apps/web/src/app/page.tsx`).
- `/specjalisci` — Specialists. A real, fixed Next.js route
  (`apps/web/src/app/specjalisci/page.tsx`).

That is the entire public route surface today. `/o-nas`, `/oferta`,
`/cennik`, `/kontakt`, blog/articles, and any other page are explicitly out
of scope for this phase — see "Future extension" below for how a new fixed
page gets added later without reintroducing a page builder.

## Current CMS content: Home only

The only thing the CMS currently manages is one typed content contract for
Home — `HomePageContent` (`heading`, `body`, an optional `buttonLabel`) —
defined with `homePageContentSchema` in `packages/contracts/src/cms.ts`
(`z.strictObject(...)`: unknown fields are **rejected**, not silently
stripped). `/specjalisci` has **no** CMS content at all — see "Domain
separation" below.

## Data model: `site_content`

```
site_content
  key                text PRIMARY KEY CHECK (key IN (...))  -- the list below
  draft_payload       jsonb NOT NULL
  published_payload   jsonb            -- null until first publish
  published_at        timestamptz
  created_at / updated_at
```

The set of keys is a hard database-level guarantee, not a UI convention
(`home` for the home hero, `rooms` for /gabinety's section switches,
added in `20260927201414_site_content_rooms_page.sql`, `support_areas` for
the homepage's areas of help, added in
`20261013150000_support_areas.sql`, `home_sections` for which specialist
sections the homepage shows, added in `20261013180000_home_sections.sql`,
`first_steps` and `home_headers` for the homepage's sections' headers,
added in `20261014090000_home_headers.sql`, and the keys added since
(below);
each key's payload shape is checked by
`private.site_content_payload_is_valid`):
`admin` has **no `INSERT` grant at all** on this table (each row
is seeded once by migration, same pattern as `center_settings`/
`center_public_profile`), so not even Admin can create a second/arbitrary
CMS entry — proven by DB test G, which fails at the grant layer before any
`CHECK` would even run.

This is a **tightly-scoped, Zod-validated JSON payload for one fixed page**
— not the arbitrary page-builder blob the product explicitly rejects.
`draft_payload`/`published_payload` shape is defense-in-depth-checked at
the DB level (`jsonb_typeof(...) = 'object'` plus required key presence)
and fully validated (types, `buttonLabel` optionality, unknown-key
rejection) by `homePageContentSchema` at the application boundary — the DB
CHECK cannot express "no extra keys"; the Zod schema does.

## Draft/published semantics

Admin edits `draft_payload` directly and freely; `published_payload` is
**only** ever written by `publish_site_content(key)` — one atomic `UPDATE
site_content SET published_payload = draft_payload, published_at = now()
WHERE key = p_key`, admin-gated the same way every other privileged RPC in
this codebase is (`has_role('admin')` check, `RAISE EXCEPTION` on
failure). Editing the draft after a publish never touches
`published_payload` — proven live by DB test E (publish, edit the draft
again, confirm `published_payload` still shows the earlier content).
Unpublishing isn't implemented in this phase (not asked for); the
supported states are "never published" (`published_payload IS NULL`) and
"published" (edits accumulate in the draft until the next publish).

## Public vs. Admin read model

`anon` gets a **column-restricted** grant:
`GRANT SELECT (key, published_payload, published_at) ON site_content TO
anon`, gated by `USING (published_payload IS NOT NULL)`. `draft_payload`
is not a grantable column for `anon` at all — a direct `SELECT
draft_payload` as `anon` raises a permission error, not an empty result
(proven by DB test C). `authenticated` gets full-column `SELECT`/`UPDATE`,
gated to `has_role('admin')` — specialists have zero CMS access (proven by
DB test B: their `UPDATE` matches 0 rows via RLS, their `SELECT` returns
nothing).

## SEO

`apps/web/src/app/page.tsx` exports `generateMetadata()` sourcing
`title`/`description` from the published `HomePageContent` (falling back
to the static site title when nothing is published yet). No client
JavaScript is required to produce the `<title>`/meta tags — proven by
`tests/e2e/cms-domain.spec.ts`'s raw-HTML `<title>` assertion.

## SSR/RSC and cache/revalidation strategy

Both `/` and `/specjalisci` are plain Server Components with no
`cookies()`/`headers()` use, so Next.js keeps them on the static/full-route
-cache path by default. `apps/admin`'s `publishHomeContentAction` calls a
secured cross-app webhook (`apps/web/src/app/api/revalidate/route.ts`,
shared `CMS_REVALIDATE_SECRET`, never `NEXT_PUBLIC_`) with `path: "/"` —
the only path this domain ever revalidates. This is unchanged in mechanism
from the prior phase; only the caller's payload got simpler (no more
slug-to-path resolution, since there's exactly one revalidatable target).

## Preview

`apps/admin/src/app/(protected)/cms/preview/page.tsx` is a **fixed** route
(no dynamic segment), inheriting the existing `requirePortalRole()` admin
guard already applied to every route under `(protected)/`. It renders the
**draft** payload through the shared `TestContentBlock` component
(`packages/ui/src/test-content-block.tsx`) — the same component the public
site uses for the published content, so preview and production rendering
never drift.

## Preview on the site (issue #109)

"Podgląd" in each CMS page's bar (`features/cms/page-publish-bar.tsx`)
opens that page of the site in a new tab, showing the **saved drafts** of
every CMS section, the page's metadata (title, description) included, as
the page will look once published. Editing a section and saving it
refreshes the open preview within a few seconds.

- **Way in**: the link goes to the portal's `/podglad?strona=<page>`
  (`apps/admin/src/app/podglad/route.ts`, admins only: it checks the role
  itself, a route handler having no layout). It signs a token for the
  page's path on the site (`features/cms/preview.ts`: `glowna` → `/`,
  `gabinety` → `/gabinety`) and redirects to the site's
  `/api/preview?token=…`. The token (`@repo/app-runtime/cms-preview`) is
  `v1.<payload>.<signature>`: the payload `{ path, exp }`, the signature an
  HMAC-SHA256 with `CMS_PREVIEW_SECRET`, shared by web and admin,
  server-only. It lives 2 minutes (made on the click). The site checks the
  signature (in constant time), the expiry and the path (a path on the site
  only: no scheme, host, `//`, backslash or spaces, so no open redirect),
  turns on Next's **Draft Mode** and redirects to the path. A bad or
  expired token changes nothing (401).
- **Drafts are read on the site's server only.** In Draft Mode the loaders
  of `apps/web/src/lib/public-data.ts` read with `createReadClient()`
  (`lib/preview.ts`): the usual public client, registered with
  `withSiteContentDrafts(client, reader)` (`packages/supabase/src/cms.ts`).
  `getPublished` (behind every `getPublished*` and every
  `contentSection(...).published`) then returns the section's draft, read by
  `readSiteContentDraft` through `get_site_content_draft(key)` with the
  service-role key (`SUPABASE_SECRET_KEY`), validated by the same schema;
  every other read stays on the public client, under RLS. A new section or
  page metadata stored in `site_content` and read through `getPublished`
  and a `load(...)` loader gets the preview without more code.
- **Database**: `20261019120000_site_content_drafts_preview.sql` adds
  `get_site_content_draft(key)` (the draft, or null) and
  `get_site_content_draft_version()` (the latest `updated_at`), both
  executable **only by `service_role`**: never `anon`, never
  `authenticated` (an admin's portal reads drafts through the table, as
  before). Tests: `supabase/tests/site_content_drafts.sql`.
- **Visitors are unaffected**: `draftMode()` reads as off while pages are
  prerendered, so they stay prerendered and revalidated as before. A Draft
  Mode request is rendered afresh (Next skips its caches, `Cache-Control:
private, no-store`), carries `noindex` (a meta tag from the preview bar,
  and `X-Robots-Tag` on production for requests with Draft Mode's cookie)
  and shows a fixed bar "Podgląd szkicu — zmiany nie są opublikowane" with
  "Zakończ podgląd" (a form posting to `/api/preview/exit`, which turns
  Draft Mode off and returns to the same page, as published).
- **Live refresh**: the bar (`components/preview-bar-view.tsx`) asks
  `/api/preview/version` every 3 seconds (only in Draft Mode; paused while
  the tab is hidden) and calls `router.refresh()` when the version moves.
  Polling is the simplest thing that works across the portal's and the
  site's domains with nothing new to install; a Realtime subscription would
  need the drafts' table exposed to the browser.

The older portal page `/cms/preview` ("Preview" above) renders only the
first test content and predates this.

## Admin CMS UI

`/cms` has one tab per page of the public site, in the address
(`/cms?strona=glowna|gabinety`, `features/cms/page-params.ts`), in the
portal's compact style (the same pieces as Ustawienia: `DetailTabs`,
`DetailSection`, switch rows, a save at the end of each form). A tab lists
that page's sections top to bottom: those with settings show them, those
whose content lives in the site's code show as "treść stała", so the whole
page reads in order. Each section saves its own draft; a bar over the
sections shows the page's status (published, unpublished changes, the
latest publish and edit) and its one "Publikuj stronę", which publishes
every section of the page at once and refreshes it on the site. A section
whose settings cannot load says so; the rest keeps working.

There is no create-page button, no slug field, no section type picker:
the pages and their sections are code's; adding a page's settings means a
new site_content key and a new tab.

## Home → Obszary wsparcia (`support_areas`)

The homepage section "W czym możemy pomóc" (`SupportAreas`, small circles
around a large one) is code-owned; the CMS edits only its list of areas.

- **Payload** (`supportAreasContentSchema`, `packages/contracts/src/cms.ts`):
  `{ areas: [1..10 × { id, title ≤60, lead ≤240, imagePath | null,
imageAlt, link: { href, label } | null }] }`. Ids are unique; `href` is a
  path within the site (starts with one `/`, no spaces), so no outside or
  `javascript:` links. The database checks the list's length and each
  area's `id`/`title`/`lead`; the schema checks the rest.
- **Photos**: the public `site-media` bucket (5 MB, JPG/PNG/WebP), under
  `support-areas/<uuid>.<ext>`; only admins insert, update or delete (RLS on
  `storage.objects`), anyone reads by URL. Each upload gets a new name, so a
  draft never changes the file the published areas show.
- **Draft/publish** as for the other keys. The migration seeds a starting
  draft and publishes nothing; until the first publish the site shows its
  own areas (`defaultSupportAreas` in `apps/web/src/content/site.tsx`).
- **Admin**: `/cms` → Strona główna → "Obszary wsparcia": add, remove and reorder
  areas, upload a photo, set an optional link, save the draft, publish.
  Publishing revalidates `/`.
- **Tests**: `supabase/tests/support_areas.sql` (who may read, edit,
  publish and upload; malformed lists refused).

## Home → specialist sections (`home_sections`)

Two homepage sections show on their own switches, so the admin can show
either or both: "Poznaj nasz zespół" (every specialist on the site, as
cards) and "Z kim porozmawiasz" (`SpecialistSpotlight`: one chosen
specialist presented at length).

- **Payload** (`homeSectionsContentSchema`): `{ showSpecialists, spotlight:
{ visible, specialistId | null, imagePath | null, imageAlt } }`. A visible
  spotlight needs a specialist. Both sections' headers are among the
  homepage's headers (`home_headers`, below).
- **The specialist** is read from the Specialist Domain on the site; if the
  chosen one is not on the site (inactive, or no published profile), the
  section simply does not show. Name, role, bio and facts come from the
  profile; the CMS adds only the header around it and, optionally, its own
  photo (`site-media/spotlight/…`, ideally a cut-out portrait on a
  transparent background, like the cards'), else the profile's portrait.
- **Until the first publish**: the team shows, the spotlight does not
  (`defaultHomeSections`). The migration seeds that draft with the usual
  texts filled in.
- **Admin**: `/cms` → Strona główna → "Z kim porozmawiasz" and "Poznaj
  nasz zespół" (one form, one draft). Publishing the page revalidates `/`.
- **The payload check is total**: since `20261013180000_home_sections.sql`
  `private.site_content_payload_is_valid` returns `COALESCE(…, false)`. A
  missing field used to make it NULL, and a `CHECK` passes on NULL, so a
  payload missing e.g. `areas` or a /gabinety switch was accepted.
- **Tests**: `supabase/tests/home_sections.sql`.

## Home → Pierwszy krok (`first_steps`)

The homepage band "Pierwszy krok" (`FirstSteps`: four steps of starting
therapy on a brush stroke that paints itself with scroll) is code-owned,
with its wave, icons and animation; the CMS sets whether it shows and the
steps' words. Its header is among the homepage's headers (`home_headers`).

- **Payload** (`firstStepsContentSchema`): `{ visible, steps: exactly 4 ×
{ title ≤40, text ≤200 } }`. The database checks the switch and that
  there are four steps each with a title and a text.
- **Until the first publish** the band shows with the site's own words
  (`defaultFirstSteps`); the migration
  (`20261013200000_first_steps.sql`) seeds the same as the draft.
- **Admin**: `/cms` → Strona główna → "Pierwszy krok". Published with the
  page.
- **Tests**: `supabase/tests/first_steps.sql`.

## Home → the sections' headers (`home_headers`)

Nearly every homepage section opens with an eyebrow, a title, a
description and sometimes a call to action. The CMS edits them in one
shared format (`sectionHeaderSchema`, `packages/contracts/src/section-header.ts`;
drawn by `SectionHeader`, see the design system): **words and colours,
never the markup**. Each section's heading level (one `h1`, in the hero;
section titles `h2`), its size, the order of the sections and of the
header's parts are code's, and no field of the payload can change them.

- **Payload** (`homeHeadersContentSchema`): one header per section, in the
  page's order: `supportAreas`, `firstSteps`, `spotlight`, `specialists`,
  `rooms`, `story`, `newsletter`, `location`, with `whyUs` after
  `supportAreas` (the homepage has no questions and answers: they are on
  Kontakt and Oferta). A header is `{ eyebrow: { text ≤60, tone },
title: 1..2 lines × runs of { text, tone } (≤100 together), description:
runs of { text, link | null } (≤300, at most one link), cta: { label ≤40,
href, style } | null }`. Tones are `default | green | pink` (the theme's;
  the site picks the shade readable at each size), links and calls to
  action go only to the pages in `SITE_PAGES` or to booking a chosen
  service (`/umow-wizyte?usluga=<slug>`: the booking page sends the client
  to the service's questionnaire first when it has one, so the link stays
  right when the admin attaches or detaches one; the CMS lists the services
  clients can book online), styles are `button |
outline | arrow`. The database checks the shape, the tones and styles,
  the one link and that every section is there
  (`private.section_header_is_valid`); the schema checks the rest.
- **The move**: the migration built the headers from the site's own words,
  taking "Pierwszy krok"'s and "Z kim porozmawiasz"'s eyebrow, heading and
  description from their payloads (draft into draft, published into
  published, so the site showed the same after it) and removing them there.
- **Until the first publish** the site shows its own words
  (`defaultHomeHeaders`).
- **Admin**: `/cms` → Strona główna: every section with a header has a
  "Nagłówek" block at its top (`features/cms/header-block.tsx`): the
  eyebrow and its colour, the title's lines (a click on a word cycles its
  colour), the description with "Zrób link z zaznaczenia" (the link's page
  and colour), the call to action, a preview in the site's colours, and
  "Zapisz nagłówek", which saves that section's header into the draft. The
  page bar publishes them with the rest.
- **Tests**: `supabase/tests/home_headers.sql`.

## Home → the sections added on 18.10

Four keys, each saved as a draft and published with the page:

- **`why_us`** ("Dlaczego my", under the areas of help):
  `{ visible, facts: 2..4 × { title ≤60, text ≤200 } }` (`whyUsContentSchema`).
  Hidden until published, so the facts the centre stands by are approved first.
- **`newsletter_band`** (the newsletter band, after "Jak zacząć"):
  `{ visible }`; its words are its header, the sign-up form sits under
  them and in the footer while it is visible (newsletter-domain.md).
- **`home_location`** ("Gdzie jesteśmy", before the closing invitation):
  `{ visible }`; its header is the CMS's, the address, phone, e-mail and
  hours are the company details (the card Kontakt shows). Shown from the start.
- **`crisis_help`** (the crisis strip, before "Gdzie jesteśmy"):
  `{ heading ≤80, text ≤200, lines: 1..6 × { number, label ≤80, detail ≤80 } }`,
  a number being digits and spaces with a plus only in front (checked by the
  database too). Always shown: the admin approves the words and numbers but
  cannot hide the strip; until published, the site shows 112 first, then the
  support lines. Every number is a `tel:` link.

The database refuses each of them in the wrong shape
(`private.site_content_payload_is_valid`), and reading the stored headers
fills in the new sections' headers with the site's own words until the
migration has added them.

## Home → the words that moved from code (19.10)

`20261019090000_home_texts.sql`; tests `supabase/tests/home_texts.sql`.

- **`home`** (the hero) gains `eyebrow ≤80`, `accent ≤80` (the title's
  green line), `secondaryLabel` ("Poznaj nas"), `points: 0..4 × { label
≤40, icon }` (icon one of leaf, users, house, heart, shield, sparkles;
  the heart is pink) and `imagePath`/`imageAlt` (a photo in the site-media
  bucket, folder `hero`). Each defaults to the site's words, so a hero
  saved before them reads and shows as it did; an empty eyebrow or accent
  is not shown. The buttons' addresses stay in code.
- **`home_thoughts`** ("Myśli, które się odmieniają"): `{ label ≤120,
pairs: 8..40 × { negative ≤40, positive ≤60 } }`: each difficult thought
  with the kinder one it turns into when pointed at; the admin edits one
  row per pair. Until 19.10 it was two lists (`negative`, `positive`)
  dealt out in turn; `20261019110000_home_thought_pairs.sql` converted the
  rows, pairing them as the site showed them (`pairLegacyThoughts`), and a
  row still in the old shape reads as pairs
  (`storedHomeThoughtsContentSchema`).
- **`home_story`** ("Jak zacząć"): `{ steps: 1..4 × { heading ≤80,
text ≤400, cta: { label, href (a path on the site) } | null, imagePath,
imageAlt } }`; a step without its own photo takes one of the site's.

Until published, the site shows the contracts' defaults
(`defaultHomeThoughts`, `defaultHomeStory`, `defaultHeroPoints`).

"Zajrzyj do środka" has no content of its own: it shows the rooms' photos
from the Rooms domain (as /gabinety does) under the CMS's `rooms` header,
and is left out while no room has a photo. The crisis strip's numbers also
fill `/pomoc-w-kryzysie`, linked from every page's footer.

## Every page → search and sharing (`seo_<page>`, 19.10)

`20261019130000_page_seo.sql`; tests `supabase/tests/page_seo.sql`.

- **Pages**: every static page with a tab in `/cms` (`SEO_PAGES`,
  `packages/contracts/src/cms-seo.ts`): home, about (/o-nas), offer,
  specialists, prices, rooms, workshops, education, contact, booking,
  crisis_help, privacy, terms, cookies. Pages whose content is all code
  (all but Strona główna and Gabinety) have a tab with only this section.
- **Payload** (`pageSeoContentSchema`): `{ title ≤120, description ≤320,
ogTitle ≤120, ogDescription ≤320, ogImagePath | null, ogImageAlt ≤200,
noindex }`. Every text may be empty: the page's own (`SEO_PAGES`), the
  share texts falling back to the search ones; a picture needs its alt
  text. The title is whole (the site adds nothing to it). The database
  checks every field's type and length (`private.page_seo_is_valid`).
- **Site**: each page's `generateMetadata` is `pageMetadata(page)`
  (`apps/web/src/lib/page-metadata.ts`), read through `getPageSeo` →
  `getPublishedPageSeo` (the generic published read, so the draft preview
  covers it). A picture (site-media, folder `seo`) replaces the page's
  generated `opengraph-image` (Next adds the file's only when the page
  sets no `openGraph.images`). `noindex` sets `robots: noindex` and leaves
  the page out of `sitemap.xml`.
- **Admin**: "Wyszukiwarka i udostępnianie" first in each tab: fields with
  counters (Google shows ~60 characters of a title, ~160 of a
  description), a Google result preview and a shared-link card preview.
  Saved as a draft, published with the page (which also refreshes the
  sitemap). Until published, every page keeps its own.
- **Not here**: a service's and a specialist's page take their title and
  description from their record.

## Every page → shared settings (`site_appearance`, issue #111, 19.10)

`20261019140000_site_appearance.sql`; tests `supabase/tests/site_appearance.sql`.

- **What**: how components used on many pages look, in its own `/cms` tab,
  "Ustawienia wspólne" (`?strona=wspolne`, after the pages). For now one
  group, "Wygląd komponentów · Zdjęcie z akwarelą": the painted photo
  (`WatercolorImage`) on the homepage (hero, the scroll story), /o-nas,
  /oferta/[slug], /warsztaty and /kontakt.
- **Payload** (`siteAppearanceContentSchema`,
  `packages/contracts/src/cms-appearance.ts`): `{ watercolorBackdropPath |
null, watercolorParallaxPath | null }`, each ≤300 characters, images in
  site-media (folder `appearance`). No backdrop is the site's own
  (`/watercolor/watercolor-background.webp`); no parallax layer, none.
- **Site**: `getWatercolorLook` (`apps/web/src/lib/public-data.ts`) reads
  `getPublishedSiteAppearance` (the generic published read, so the draft
  preview covers it) and passes `{ watercolorSrc, parallaxSrc }` as the
  `watercolor` prop of `HeroSection`, `FeatureSection` and `PaintedStory`,
  or straight to `WatercolorImage`. Both images fill the backdrop's 16 : 10
  frame (another shape is stretched). The parallax layer lies over the
  photo's edges, under the caption, is painted in with the backdrop and
  drifts on scroll (`watercolor-parallax.tsx`), not under reduced motion.
  The shared images are not used by the generated share pictures
  (`og-image.tsx`), which keep the site's own backdrop.
- **Admin**: two decorative image fields (PNG or WebP, no alt text):
  "Tło akwareli" ("Przywróć domyślne" returns to the site's own) and
  "Warstwa parallaxy", with a preview around the photo's place. Saved as a
  draft; the tab's "Publikuj stronę" publishes it and refreshes every page
  (layout revalidation of `/`); "Podgląd" opens the homepage.

## The "O nas" pages (19.10)

`20261019150000_about_pages.sql`; tests `supabase/tests/about_pages.sql`;
contracts `packages/contracts/src/cms-pages.ts` (and `cms-shared.ts`: a
page's top, `pageHeaderSchema`, and `sitePathSchema`). Each key defaults to
the site's own words; fields added later default too.

- **`about_page`** (O nas): the top (an empty lead shows the centre's short
  description from Ustawienia), three value cards, and three parts off
  until the admin switches them on: `showStory` + `story` (text, a photo in
  site-media/about), `showProfessionalism` + `professionalism` (up to 8
  facts under the last card), `showAudiences` + `audiences` (1..6 cards,
  each to a page of the site) and `audiencesNote`.
- **`about_headers`**: O nas's sections' headers (story, audiences,
  specialists, rooms, contact), edited with the homepage's header block.
  "Kontakt" on O nas shows only with the company's details.
- **`specialists_page`**: /specjalisci's top, its empty-list line and its
  closing banner's line.
- **`rooms`** (Gabinety) gains its top, "Co u nas znajdziesz" (heading, up
  to 8 points) and the line shown while no room is published.
- **`contact_page`**: /kontakt's top, how to get there, the form's heading
  and up to 12 questions and answers.
- **`closing_cta`** and **`site_contact`** (Ustawienia wspólne): the
  closing banner's words (every page with it) and the contact hours (the
  footer, Kontakt, "Gdzie jesteśmy").

**The contact form** (/kontakt, decided 19.10): `contact_messages` keeps
every message, written only by the site's server through
`submit_contact_message` (service role), which refuses a fourth within an
hour from one visitor (a keyed hash of the IP) or one address; only admins
read them. After saving, the centre gets a notice at its e-mail from
Ustawienia (Reply-To: the visitor; "Odpowiedz w Gmailu" and "Odpowiedz w
programie pocztowym" open a reply with a template) and the visitor a copy;
`notified_at` records the notice. Turnstile and a hidden field keep bots
out. The embedded Google map loads only after consent to all cookies (or
"Pokaż mapę").

## The offer pages (20.10)

`20261020150000_offer_pages.sql`; tests `supabase/tests/offer_pages.sql`;
contracts `packages/contracts/src/cms-offer.ts`. Seeded as drafts with the
site's words; the services, catalogues and prices stay the portal's.

- **`offer_page`** (Oferta): its top and the line while no service is
  published. Its questions moved to Kontakt.
- **`service_page`** (every service's page, edited under Oferta and
  published with it, refreshing the whole site): "Jak pracujemy" (eyebrow,
  title, description, the button to the first-visit consultation) and,
  for a service not booked online (no specialist offers it, or it is not
  in the bookable catalogue), the line instead of its price and the
  button to Kontakt instead of "Umów".
- **`prices_page`** (Cennik): its top, the lines for no services and for a
  service without a price, and up to 8 rules of payment and cancelling
  (seeded as a draft for the centre to confirm). How long before a visit
  it is cancelled with a refund is `cancellation_window_hours` from
  Ustawienia → Rezerwacje online (`booking_window()`), shown first. The
  cards stand in Oferta's catalogues and order.

A wrong or hidden service's address shows `/oferta/[slug]/not-found`,
with a way back to Oferta.

## A page's header (20.10)

`20261020170000_page_headers.sql`; tests `supabase/tests/page_headers.sql`.
A page's top (`intro` on about_page, specialists_page, contact_page, rooms,
offer_page, prices_page) has a section's header's shape
(`pageHeaderSchema` in `cms-shared.ts`): the eyebrow and its colour, the
title in one or two lines of coloured words (the page's h1), the description
(the lead) with at most one link, and no call to action. The CMS edits it
with the sections' header editor (`PageHeaderFields`), always showing the
title's two lines; the site draws it with `SectionHeader` (`variant="page"`).
The migration rewrote every page's four words (eyebrow, heading, accent,
lead) into it, keeping the look: the eyebrow pink, the accent the title's
second line in green.

## The legal documents (20.10)

`20261020180000_legal_pages.sql`; tests `supabase/tests/legal_pages.sql`;
contracts `packages/contracts/src/cms-legal.ts` (the sample documents in
`cms-legal-content.ts`, kept out of the portals' client code).

- **`legal_terms`** (/regulamin), **`legal_privacy`** (/polityka-prywatnosci),
  **`legal_cookies`** (/cookies): the page's header, the document as rich
  text (the portals' editor: h2 and h3, paragraphs, lists, links; checked
  in full by the contracts on save, in outline by the database) and the date
  it applies from (`effectiveFrom`, shown as "Obowiązuje od").
- Seeded as drafts with sample documents that say they are samples and
  describe what the site really does; the site shows them until the centre
  publishes its own. Each CMS tab publishes its document with its search
  settings.

## Domain separation

`/specjalisci` reads **directly from the real Specialist Domain**
(`listPublishedSpecialists`, `createSpecialistMediaSignedUrl` — both
already-existing, already-proven-safe functions from the Specialist Domain
phase) — there is no CMS involvement, and no specialist data of any kind
is duplicated into `site_content` or any CMS table. This is the literal
meaning of "CMS = editorial text, Specialist Domain = specialist data":
Home's test content is CMS; the specialists list is not.

### DEV placeholder specialist data

The two real specialist accounts in DEV were run through the **canonical**
draft → submit → approve workflow (`save_my_specialist_profile_draft` →
`submit_my_specialist_profile_draft` → `approve_specialist_profile_draft`)
with neutral, clearly-developmental content only:

|              | display_name    | short_bio / long_bio                                               |
| ------------ | --------------- | ------------------------------------------------------------------ |
| Specialist 1 | "Specjalista 1" | "Profil testowy wykorzystywany do weryfikacji listy specjalistów." |
| Specialist 2 | "Specjalista 2" | (same sentence)                                                    |

No education/certificates/specializations/languages/modalities/
`professional_title` were invented — all left empty/`NULL`. One of the two
accounts is simultaneously the only admin account in this DEV environment,
so it could not legitimately self-approve through the RPC (the existing,
untouched `approve_specialist_profile_draft` self-review guard forbids
it). That one record's publish step was performed as an explicitly
documented exception at the trusted migration layer, replicating the RPC's
exact effect without modifying or weakening the guard itself — see
`supabase/migrations/20260920101323_dev_publish_seed_specialist_profiles.sql`
for the full rationale inline. **This is DEV placeholder content, not
production copy**, and must not be mistaken for real specialist profiles.

## Future extension

**Another fixed page** (e.g. a future `/o-nas`): add its own typed content
contract (a new `HomePageContent`-shaped interface + Zod schema) and either
extend `site_content` with a new allowed `key` value (one migration
altering the `CHECK`) or introduce a sibling singleton table if the new
page's content shape is substantially different — never a generic
"arbitrary page" mechanism.

**Blog/Articles** are a genuinely different problem: they need
user-created entries with their own lifecycle, not predefined content
inside a fixed page. That calls for a real, separate dynamic-content model
(closer to what the removed generic CMS attempted) — deliberately not
built in this phase, and not a natural extension of `site_content`.
The articles, conditions and workshops domains are planned (and their
progress tracked) in
[public-site-roadmap.md](../product/public-site-roadmap.md).

**Media**: `image_path`-style fields, if a future fixed page needs one,
remain unbuilt until a real Storage-backed media pipeline exists — same
deferral already applied to `center_public_profile.logo_path`.

## Single-center assumption

No tenant/organization concept applies here — see
[ADR 0001](./adr/0001-single-center-product.md).
