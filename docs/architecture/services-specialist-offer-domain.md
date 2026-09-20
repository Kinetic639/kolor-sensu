# Services + Specialist Offer/Pricing Foundation

## Boundaries

- `public.services` owns the canonical, Admin-only service catalog — what
  Kolor Sensu offers as a business.
- `public.specialist_services` owns each specialist's own configuration of an
  Admin-defined service — whether and how a specific specialist offers it.
- `public.specialists` (Specialist Domain) and `public.center_settings`/
  `public.locations` (Center Settings Domain) are unchanged and remain the
  sources of truth for specialist identity and center-wide configuration.

## Hard product rule: Admin owns the catalog

Only `admin` (via `public.has_role('admin')`, the same helper used
throughout the codebase) can create, rename, describe, reorder, or change the
visibility/booking-eligibility of a `services` row. A specialist can select
from the existing catalog and configure their own price/modality/duration —
they can never introduce a new global service. This isn't a UI convention:
`specialist_services` has no `name`/`slug`/`description`/`category` columns
at all, so there is nowhere for a specialist to even store a "custom
service," and the database grants/RLS block any specialist write to
`services` regardless of what a client sends (a blocked `INSERT` fails the
`WITH CHECK`; a blocked `UPDATE`'s `USING` clause simply matches zero rows).

## Money

`specialist_services.price_minor` is an integer minor-unit amount (e.g. `25000`
= 250.00 PLN) with `currency_code` stored as a 3-letter ISO 4217 code
(default `PLN`, reusing the same `currencyCodeSchema` introduced for
`center_settings.default_currency`). There is no floating-point currency
anywhere in the domain layer; presentation formatting (e.g. "od 220 zł")
happens only at the UI boundary. `services` intentionally carries no
service-level price — price is always specialist-specific.

## Duration

`services.default_duration_minutes` is the canonical default (15–300 minute
range, DB-constrained). `specialist_services.duration_minutes` is nullable:
`NULL` means "use the service default." The single reusable implementation
of this fallback is `resolveEffectiveDurationMinutes(service, specialistService)`
in `@repo/contracts` — used by the data-access mapper for
`listPublicSpecialistOffersForService` and covered directly by Vitest. No UI
component re-implements this rule.

## Modality

`specialist_services.supports_in_person` and `supports_online` are
independent booleans. A `CHECK` constraint (`NOT active OR supports_in_person
OR supports_online`) makes it structurally impossible for an _active_
offering to support zero modalities; the same rule is duplicated as a Zod
`.refine()` for early client-side feedback. Room assignment and modality-aware
scheduling are future Rooms/Availability concerns, not this domain's.

## Accepting new clients

`specialist_services.accepting_new_clients` is intentionally **service-specific**
and distinct from the existing `specialists.accepting_new_clients` (Specialist
Domain, unchanged). A specialist can accept new clients for one service and
not another; both flags — plus every other precedence state below — must
independently allow a booking before a future booking flow honors it.

## Global-state precedence

An offer is never more available than its parents allow. One source of truth
per concern, never denormalized:

| Concern                        | Table                        | Effect when disabled                     |
| ------------------------------ | ---------------------------- | ---------------------------------------- |
| Service exists operationally   | `services.active`            | offer isn't operational                  |
| Service may be shown publicly  | `services.publicly_visible`  | offer isn't public                       |
| Service may (later) be booked  | `services.booking_enabled`   | offer can't be booked                    |
| Specialist is active           | `specialists.active`         | none of their offers are public/bookable |
| This specific offer is enabled | `specialist_services.active` | this offer isn't available               |

**Effective offer** (operational): `services.active AND specialists.active AND
specialist_services.active`.
**Effective public offer** (what `anon` may see): the above **AND**
`services.publicly_visible`. This is the literal condition encoded in the
`specialist_services` anon RLS policy, via the new `private.service_is_public()`
helper (mirrors the existing `private.specialist_is_active()`, which is reused
— not duplicated — for the specialist half of the same policy).
**Effective bookable offer** (future): the above **AND**
`services.booking_enabled AND specialist_services.accepting_new_clients AND`
at least one matching modality **AND**, later, availability/room rules. No
booking logic is implemented in this phase — only the semantics are
established now so future work has one place to hook into.

## Lifecycle flags

`active`, `publicly_visible`, and `booking_enabled` on `services` are
independent, matching the Center Settings Domain's `active`/`publicly_visible`
split on `locations`. `active = true, publicly_visible = false` is a valid,
meaningful state (an internal service). Deletion is soft: there is no `DELETE`
grant for `authenticated` on either table — `disableService`/
`disableMySpecialistService` just set `active = false`. The foreign keys from
`specialist_services` to `specialists`/`services` are deliberately
`ON DELETE RESTRICT`, not `CASCADE`: this product is built around soft
deactivation, and future Appointments/Payments/reporting/audit history will
anchor on `specialist_services` rows, so even a `service_role`-issued hard
delete of a still-referenced service or specialist fails loudly instead of
silently losing historical offer data.

## Public reads

`listPublicServices`/`getPublicServiceBySlug` use an explicit column list
(never `select('*')`) and only ever return rows RLS already restricted to
`active AND publicly_visible`. `listPublicSpecialistOffersForService` joins
`specialist_services` to `specialists` (for `public_slug`/`professional_title`
only — no private account data) and to `services` (for the default duration
used in the fallback calculation), filtered to `active = true` and the
requested service slug; RLS on all three tables composes to enforce the full
effective-public-offer rule regardless of what the query asks for.

## Category

`services.category` is a Postgres enum (`consultation`, `psychotherapy`,
`couples_therapy`, `assessment`, `workshop_related`, `other`), matching the
existing `app_role`/`profile_publication_status` enum convention rather than
introducing a separate taxonomy table — there's no current requirement (tags,
hierarchies, per-category metadata) that would justify one.

## Seeded DEV data

None. No service rows and no `specialist_services` rows were retained as DEV
data in this phase — inventing example pricing for the two real specialist
records would misrepresent real business data, and the task explicitly
allows "retain zero services if safer." An admin creates the real catalog
later through `createService`.

## Relationship to future domains

Rooms will reference a `location_id` (Center Settings Domain) and, later,
modality/service compatibility from this domain — not the other way around.
Availability and the Slot Engine will read `specialist_services` (price,
duration, modality, accepting-new-clients) as inputs, not own them.
Appointments/Booking will enforce the "effective bookable offer" rule defined
above once they exist. Packages and Workshops are out of scope here and may
introduce their own relationship to `services` later without requiring
changes to this foundation. The single-center assumption (see
[ADR 0001](./adr/0001-single-center-product.md)) still holds throughout: no
`center_id` was added to `services` or `specialist_services`, because there
is only ever one center's catalog.
