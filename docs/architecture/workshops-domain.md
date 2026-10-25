# Workshops Domain

A complete vertical slice: a canonical `workshops` table, Admin management,
and a public `/warsztaty` list + `/warsztaty/[slug]` detail. This document
covers identity, lifecycle, the specialist/room/location relations, public
visibility, and what is deliberately deferred.

Out of scope for this phase, deliberately: workshop registrations,
booking, payments, attendance tracking, packages, email notifications,
calendar integrations, and a template/occurrence split for recurring
series. See "Future extensions" below for how the current model stays
compatible with all of these without a redesign.

## Identity

One `workshops` row is one concrete scheduled event -- not a template. A
recurring series (e.g. "every Tuesday") is out of scope; if that becomes a
real requirement, it is added as a new template/occurrence layer on top of
this table later, not retrofitted into it now.

Fields: `id`, `slug` (stable, unique, URL-safe, application-chosen --
same convention as Service/Specialist/Room slugs), `title`,
`short_description`, `long_description`, `specialist_id`, `location_id`,
`room_id`, `modality`, `starts_at`/`ends_at` (absolute `timestamptz`
instants), `price_minor`/`currency_code`, `capacity`, `registration_enabled`,
`status`, `cover_image_path`, timestamps.

## Lifecycle: `status` is the only publication flag

`workshop_status`: `draft` → `published` → (`cancelled` | `completed`).

- **draft**: Admin editing, never visible to anon.
- **published**: the public event; appears in the upcoming public list.
- **cancelled**: stays addressable at its existing `/warsztaty/[slug]` URL,
  clearly labelled "Odwołany" -- removed from the upcoming list only.
- **completed**: same addressability as cancelled, also removed from the
  upcoming list.

There is deliberately **no separate `active`/`publicly_visible` boolean**
on this table, unlike Services/Rooms/Locations. Those domains split an
operational-availability flag from a content-publication concept because
they have two independently-toggleable dimensions (e.g. a Room can be
"active" as an operational resource while its public profile is separately
unpublished). A Workshop has one dimension only -- its own lifecycle -- so
adding parallel booleans here would just be redundant, possibly
conflicting truth for no product benefit. `status <> 'draft'` is the one
and only public-visibility rule, enforced by RLS (see below), and
list-vs-detail behavior is a query-layer distinction on top of that (see
"Public read model").

Status transitions are dedicated guarded functions in
`packages/supabase/src/workshops.ts` -- `publishWorkshop`, `cancelWorkshop`,
`completeWorkshop` -- each a single `UPDATE ... WHERE id = $1 AND status IN
($allowedSourceStatuses)`. Attempting a transition from the wrong source
status matches zero rows and surfaces as a clear "cannot transition from
current status" error at the Admin action layer, rather than silently
succeeding or corrupting state. This is not a new `SECURITY DEFINER`
function (unlike CMS's `publish_site_content` or the Specialist Domain's
`approve_specialist_profile_draft`) because there is no multi-table
invariant to copy atomically here -- RLS already restricts all mutation to
Admin, and the guarded single-column UPDATE is sufficient.

## Specialist leader relation

`specialist_id uuid NOT NULL REFERENCES specialists(id) ON DELETE RESTRICT`.
One primary leader per workshop (MVP). Workshop rows never copy the
specialist's name, photo, bio, or credentials -- the Admin UI's specialist
picker and the public detail page's leader section both resolve that data
live from the Specialist Domain (`specialist_public_profiles` /
`specialists`). `ON DELETE RESTRICT` means a specialist record can never
silently disappear out from under an existing workshop.

## Room / location relation

`location_id`/`room_id` are both nullable `uuid REFERENCES locations(id) /
rooms(id) ON DELETE RESTRICT`. Invariant, enforced by two DB constraints:

- `workshops_modality_location_check`: `modality = 'online'` requires both
  `location_id` and `room_id` to be `NULL`; `modality = 'in_person'`
  requires `location_id IS NOT NULL` (`room_id` stays optional -- not
  every location has a dedicated group room modeled yet).
- `workshops_room_location_fkey`: a composite foreign key,
  `FOREIGN KEY (room_id, location_id) REFERENCES rooms(id, location_id)`,
  backed by a new `rooms_id_location_id_key UNIQUE (id, location_id)`
  constraint added to `rooms` in this same migration. Postgres's `MATCH
SIMPLE` FK semantics skip the check whenever any referencing column is
  `NULL`, so an online workshop's `NULL` `room_id` is exempt, while an
  in-person workshop's room (if set) is _structurally_ guaranteed to
  belong to the workshop's own `location_id` -- there is no way to insert
  a room from a different location, at the database level, not just in
  application code.

## Modality

`workshop_modality`: `in_person` | `online`. No `hybrid` -- there is no
current product need for it, and adding it would multiply the
location/room invariants above for no real use case yet.

## Date/time

`starts_at`/`ends_at` are absolute `timestamptz` instants (never formatted
strings). `starts_at < ends_at` is a `CHECK` constraint. Display uses
`formatWorkshopDate`/`formatWorkshopTimeRange` in
`packages/contracts/src/workshops.ts`, which format in Polish locale
(`pl-PL`) and a fixed `Europe/Warsaw` timezone constant
(`DEFAULT_CENTER_TIMEZONE`) -- matching `center_settings.timezone`'s
default. This is a single-center product (see
[ADR 0001](./adr/0001-single-center-product.md)); a future multi-center
product would thread the real center timezone through instead of this
constant, not add a second one.

The Admin form asks for date / start time / end time as three separate
wall-clock fields (not a raw ISO datetime input) and converts them with
`combineDateTimeToIso`/`splitIsoToDateTime`, which resolve the correct
UTC offset for that specific date via `Intl.DateTimeFormat`, so DST
transitions (CET/CEST) are handled correctly rather than assuming a fixed
offset.

## Pricing

Integer minor units + ISO 4217 currency code, exactly the existing
`specialist_services.price_minor`/`currency_code` convention --
`price_minor BETWEEN 0 AND 10000000`, `currency_code ~ '^[A-Z]{3}$'`,
default `'PLN'`. Zero is a valid price (free workshops). Reuses the
existing `formatPriceMinor` formatter -- no second money formatter was
introduced.

## Capacity

`capacity integer NOT NULL CHECK (capacity BETWEEN 1 AND 500)`. This is
the maximum participant count, shown publicly as "Liczba miejsc: N".
There is deliberately no `remaining_slots`/`booked_count` -- no
registration domain exists yet, so a "remaining seats" figure would be
fabricated. When a real `workshop_registrations` table exists (see
"Future extensions"), remaining seats becomes `capacity - confirmed
registrations`, computed then, not denormalized now.

## `registration_enabled`

An independent boolean, orthogonal to `status`: whether this workshop will
eventually accept registrations. Registration itself is not implemented.
The public detail page shows "Zapisy wkrótce" when true, "Zapisy jeszcze
niedostępne" when false -- never a link to a booking flow that doesn't
exist.

## Public read model

**RLS**: `anon` gets `SELECT` on `workshops` gated by a single policy,
`status <> 'draft'` -- no bridge function, no column restriction (there is
no internal-only column on this table to hide; every field is public-safe
the moment a workshop is non-draft). `authenticated` gets `has_role('admin')
OR (has_role('specialist') AND specialist_id resolves to their own
specialists row)` for `SELECT`, and `has_role('admin')` for
`INSERT`/`UPDATE`. No client role has `DELETE` -- lifecycle status is the
only way to retire a workshop; hard delete is not exposed (mirrors every
other domain in this codebase).

**List vs. detail is a query-layer distinction, not an RLS one**:
`listPublicWorkshops()` additionally filters `status = 'published' AND
starts_at > now()`, ascending by `starts_at` -- so a cancelled or
completed workshop is correctly excluded from `/warsztaty` while still
being a legitimately non-draft, RLS-readable row.
`getPublicWorkshopBySlug()` only filters `status <> 'draft'`, so a
cancelled/completed workshop's own URL still resolves (with an explicit
"Odwołany"/status badge on the page) -- this is the documented cancelled
behavior from the task brief: addressable, clearly labelled, absent from
the "available" list.

**404 privacy**: an unknown slug and a draft workshop hit the exact same
code path (`getPublicWorkshopBySlug` returns `null`), then `notFound()`.
The two are indistinguishable to an anonymous visitor by construction.

**Cross-links, resolved gracefully, never leaking privacy**: the public
queries embed `specialists(public_slug, professional_title,
specialist_public_profiles(display_name))` and `locations(name, slug,
address_line1, address_line2, postal_code, city)` **without** `!inner` --
if the leading specialist's public profile or the location isn't
currently public, PostgREST returns `null` for that embedded object and
the _workshop row itself stays intact_, just without that cross-link
(`specialist`/`location` end up `null` on `PublicWorkshopSummary`). This
is the opposite choice from `PublicSpecialistOffer`'s `specialists!inner`
join (Services Domain) -- there, a hidden specialist should make the
_offer_ disappear entirely; here, per the task brief, a workshop detail
page must keep working even if its leader/location becomes non-public
later. For the room cross-link specifically, anon has no grant on `rooms`
at all (same as everywhere else in this codebase), so
`getPublicWorkshopBySlug` reuses the existing `listPublicRooms()` helper
(the same bridge-backed two-query helper `/gabinety` already uses) and
matches by `roomId` -- no new bridge function needed.

## SSR/RSC, caching

Both `/warsztaty` and `/warsztaty/[slug]` are plain async Server
Components -- no TanStack Query, no Zustand, no client-side fetch for core
content.

`/warsztaty/[slug]` renders dynamically (`ƒ`), the same as every other
public detail route in this codebase, for the same reason: no per-slug
revalidation webhook exists, so static generation would risk serving a
since-unpublished/since-cancelled workshop.

`/warsztaty` (the list) is **explicitly forced dynamic**
(`export const dynamic = "force-dynamic"`), unlike `/specjalisci`,
`/oferta`, and `/gabinety`, which are statically prerenderable. This is a
deliberate, documented exception: this list's query filters by `starts_at

> now()`, and static prerendering would freeze "now" at build time --
> after a rebuild, "upcoming" would never advance, silently leaving past
> workshops listed (or newly-approaching ones hidden) until the next
> deploy. That staleness risk is specific to this one time-based query; none
> of the other public list pages filter by a moving instant.

## Storybook / cover images

`WorkshopStatusBadge`/`WorkshopModalityBadge` (`packages/ui/src/workshop-admin.tsx`)
are the reusable pieces extracted to Storybook, mirroring
`ServiceStatusBadges`/`SpecialistOfferSummary` (`service-admin.tsx`). The
Admin list/detail markup itself stays inline in its feature components,
consistent with how Services/Rooms are built.

`cover_image_path` is schema-ready (a raw storage path, matching the
`room_public_profiles.image_path` convention) but is not currently
rendered anywhere, admin or public. No new Storage bucket/signed-URL
pipeline was built for it in this task -- the only bucket that exists today
is the private `specialist-profile-media` one, and Rooms' own
`image_path` field has the identical "schema exists, not yet wired to
real storage" gap. Wiring a workshop/room media bucket is a natural,
independent follow-up, not something this task's scope required.

## RLS test coverage

`supabase/tests/workshops_domain.sql` proves: Admin create/edit (A, C),
Specialist cannot create (B), FK/invariant enforcement -- bad specialist
(D), room/location mismatch (E), time range (F), price bounds (G),
capacity bounds (H), slug uniqueness (I), in-person requires location (N),
online forbids location/room (O) -- draft invisibility including a
column-level check via `SELECT *` (J/P), publish visibility (K), and the
cancelled-but-addressable behavior (L), plus the guarded-transition no-op
behavior for an out-of-order cancel attempt (M). Existing Auth, Center,
CMS, Rooms, Services, and Specialist regression suites were re-run
unmodified except for one unrelated fix (see below) and all pass.

**Unrelated fix found during regression verification**: `rooms_domain.sql`
resolved a "the test room" reference via a bare `... WHERE slug =
'test-room-1' LIMIT 1` in its "complete room-management slice" section,
despite that file deliberately creating two rooms named `test-room-1` (one
per test location, to prove slug uniqueness is location-scoped). That
`LIMIT 1` has no defined row order, so it can silently resolve to either
room depending on the query plan -- and did, intermittently, during this
task's regression run (unrelated to any Workshops schema change; the
Workshops migration never touches `room_opening_hours` or
`room_availability_exceptions`). Fixed by qualifying every such lookup
with `AND location_id = (SELECT location_a_id FROM rooms_test_ids)`, the
location the rest of that section already assumes.

## Registrations, blocking and the waitlist (22.10)

Migration `20261023080000_workshop_registrations.sql`, plan and decisions
in [workshops-plan.md](../product/workshops-plan.md). This supersedes the
"Registrations", "Payments" (in part) and "Scheduling conflicts" notes
below.

- **New workshop fields:** `body` (rich text, as articles), `audience`,
  `agenda`, `cover_alt`, `seo_title`/`seo_description`, `min_participants`,
  `registration_closes_at` (null: 24 hours before), `confirmed_at`,
  `cancelled_at`/`cancel_reason`. A cancelled workshop stays cancelled;
  admins may delete a workshop without registrations.
- **Co-leaders:** `workshop_co_leaders`; they read the workshop and its
  participants like the main leader (`private.leads_workshop`).
- **Online link:** `workshop_online_links`, read by admins and leaders;
  participants get it from `get_workshop_registration` once confirmed.
- **Blocking:** a published (or completed) workshop writes time off for
  each leader and a room block (widened to the centre's grid), tagged with
  `workshop_id`. A leader or room with a live visit or another workshop
  then is refused (`specialist_busy`, `specialist_away`, `room_busy`).
  These rows change only with the workshop (`delete_time_off` and the room
  exception policies refuse them).
- **Registrations:** `workshop_registrations`, statuses `held`,
  `awaiting_payment`, `confirmed`, `waitlisted`, `offered`, `cancelled`,
  `expired`. Guests use service-role functions: `hold_workshop_seat`,
  `save_workshop_registration_details`, `reserve_workshop_seat` (pay
  later, until seven days before), `confirm_free_workshop_seat`,
  `join_workshop_waitlist`, `get_workshop_registration`,
  `cancel_workshop_registration`, `transfer_workshop_seat`;
  `run_workshop_jobs` ends what has run out. The site reads seats with
  `workshop_availability` (anon). Admins: `confirm_workshop`,
  `cancel_workshop` (returns who to refund).
- **Seat changes lock the workshop row first**, so the last seat goes to
  one person; a freed seat goes to the first on the waitlist for 24 hours.

## The site, signing up and paying (PR 3 and 4)

Migration `20261023090000_workshop_signup.sql`; the site's code is in
`apps/web/src/features/workshops`, `@repo/supabase/workshops` and
`@repo/ui/public-site` (`WorkshopCard`, `WorkshopFacts`).

- **Reading:** `list_public_workshops()` (anon) gives every non-draft
  workshop with its place, its leaders that have a public profile and its
  seats; the pages filter (few workshops). This supersedes the direct table
  reads described above.
- **Signing up:** the bot check (Turnstile), then `hold_workshop_seat` (the
  token in an httpOnly cookie under `/warsztaty`), the details, a code
  (`apply_workshop_discount`), then Stripe, `reserve_workshop_seat` or
  `confirm_free_workshop_seat`; `join_workshop_waitlist` when full.
- **Paying:** `workshop_payments` holds each Checkout Session (the amount is
  checked against the seat). The session says `workshop_reference` in its
  metadata, so the shared Stripe webhook settles it with
  `fulfill_workshop_checkout`. A seat whose hold ran out is still confirmed
  while a seat is free; otherwise `seat_lost`, and the site refunds it.
- **E-mails:** `workshop_emails` claims each kind once (confirmation,
  reserved, waitlisted) with its own link token; the guest's functions
  accept either token.
- **Codes:** `discount_codes.scope` (`consultations`, `workshops` with an
  optional `workshop_id`, `all`). Codes made before this are for
  consultations; a visit refuses a workshops-only code (`code_not_here`).

## After signing up, and the portals (PR 5 and 6)

Migration `20261023170000_workshop_after_signup.sql`.

- **The guest's page:** giving the seat up (a full refund up to 7 days
  before, or at any time after the centre moved the date; later only once
  the waitlist takes the seat), passing it to someone else, leaving the
  waitlist. Refunds go through Stripe from the site.
- **The background job** (every 15 minutes, with the visits'): frees seats
  whose time ran out, offers them to the waitlist, reminds admins of the
  minimum, pays owed refunds and sends the e-mails that are due, each kind
  once.
- **The admin portal** calls the site's `/api/centrum/warsztaty/…` routes
  with the admin's token (money and e-mail live in the site): adding a
  participant, removing one with a refund, a message to everyone. The list,
  the CSV, attendance and "Zakończ warsztat" use the database directly.
- **The specialist portal** shows the workshops the specialist leads, with
  the participants' contact details and attendance; no one else's.

## Participants' data (#183)

Migration `20261025120000_workshop_data_retention.sql`. A participant's
name, e-mail, phone and notes are kept for 12 months after the workshop
(the owner's decision of 24.10), then the nightly `apply_retention`
anonymises them as a client's are: "Uczestnik usunięty", an
`@anonim.invalid` placeholder, no phone, no notes, and the name taken out
of the notifications; `forgotten_at` says when. The reference, the amounts
and the status stay for the books. A seat still owed a refund waits. On
the participant's request the admin removes the data at once ("Usuń dane"
on the workshop's participants, `forget_workshop_participant`), once the
seat is over: the workshop ended, or the seat cancelled or lapsed.

## After launch's P2 (25.10)

- **The list's words** (#210): `workshops_page` in the CMS (Warsztaty tab):
  the top of /warsztaty and the line for no workshop coming.
- **An old address** (#184): changing a non-draft workshop's address keeps
  the old one in `workshop_slug_redirects` (a trigger); the page redirects
  it for good through `workshop_redirect`.
- **The way there** (#211): `locations.directions` ("Jak dojechać", in the
  location's form), under the address on the workshop's and the
  registration's pages and in the e-mails, beside a plain link to the maps.
- **Related** (#185): under a workshop, the leader's services (each once)
  and up to three other workshops still coming.
- **Preview** (#197): "Podgląd" on a draft opens `/warsztaty/podglad/[id]`
  in Draft Mode; the site reads it with `workshop_preview` (secret key).
- **Calendars** (#198): a workshop's blocked time says its confirmed seats
  ("zapisani 5 z 12") in both portals; a confirmed seat's page offers
  "Dodaj do kalendarza" (`/warsztaty/zapis/[token]/kalendarz.ics`, the
  confirmation's event).
- **Attendance** (#193) shows the click at once (`AttendanceCheckbox`).

## Tests

The SQL tests (`supabase/tests/workshop_*.sql`) run in CI. The end-to-end
test (`tests/e2e/workshops.spec.ts`, see `end-to-end-tests.md`) needs
"Warsztat testowy E2E" on the target; `keyboard-zoom.spec.ts` also walks
Warsztaty and the first workshop's page.

## Future extensions (documented, not built)

- **Registrations**: a future `workshop_registrations` table
  (`workshop_id`, client/contact, status, payment reference) would make
  `capacity - confirmed registrations` the real "remaining seats" figure.
  `capacity` and `registration_enabled` already exist precisely so this
  slots in without changing Workshop identity.
- **Payments**: Stripe/Przelewy24 integration attaches to registrations,
  not to `workshops` directly.
- **Scheduling conflicts**: once Appointments/Scheduling exists, a
  published workshop's `specialist_id`/`room_id`/`starts_at`/`ends_at`
  should block the same specialist/room being double-booked elsewhere.
  Those four fields are exactly the stable identity a future conflict
  engine needs; nothing about this phase's design would need to change to
  add that check later.
- **Recurring series**: if a template/occurrence split becomes a real
  requirement, it is introduced as a new layer that _generates_ concrete
  `workshops` rows like this one, not a redesign of this table.
