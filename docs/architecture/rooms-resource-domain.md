# Rooms / Resource Domain

## Room as a physical resource

A room is a physical resource belonging to exactly one location:

```
locations
   ↓
rooms
```

A room is deliberately **not** owned by a specialist. There is no
`specialist_id` column on `rooms`, and none is planned: multiple
specialists may use the same room at different times, and a specialist may
work in different rooms over time. Ownership stops at the location level.
This mirrors how `specialist_services` links a specialist to a _service_
(a catalog concept) without that service belonging to them — a room is the
same kind of shared, location-scoped resource.

## Location ownership and referential integrity

`rooms.location_id` is a required foreign key to `locations.id` with
`ON DELETE RESTRICT`. A location with rooms attached cannot be deleted —
the delete is rejected outright (`foreign_key_violation`), not silently
cascaded. The normal lifecycle for retiring a room or a location is soft
deactivation (`active = false`), which preserves history. This is proven
live by a DB regression test that attempts to delete a location with
attached rooms and confirms it is rejected.

## Slug identity: scoped to the location, not global

`rooms` enforces `UNIQUE (location_id, slug)`, not a globally unique slug.
Kolor Sensu is single-center today but may add locations later, and two
different locations independently having a room called `sala-1` is a
normal, expected naming pattern — a global slug would force every room
name to be prefixed with its location for no product reason. This is
proven live by a DB test: the same slug is accepted in two different
locations, and rejected when repeated within the same location.

## Lifecycle: `active` vs. `publicly_visible`

These are deliberately separate flags, matching the convention already
used by `locations` and `services`:

- `active` — the room is operational and may be scheduled against by
  future domains (Availability, Appointments).
- `publicly_visible` — the room _may_ be exposed on a public page, if a
  future product need calls for it.

Unlike `locations`/`services` (which default `publicly_visible` to
`true`), `rooms` defaults it to `false`. A room being operational does not
imply it should ever be public-facing — most rooms are purely internal
scheduling resources, so public exposure is opt-in here, not opt-out.

## Public/anon access: intentionally not granted yet

No current public page needs room data — Home and `/specjalisci` don't
reference rooms at all. Rather than add an anon `SELECT` policy and a
`PublicRoom` contract that nothing consumes, this foundation grants `anon`
**zero access** to `rooms` (no `GRANT SELECT ... TO anon` at all). This is
proven live by a DB test: an anonymous read attempt fails with
`insufficient_privilege`, the same grant-layer guarantee already used for
`center_settings` and (in the CMS domain) for blocking arbitrary
`site_content` keys — the strongest available proof that nothing is
exposed, not just a restrictive policy that happens to return zero rows.

If a real public need appears later (e.g. showing which rooms a location
offers), add a narrowly-scoped `anon` grant on safe columns only
(`id, name, capacity` — never operational fields) plus a
`listPublicRooms()` helper and a `PublicRoom` contract, following exactly
the `listPublicLocations`/`PublicLocation` pattern already established in
the Center Settings + Locations Domain.

## Capacity

`capacity` is an integer, `NOT NULL DEFAULT 1`, DB-constrained to
`BETWEEN 1 AND 100`. In this phase capacity is metadata only — it
describes the room, it does not yet drive any scheduling or booking
decision. No participant/attendee model exists yet.

## Admin ownership

Admin has full CRUD over rooms, enforced at the database (RLS), not the
UI: `GRANT SELECT, INSERT, UPDATE` to `authenticated`, then `INSERT`/
`UPDATE` policies gated by `has_role('admin')`. There is no `DELETE` grant
for `authenticated` at all — same soft-lifecycle convention as
`locations`/`services`: deactivate, never hard-delete.

## Specialist access: read-only

Specialists can read active rooms (for future scheduling use) via the
same combined `SELECT` policy pattern used by `locations`/`services`:
`has_role('admin') OR (has_role('specialist') AND active)`. Specialists
have **no** `INSERT`/`UPDATE` policy on `rooms` at all — every mutation
attempt (create, update, toggle `active`/`publicly_visible`, delete) is
rejected by RLS. This is proven live by DB tests C/D/J.

## Data-access layer

`packages/supabase/src/rooms.ts` — five explicit, single-purpose
functions, no generic repository abstraction:

- `listRoomsAdmin(client)` — every room with its location name/slug
  joined in (`AdminRoomSummary`), for the admin list view.
- `getRoomByIdAdmin(client, id)`
- `createRoom(client, input)` / `updateRoom(client, id, input)` —
  Zod-validated (`roomCreateSchema`/`roomUpdateSchema`) before the write.
- `disableRoom(client, id)` — soft-deactivation helper, `updateRoom` with
  `active: false`, same shape as `disableLocation`/`disableService`.
- `listActiveRoomsForSpecialist(client)` — the read a specialist is
  allowed, matching what RLS lets through.

No `listPublicRooms()` exists yet — see "Public/anon access" above.

## Contracts

`packages/contracts/src/rooms.ts`: `Room`, `AdminRoomSummary` (extends
`Room` with `locationName`/`locationSlug`), `roomCreateSchema` /
`roomUpdateSchema` (the latter a `.partial()` of the former, same pattern
as `locationUpdateSchema`/`serviceUpdateSchema`), `roomSlugSchema`,
`roomCapacitySchema`. No `PublicRoom` yet, deliberately (see above).

## Minimal admin integration

`/gabinety` is a real, working route today: a Server Component that calls
`listRoomsAdmin()` and renders each room's name, location, capacity, and
active/public-visibility status, with an honest empty state when there are
no rooms. It is intentionally not a full CRUD UI (no create/edit forms,
no reorder) — this phase proves the domain is real and consumable, not
that Admin Gabinety UI is finished. There is no persistent DEV room data:
DEV currently has zero real locations, so zero rooms is the honest,
correct state — no location or room data was invented to make the page
look populated.

## Future relationship to Availability, Appointments, and the Slot Engine

None of the following exist yet and are explicitly out of scope for this
phase:

- **Availability**: a future `room_availability`/blocking model will
  reference `rooms.id` to express when a room is/isn't usable
  (maintenance, closures), analogous to how specialist availability will
  work.
- **Appointments**: a future `appointments` table will reference both a
  specialist and (optionally) a `room_id`, since not every appointment
  necessarily requires a physical room (e.g. an online-only session).
- **Slot Engine**: any future slot-generation logic will need to
  intersect specialist availability, room availability, and existing
  appointments to avoid presenting a bookable slot that's actually
  unavailable.
- **Double-booking prevention**: once appointments exist, a room must not
  be double-booked for overlapping time ranges — this requires an
  exclusion constraint or equivalent check at the appointments layer, not
  in `rooms` itself. `rooms` only needs to exist as a stable, referenceable
  identity for that later work to build on.
- **Workshops**: a future workshop model may reference `room_id` for
  capacity/location, using the same `rooms` table — no separate room
  concept for workshops.

This phase deliberately builds only the stable resource identity
(`rooms`) that all of the above will reference — no availability, booking,
calendar, or slot logic is implemented here.

## Single-center assumption

No tenant/organization concept applies here — see
[ADR 0001](./adr/0001-single-center-product.md).
