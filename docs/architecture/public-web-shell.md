# Public web shell and navigation

## Fixed-route principle

`apps/web`'s public route surface is code-owned and fixed. See
[cms-domain.md](./cms-domain.md) for the full rationale; the restatement
that matters here is the same one: no dynamic/CMS-created routes, no
placeholder pages created just to fill out navigation. The routes that
exist today are `/` (Home), `/specjalisci` (Specialists), `/oferta`
(Offer), `/gabinety` (Rooms), and their three detail route families
(`/specjalisci/[slug]`, `/oferta/[slug]`, `/gabinety/[slug]`) — each a
real, code-defined `page.tsx`, never a CMS-created page. `[slug]` here is
an **application-owned dynamic segment**, not a CMS mechanism: the slug
identifies one real domain entity (a specialist, a service, or a room),
and there is no generic "any slug renders a page" route anywhere in the
app.

## One shared public shell

`apps/web/src/app/layout.tsx` is the single place the public shell is
assembled: `<SiteHeader />`, a semantic `<main>` wrapping `{children}`,
and `<PublicSiteFooter />`. Every route under `apps/web/src/app` inherits
this automatically — individual pages (`page.tsx`, `specjalisci/page.tsx`)
render their own content only, not their own `<header>`/`<footer>`/`<main>`.
This is why `page.tsx` and `specjalisci/page.tsx` no longer render their
own `<main>` element: that landmark now belongs to the layout, so the
document has exactly one `<main>` per page (a second `<main>` would be
invalid HTML and would confuse assistive tech).

The shell components themselves (`PublicSiteHeader`, `PublicSiteFooter`,
`isPublicPathActive`) live in `packages/ui/src/public-site-shell.tsx` —
not in `apps/web` — mirroring the exact same split already used for the
authenticated portals (`PortalShell`/`AppSidebar`/`MobileBottomNav` in
`packages/ui/src/portal-layout.tsx` and `portal-shell.tsx`). This keeps
the shell testable with Vitest/RTL the same way the portal shell already
is (`packages/ui/src/public-site-shell.test.tsx`), and keeps `apps/web`'s
own code limited to composition: navigation data, and a thin client
wrapper for reading the current pathname.

## Public navigation source of truth

`apps/web/src/lib/public-navigation.ts` exports one typed array,
`publicNavigation: PublicNavigationItem[]`, and both the header and the
footer render from that same array — there is no second, independently
maintained list of route labels anywhere. Extend this array only once a
route is actually implemented and reachable; it must never contain a
`href` that doesn't resolve to a real page. `tests/e2e/public-web-shell.spec.ts`
(test F) asserts this live: every link rendered inside `<header nav>` and
`<footer nav>` resolves to a route in the known set (`/`, `/specjalisci`,
`/oferta`, `/gabinety`).

## SSR/RSC requirement

`layout.tsx` is an `async` Server Component. It fetches the published
Center Public Profile server-side (`getPublicCenterProfile`, already
RLS-scoped to `published = true` rows only) and passes the result straight
into `<PublicSiteFooter centerProfile={...} />` — no client-side fetch,
no TanStack Query for this data. The only Client Component in the shell is
`apps/web/src/components/site-header.tsx` (`SiteHeader`), and its only job
is calling `usePathname()` and rendering the shared, presentational
`PublicSiteHeader` — `PublicSiteHeader` itself takes `currentPath` as a
prop rather than reading the router itself, which is what keeps it
testable without mocking Next's router and keeps the client boundary as
small as the mobile-menu/active-route concern actually requires. Radix's
`Sheet` (used for the mobile menu) carries its own `"use client"`
directive; a Server Component is allowed to render it as a child without
itself becoming a Client Component, which is exactly what
`PublicSiteHeader` does.

Home's and Specialists' own data fetching is unchanged: both still fetch
directly in their Server Component page (`getPublishedHomeContent`,
`listPublishedSpecialists`), still server-rendered, still no client fetch
for their core content.

## Public Offer page (`/oferta`)

`apps/web/src/app/oferta/page.tsx` is a fixed, code-owned `async` Server
Component — not a CMS-created page, and CMS is not touched by this route
at all. Its content comes entirely from the existing Services Domain, read
through the already-existing public data-access helpers
(`listPublicServices`, and the new `listPublicSpecialistOffers` described
below) — never from `site_content` or any other CMS table, and never
duplicated into one.

**Source of truth and query strategy.** The page issues exactly two
queries in parallel (`Promise.all`): `listPublicServices()` for the
catalog, and `listPublicSpecialistOffers()` — a new helper in
`packages/supabase/src/services.ts` that returns every currently-public
specialist offer across _all_ public services in one query (the existing
`listPublicSpecialistOffersForService(slug)` only fetches one service's
offers, which would mean one query per service — an N+1 pattern the page
deliberately avoids). Grouping happens in memory afterward
(`buildPublicOfferSummary`), not via a third query or a materialized view.

**View model.** `packages/contracts/src/services.ts` exports
`buildPublicOfferSummary(service, offers)`, a pure function (tested in
`packages/supabase/src/services.test.ts`, the same file that already
tests `resolveEffectiveDurationMinutes` — `packages/contracts` itself has
no test runner, so its pure functions are tested from the consuming
package, matching existing precedent) that derives, strictly from a
service's own public offers and never invented:

- `specialistCount` — simply `offers.length`, not a deduplicated set:
  `specialist_services_specialist_service_key` is `UNIQUE(specialist_id,
service_id)`, so each offer already represents exactly one distinct
  specialist.
- `supportsOnline` / `supportsInPerson` — `true` if _any_ public offer for
  that service supports it.
- `minPriceMinor` / `minPriceCurrencyCode` — the cheapest public offer's
  integer minor-unit price, compared with plain integer `<`, never
  floating point; `null` when there are no public offers for that
  service. `formatPriceMinor` (also new, same file) converts to a
  localized string (`Intl.NumberFormat("pl-PL", { style: "currency" })`)
  only at render time, the same pattern already used inline by the Admin
  Specialists view for the identical reason.

**No-offer fallback.** A public service with zero public specialist
offers renders `"Cena ustalana indywidualnie"` instead of a price, and no
modality badges at all — chosen over omitting the price line entirely
because it's more informative to a visitor (explains _why_ no price
shows, rather than looking like a missing field) while still inventing
nothing. As of this writing this is the live DEV state for both real
services (`specialist_services` is empty), which is the honest state, not
a bug.

**SSR/SEO.** Fixed `generateMetadata()` (`"Oferta | Kolor Sensu"` / a
generic, non-clinical description). Zero public specialist offers today
means the whole page is static-prerenderable (`next build` emits `/oferta`
as `○` — static — the same as `/` and `/specjalisci`); it will become
request-time-rendered automatically once real offers make the data
genuinely dynamic per request, with no code change required.

## Public Rooms page (`/gabinety`)

`apps/web/src/app/gabinety/page.tsx` is a fixed, code-owned `async` Server
Component. Its content comes entirely from the Rooms/Locations Domain —
never from CMS, never duplicated into `site_content`.

**The location-context gap, and how it's bridged.** `room_public_profiles`
(the only room-related table `anon` can read at all) has no `location_id`
of its own, and `anon` has **zero grant on `rooms`** — a direct anon
`SELECT` on `rooms` fails with `permission denied`, not an empty result
(verified live via MCP before writing any page code, not assumed from
docs). Location grouping is an explicit requirement of this page, so a
narrow forward migration
(`supabase/migrations/20260921111816_public_room_location_bridge.sql`)
adds `public.list_public_room_locations()`: a `SECURITY DEFINER` function,
matching the existing `room_is_publicly_exposable()` pattern, that returns
`{room_id, location_id, location_name, location_slug}` for every room that
is `active AND publicly_visible` **and** whose location is itself
`active AND publicly_visible` — nothing else. It grants anon no broader
access to `rooms`; anon still cannot read `rooms` directly, only invoke
this one narrowly-scoped, set-returning function.

**Query strategy.** `listPublicRooms()` (`packages/supabase/src/rooms.ts`)
issues exactly two queries in parallel (`Promise.all`): a plain `SELECT *`
against `room_public_profiles` (RLS already limits this to published,
publicly-exposable rows) and one call to `list_public_room_locations()`.
The two results are joined in memory by `room_id` — never a query per
room. A published profile whose room doesn't appear in the location
bridge (e.g. its location isn't itself public) is excluded rather than
shown without location context.

**View model.** `packages/contracts/src/rooms.ts` exports `PublicRoom`
(only the fields a published profile actually carries, plus the bridged
location) and `groupPublicRoomsByLocation()`, a pure grouping function
(tested in `packages/supabase/src/rooms.test.ts`, same precedent as
`buildPublicOfferSummary`). `listPublicRooms()` pre-sorts by location name
then room name; the grouping function trusts that order rather than
re-sorting.

**What's deliberately not shown, and why:**

- **Capacity** — lives only on `rooms`, which anon cannot read at all; the
  approved bridge function returns location fields only, not capacity.
  Not shown. Extending the bridge to include it would need a separate,
  explicit decision.
- **Room image** — `room_public_profiles.image_path` exists as a column,
  but there is no storage bucket for room media at all (only
  `specialist-profile-media` exists, and it's private) — no safe way to
  resolve the path to a URL yet. The field is carried in the `PublicRoom`
  contract for forward-compatibility but the page renders no `<img>`.
- **Opening hours** — `room_opening_hours` has **zero** anon `SELECT`
  policy (verified live: only `authenticated` admin/specialist can read).
  Not shown, and RLS was not weakened to show them.
- **Availability exceptions** — same: `room_availability_exceptions` has
  zero anon policy, and no public-safe derived concept (like "closed
  today") exists in the domain yet. Omitted entirely for this phase.

**Empty state.** Zero public rooms renders "Informacje o gabinetach są
obecnie aktualizowane." server-side — no fake rooms.

**SSR/SEO.** Fixed `generateMetadata()` (`"Gabinety | Kolor Sensu"` / a
generic description). Static-prerenderable today (`next build` emits
`/gabinety` as `○`), same as `/`, `/specjalisci`, `/oferta`.

## Domain detail routes (`/specjalisci/[slug]`, `/oferta/[slug]`, `/gabinety/[slug]`)

Each list page's entities are real, code-owned entities with their own
detail page, not a CMS-editable page. Source of truth is exactly the same
domain each list page already reads from — no data is duplicated into a
detail-specific store, and CMS is not involved in any of the three.

**Slugs are the domain's own stable identifiers**, not invented route
IDs: `specialists.public_slug`, `services.slug`, and `rooms.slug`. The
Rooms case needed a small extension first — see "The room-slug gap" below.

**Specialist detail** (`getPublishedSpecialistBySlug`, already existing)
renders every public-safe profile field the domain has: bio, photos (via
`createSpecialistMediaSignedUrl`, the same private-bucket signing helper
the list page already uses), specializations, therapy approaches,
modalities, languages, education, certificates, and an "Oferowane usługi"
section from the new `listPublicSpecialistOffersForSpecialist(slug)`
helper (one query, mirroring the existing `listPublicSpecialistOffersForService(slug)`).

**Service detail** (`getPublicServiceBySlug`, already existing) renders
name, description (falling back to `shortDescription` only when the
longer `description` is absent), duration, and a "Specjaliści oferujący tę
usługę" section from the existing `listPublicSpecialistOffersForService(slug)`,
with derived min price/modalities via the existing `buildPublicOfferSummary`
pure function — reused, not reimplemented.

**Room detail** (new `getPublicRoomBySlug`) renders the published profile
fields plus location name and (via `listPublicLocations()`, already
existing and already anon-safe) the location's address/city if present.
Opening hours and availability exceptions are **not** rendered — see "What
stays private" below.

**The `PublicSpecialistOffer` widening.** To let a service's specialist
list show a name, photo, and a working `/specjalisci/[slug]` link without
an N+1 query per specialist, `publicSpecialistOfferSelection`
(`packages/supabase/src/services.ts`) now embeds
`specialists.specialist_public_profiles!inner(display_name, profile_photo_url)`
and `services(slug, name)` in the one existing query, and
`PublicSpecialistOffer` carries `serviceSlug`, `serviceName`,
`specialistDisplayName`, and `specialistProfilePhotoUrl`. The `!inner` on
`specialist_public_profiles` is a deliberate correctness fix, not just an
addition: it means an offer only counts publicly (on `/oferta`'s derived
price/count and on the new cross-links) when the specialist's public
profile is actually published — previously a specialist could appear in
an aggregate count without a real, linkable public profile. This changes
nothing observable today (0 `specialist_services` rows exist in DEV), and
is covered by the existing Vitest suite plus the DB regression's anon
checks.

**The room-slug gap (Phase 1 blocker, resolved).** `room_public_profiles`
(the only anon-readable room table) carries no slug of its own, and anon
still has zero grant on `rooms` at all. The existing
`list_public_room_locations()` bridge (from the Rooms Domain public-page
task) was extended — with explicit approval, the same narrow pattern as
before — to also return `room_slug`
(`supabase/migrations/20260921115745_add_room_slug_to_public_location_bridge.sql`).
No broader access to `rooms` was granted; `getPublicRoomBySlug()` still
just filters `listPublicRooms()`'s existing two-query result in memory.

**What stays private.** Opening hours (`room_opening_hours`) and
availability exceptions (`room_availability_exceptions`) still have zero
anon RLS policy, verified live before implementation and re-verified
after. Room capacity is not in the approved public bridge. None of these
are rendered, and RLS was not touched to make them renderable.

**404 privacy behavior.** All three `getXBySlug`/`getPublicRoomBySlug`
helpers return `null` identically whether a slug doesn't exist or exists
but fails a public-eligibility filter (inactive, unpublished, hidden
location, etc.) — the same query, the same code path, the same `notFound()`
call in the page. A private entity is architecturally indistinguishable
from a nonexistent one to an anonymous visitor.

**Caching strategy: deliberately dynamic, not `generateStaticParams()`.**
All three `[slug]` routes render as `ƒ` (server-rendered on demand, `next
build`'s own classification) rather than `○` (static). This is a
deliberate choice, not an oversight: Admin can publish, unpublish, or
deactivate any of these entities at any time, and there is no existing
per-slug revalidation webhook wired up for these new route families (only
Home's CMS publish action calls the revalidation webhook today, hardcoded
to `path: "/"`). Statically prerendering detail pages without a
revalidation path would risk continuing to serve a since-unpublished
entity's page — a direct privacy leak against the 404 requirement above.
Building that webhook wiring now would be new caching infrastructure this
task doesn't need yet, given DEV's current single-digit entity counts per
domain. If/when this needs to scale, the existing `api/revalidate` pattern
already used by CMS is the natural place to extend, not a new mechanism.

**Images: `next/image` deferred for now.** Specialist photos and (in the
future) room photos are signed URLs from a private Supabase Storage
bucket, resolved per-request, with a hostname that varies by environment.
`next/image` requires that hostname in `next.config.js`'s
`images.remotePatterns` ahead of time. Wiring that up is a reasonable
follow-up, but out of scope for a task about routing and data
architecture — the existing, already-proven `Avatar`/`AvatarImage`
(specialist list, specialist detail, service detail) and a plain `<img>`
(the specialist detail page's portrait, the one place without an existing
`Avatar`-based precedent) are used instead, with `alt` text on every image.

## Navigation link element choice

`apps/web/next.config.js` has `typedRoutes: true`, which makes
`next/link`'s `href` reject a plain `string` type (it only accepts a
literal route or the generated `Route` union). Since
`PublicNavigationItem.href` is intentionally a plain `string` (it's driven
by a runtime-configured array, not literals), the nav links in both the
header and the footer use plain `<a href={item.href}>` rather than
`<Link>` — the exact same choice already made in
`packages/ui/src/portal-layout.tsx` for the authenticated portal nav, for
the same reason. The one exception is the header's brand mark, which
links to the literal `"/"` and can safely use `<Link>` (and gets Next's
prefetch behavior for that one link).

## Final design intentionally deferred

The shell's visual language (color, spacing, typography) reuses the
existing semantic design tokens (`--surface`, `--text`, `--text-muted`,
`--border`, `--primary`, `--radius-control`, `--ks-header-height`,
`--ks-container-xl`) exactly as already established in `packages/ui`.
Nothing here is final marketing design — no new brand assets, no
animation, no hero treatment. A "Umów wizytę" (book a visit) CTA was
deliberately **not** added: there is no booking flow to link to yet, and
the task's own instruction is to omit such a CTA rather than link it to
nothing or show it disabled without a clear future action. When a real
booking flow exists, add the CTA and extend `publicNavigation` in the same
commit that ships the route it points to — never before.

## Accessibility

- Semantic landmarks: `<header>`, `<nav aria-label="...">` (three labelled
  navs: desktop, mobile, footer — each independently reachable by
  assistive tech), `<main>`, `<footer>`.
- Active route is marked with `aria-current="page"` in addition to a
  color/underline treatment — never color alone.
- The mobile menu button has an explicit `aria-label`, and Radix's
  `Sheet`/`Dialog` primitive provides focus trapping, `Escape`-to-close,
  and returns focus to the trigger on close, with no custom code needed.
- Mobile nav links have a `min-h-11` (44px) touch target.

## Single-center assumption

No tenant/organization concept applies here — see
[ADR 0001](./adr/0001-single-center-product.md).
