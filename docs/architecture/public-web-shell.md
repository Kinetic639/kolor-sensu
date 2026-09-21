# Public web shell and navigation

## Fixed-route principle

`apps/web`'s public route surface is code-owned and fixed. See
[cms-domain.md](./cms-domain.md) for the full rationale; the restatement
that matters here is the same one: no dynamic/CMS-created routes, no
placeholder pages created just to fill out navigation. The routes that
exist today are `/` (Home), `/specjalisci` (Specialists), and `/oferta`
(Offer) — each a real, code-defined `page.tsx`, never a CMS-created page.

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
`/oferta`).

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
