# Specialist Domain Foundation

## Boundaries

- `auth.users` owns authentication identity.
- `profiles` owns private account data and the compact portal avatar.
- `user_roles` owns authorization assignments.
- `specialists` owns stable specialist business identity and operational state.
- `specialist_public_profiles` owns approved website-facing content.
- `specialist_profile_drafts` owns editable submissions and review history.

Public profile reads never join or expose private account profiles, emails, or roles.

## Public profile data

The public profile uses explicit columns rather than a schemaless payload. Languages,
therapy approaches, specializations, education, certificates, and modalities are
bounded `text[]` values. These are ordered display strings without independent
lifecycle or relationships today. Education and certificates can move to normalized
records later if dates, institutions, verification, or independent editing become
requirements.

`profile_photo_url` and `portrait_photo_url` store paths in the private
`specialist-profile-media` bucket. They are separate from `profiles.avatar_url`:
the avatar is private account/portal identity, while profile and portrait media are
approved public presentation assets.

## Publication workflow

`profile_publication_status` supports `draft`, `pending_review`, `published`, and
`rejected`. The canonical public row is constrained to `draft` or `published`.
Specialists write drafts only through `save_my_specialist_profile_draft` and submit
through `submit_my_specialist_profile_draft`.

Resolved drafts remain as review history. A new edit creates a new draft after a
published or rejected submission, while a pending draft is immutable. Approval
atomically copies the complete draft into the canonical public profile and records
the reviewer, result, comment, and timestamps. Rejection records the same audit
metadata without changing the published profile. Even an admin who is also a
specialist cannot review their own draft.

## Slugs

`specialists.public_slug` is stored, unique, lower-case, and URL-safe. Trusted role
assignment provisions a collision-safe placeholder using the full user UUID. Existing
slugs remain stable. Human-readable SEO slugs can later be assigned through a trusted
admin operation; collisions fail at the database constraint and are never silently
rewritten. Slugs are not derived during public reads.

## Storage

The `specialist-profile-media` bucket is private, limited to 5 MB JPEG, PNG, or WebP
objects. Paths begin with the specialist UUID. A specialist can manage only their own
path; admins can manage valid specialist paths. Anonymous reads are allowed only when
the exact object path is referenced by an active specialist's published canonical
profile. Uploading a draft image alone never makes it public.

## Access model

- Specialists read their own specialist identity, canonical profile, and draft history.
- Specialists save and submit only their own drafts through validated RPC operations.
- Admins read all specialist records and drafts and review through atomic RPCs.
- Anonymous users read only active specialists with published profiles and only safe
  specialist columns.
- Direct client writes to specialist tables are denied; service-role access remains
  server-only.

Public reads use `listPublishedSpecialists` and `getPublishedSpecialistBySlug` from
`@repo/supabase`. Internal callers use explicit specialist and review helpers. These
helpers map generated database rows to client-agnostic domain contracts, so the same
contracts can be consumed by Next.js and a future Expo application.

## Admin management vertical slice

The admin specialist feature lives under `apps/admin/src/features/specialists` and
keeps route files thin. Server loaders compose RLS-protected data-access helpers into
list and detail view models. Client components own local filters and TanStack Query
state, while server actions re-check the admin role before every read or mutation.

The list query uses a lightweight joined summary and does not load complete profile
drafts or service records. Detail loading fetches the specialist, identity, canonical
profile, latest draft, services, and offers, then creates short-lived signed media
URLs. Query keys are scoped to the specialist feature; draft review invalidates the
affected detail and list summary, while offer changes invalidate only that detail.

Admin review continues to use the atomic approval and rejection RPCs. Rejection
comments are required by the shared Zod contract and database operation, not only by
the dialog. Operational specialist and account flags remain read-only because the
current authorization model does not grant direct admin updates to those records.
Existing specialist offers can be activated or paused through the dedicated helper
and their current row-level security policy.
