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
  key                text PRIMARY KEY CHECK (key = 'home')
  draft_payload       jsonb NOT NULL
  published_payload   jsonb            -- null until first publish
  published_at        timestamptz
  created_at / updated_at
```

`key = 'home'` is a hard database-level guarantee, not a UI convention:
`admin` has **no `INSERT` grant at all** on this table (the singleton row
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

## Admin CMS UI

`/cms` is a single fixed page (no `[id]` route, no list): a summary card
showing publish status, last-updated/last-published timestamps, an
"Edytuj treść" button (opens a `Dialog` with an RHF+Zod form for
heading/body/buttonLabel), a "Podgląd" link, and a "Publikuj" button.
There is no create-page button, no slug field, no section type picker, no
reorder control anywhere in this UI.

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
