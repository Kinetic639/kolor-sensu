# ADR 0001: Kolor Sensu is a single-center product

## Status

Accepted — 2026-09-20.

## Context

Kolor Sensu needed an admin/business-configuration layer before Rooms,
Services, Availability, Appointments, and CMS can be built. The generic,
"safe-looking" way to build this kind of configuration is to model it as
tenant-scoped data: an `organizations`/`centers` table, membership rows, and
a `center_id`/`organization_id` foreign key threaded through every future
domain table (including the already-shipped `specialists`).

That model solves a problem Kolor Sensu doesn't have. Kolor Sensu is one
business — Kolor Sensu, Centrum Psychoterapii — operated by one
organization, with no product requirement, roadmap item, or stakeholder
request for supporting multiple independent centers, an organization
switcher, or organization self-signup.

## Decision

Kolor Sensu is modeled as a **single-center product**:

- No `organizations`, `centers`-as-tenants, or `center_memberships` tables.
- No `tenant_id`, `organization_id`, or `center_id` column anywhere,
  including on `specialists` (which was deliberately left as-is).
- Center-wide configuration is modeled as **singleton** rows
  (`center_settings`, `center_public_profile`), database-enforced via a
  fixed primary key plus a `CHECK` constraint — not by application/UI
  convention.
- `admin` remains an authorization role on `public.user_roles`, not a
  business entity of its own.
- Physical locations (`locations`) are still modeled as rows, because a
  single center can have more than one physical location — this is about
  tenancy, not geography.

## Consequences

- Every future domain (Rooms, Services, Availability, Appointments,
  Workshops, Clients, CMS) reads center-wide defaults from one row instead
  of joining through a tenant hierarchy, keeping RLS policies and queries
  simpler.
- If Kolor Sensu ever needs to support multiple independent centers in the
  future, that is a deliberate, larger migration (introducing real tenancy
  and backfilling a `center_id` everywhere it would then matter) — not a
  default this codebase should pay for today.
- Documentation and code must avoid introducing tenant/organization language
  or scaffolding "for later"; see
  [admin-center-settings-domain.md](../admin-center-settings-domain.md).
