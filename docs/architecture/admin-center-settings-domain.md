# Admin / Center Settings & Location Foundation

## Single-center product decision

Kolor Sensu is one business — Kolor Sensu, Centrum Psychoterapii — not a
multi-tenant SaaS platform. There is no organization creation flow, no
organization switcher, and no `organization_id`/`tenant_id`/`center_id`
anywhere in the schema. The whole application represents this one business, so
business-wide configuration is modeled as **singleton** rows rather than
tenant-scoped data. See
[ADR 0001](./adr/0001-single-center-product.md) for the durable rationale.

This is also why `public.specialists` was **not** retrofitted with a
`center_id` foreign key: there is only ever one center to belong to, so the
column would carry no information and would only invite premature
multi-tenant machinery. The Specialist Domain (see
[specialist-domain.md](./specialist-domain.md)) is unchanged by this phase.

## Admin is a role, not an entity

There is no `admins` table. `admin` is one value of the existing
`public.app_role` enum, assigned through `public.user_roles` exactly like
`specialist`. Authorization for this domain reuses `public.has_role('admin')`
— the same `SECURITY INVOKER` helper the auth foundation and Specialist
Domain already use (see
[authentication-authorization.md](./authentication-authorization.md)). No new
role-check function was introduced.

## Singleton tables

`public.center_settings` and `public.center_public_profile` each enforce
"exactly one row" at the database level, not by UI convention: the primary
key is a fixed `integer` (`id = 1`) with a `CHECK (id = 1)` constraint. Any
attempt to insert a second row — whether with `id = 1` (primary key
collision) or any other `id` (check violation) — is rejected by Postgres
itself, regardless of caller privilege. Both singleton rows are seeded once,
in the foundation migration, with only the data already known to be real:
`business_name` / `display_name = 'Kolor Sensu'`. Every other field starts
`NULL` (or, for `center_public_profile.published`, `false`) rather than
fabricated.

## Internal vs. public data

- **`center_settings`** is internal operational configuration: booking
  defaults, cancellation policy, timezone/locale/currency, and private
  contact fields. Only `admin` can read or write it. Nobody else —
  including `specialist` and `anon` — has any table privilege on it at all.
- **`center_public_profile`** is the stable public business identity
  (display name, short description, logo, public contact details, socials).
  `admin` can read and write it; `specialist` can read it (it is the "basic
  center identity" a specialist needs); `anon` can read it only when
  `published = true`. It is **not** CMS content — no hero sections, no
  articles. That belongs to a future CMS domain.

This mirrors the separation already established between `profiles` (private
account data) and `specialist_public_profiles` (approved public content) in
the Specialist Domain.

## Locations

`public.locations` models the physical places Kolor Sensu operates from,
independent of any tenant concept — future Rooms, Availability, and
Appointments will reference a location, not a center. Two independent flags
control visibility:

- `active` — whether the location is currently operational at all.
- `publicly_visible` — whether an operational location should also appear on
  the public website/booking flow. A location can be `active` (used
  internally, e.g. by specialists) without yet being `publicly_visible`.

`admin` can read/create/update all locations (including disabling one by
setting `active = false` — there is no hard delete). `specialist` can read
only `active` locations. `anon` can read only locations that are both
`active` and `publicly_visible`, through explicit-column public queries, not
`select('*')`.

No location row was seeded in this phase: no real address for Kolor Sensu
exists yet anywhere in the repository or project context, and the task
requires not fabricating one. An admin creates the first real location later
through `createLocation()`.

## Booking-default semantics

`center_settings` carries **defaults**, not per-service or per-specialist
overrides (those don't exist yet and aren't built here):

- `booking_enabled` — master switch for whether public booking is live at
  all. Starts `false`: booking isn't implemented yet.
- `default_visit_buffer_minutes` — default buffer around an appointment.
- `min_booking_lead_minutes` — minimum notice before a publicly bookable slot.
- `max_booking_horizon_days` — how far into the future public booking is
  exposed.
- `cancellation_window_hours` — the center-level default cancellation
  threshold.

## Timezone and currency

`center_settings.timezone` is the canonical IANA timezone (`Europe/Warsaw`)
that all future scheduling will be interpreted against. Database timestamps
remain UTC instants (`timestamptz`); display/scheduling logic converts using
this single configured timezone rather than hardcoding it per app.
`default_currency` stores a 3-letter ISO 4217 code (`PLN`), not a symbol;
future money amounts will use integer minor units once pricing exists.

## Data access

Every mutation in this domain is direct, RLS-protected CRUD — no RPCs.
Unlike the Specialist Domain's draft/publish workflow (which needs atomic,
multi-step, self-review-proof operations and therefore uses `SECURITY
DEFINER` functions), nothing here requires cross-row atomicity or an
invariant that RLS alone can't express. `packages/supabase/src/center.ts`
exposes `getCenterSettings`/`updateCenterSettings`,
`getCenterPublicProfile`/`updateCenterPublicProfile`,
`listLocations`/`getLocationById`/`createLocation`/`updateLocation`/`disableLocation`,
and the anon-safe `getPublicCenterProfile`/`listPublicLocations` (explicit
column selection, never `select('*')`) for public/web use.

## Relationship to future domains

Rooms, Services, Availability, Appointments, Workshops, Clients, and CMS all
build on this foundation later: Rooms will belong to a `location_id`;
booking defaults here become the fallback when a service/specialist doesn't
override them; the public profile becomes the source for SEO organization
metadata. None of that is implemented in this phase.
