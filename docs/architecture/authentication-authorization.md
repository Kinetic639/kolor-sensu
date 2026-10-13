# Authentication and authorization

## Identity model

Kolor Sensu uses one Supabase Auth identity per person. `auth.users` owns the login identity, `public.profiles` owns private application identity data, and `public.user_roles` assigns zero or more portal roles to the same user.

The initial PostgreSQL enum `public.app_role` contains `admin` and `specialist`. An enum keeps invalid role values out of storage and makes generated TypeScript types precise. Future roles are added through forward migrations. The `(user_id, role)` primary key prevents duplicate assignments.

`profiles` is not a public therapist profile. It contains only account-level names, avatar URL, active state, and timestamps. Public biography, specialties, education, certificates, slug, SEO content, and draft workflow belong to the future specialist domain.

## Profile lifecycle

`private.handle_new_auth_user()` runs after an `auth.users` insert and creates the matching profile. It is idempotent, has an empty `search_path`, and cannot be executed by `anon` or `authenticated`. The migration also backfills profiles for any pre-existing identities.

## Role assignment

Authenticated users receive `SELECT` only on their own role rows. They receive no `INSERT`, `UPDATE`, or `DELETE` table grants and no write policies. Roles may be changed only by:

- reviewed forward migrations for deliberate bootstrap changes, or
- trusted backend/admin code using a server-only Supabase secret/service role.

The secret key must never be exposed to a browser, mobile bundle, repository, logs, or test output. A future role-audit table or Auth event pipeline should record actor, subject, old/new role, reason, and timestamp at this trusted write boundary.

`public.has_role(required_role)` accepts no user ID and checks only `auth.uid()`. It is `SECURITY INVOKER`, uses an empty `search_path`, and is executable only by `authenticated`. This prevents using the helper to probe or authorize another identity.

## Row-level security

- Anonymous clients have no table privileges on `profiles` or `user_roles`.
- Authenticated users can read their own profile and own roles.
- Admins can read profiles through the `has_role('admin')` policy.
- No authenticated write policies exist on either table.
- RLS is enabled and forced on both tables.

Profile editing and broader admin role visibility must be added later as explicit, narrow policies rather than permissive `USING (true)` rules.

## Next.js SSR sessions

Both portals use `@supabase/ssr` with the shared typed factories in `packages/supabase`. Each app has:

- a Next.js `proxy.ts` that refreshes cookie sessions with `getClaims()`;
- server clients bound to `cookies()`;
- an optional browser client for non-authoritative UI needs;
- a protected route-group layout that calls the server-side role guard.

Authorization uses `auth.getUser()` plus RLS-protected profile and role reads. TanStack Query and Zustand are not authorization sources. Routes placed under `app/(protected)` inherit protection by default.

The admin app requires `admin`; the specialist app requires `specialist`. A dual-role identity passes both guards. An authenticated account without the portal role receives a safe access-denied screen and is not automatically signed out, so it can still use another authorized portal.

## Auth flows

Each portal provides `/login`, `/forgot-password`, `/reset-password`, `/auth/callback`, and logout. There is no registration screen. Hosted Auth signup is disabled; staff accounts must be invited or created administratively.

Password reset email links return to the portal-specific allowlisted callback, exchange the code for a cookie session, and then permit a password update. Local allowed callbacks are:

- `http://localhost:3001/auth/callback`
- `http://localhost:3002/auth/callback`

Production callback URLs must be added exactly after domains are approved; broad production wildcards are not permitted. Email confirmation is enabled on the linked DEV project. The minimum password length is eight characters.

## Initial Anna account

No Auth user currently exists, so no Anna credentials or duplicate identity were created. The safe bootstrap step is:

1. In Supabase Dashboard, open **Authentication → Users → Invite user**.
2. Invite Anna's real email address once and let her accept the email invitation and set her password.
3. Confirm the resulting single user ID, then assign both `admin` and `specialist` through a reviewed migration or trusted server-side administrative operation.

Passwords must not be supplied to Codex, placed in SQL, or committed. Until this invite is accepted and both role rows exist, authenticated Anna E2E scenarios remain skipped.

## Shared domains and mobile

Local ports share the `localhost` host, so the same cookie session can be used by both portals. For future `admin.<domain>` and `portal.<domain>` deployment, choose either an intentionally scoped parent-domain cookie or a central login/code-exchange flow after the final domains and threat model are approved. No production cookie domain is hardcoded now.

Expo/mobile will use the same `auth.users`, `profiles`, `user_roles`, RLS policies, and role helper. Only client session storage and deep-link callback handling differ; the authorization model is not coupled to Next.js cookies.

## Rate limits and security assumptions

Supabase Auth provides hosted limits for sign-in/sign-up attempts, token refreshes, and token verification. The linked configuration retains those platform controls and email resend frequency; the application does not add a competing rate limiter in this phase. Captcha, WAF rules, suspicious-login monitoring, and stronger password policy can be evaluated when production traffic and domains are known.

Component validation remains accessible: explicit labels, semantic errors/status messages, keyboard-native controls, visible shared focus styles, and password-manager autocomplete attributes. Password fields permit paste.

## Test strategy

- `supabase/tests/auth_authorization.sql` creates three transaction-only identities and proves anonymous denial, own-profile/role reads, role-write denial, cross-user privacy, single-role rejection, dual-role success, and helper safety before rolling back.
- Vitest covers role resolution and auth form schemas without mocking Supabase internals.
- Playwright proves anonymous redirects, responsive login, signing in and out of each portal and the dual-role account; the signed-in scenarios run only when the test accounts are provided outside the repository (see [end-to-end-tests.md](end-to-end-tests.md)).
- Full-page accessibility and real-session behavior remain Playwright/manual QA responsibilities; database tests prove the authorization boundary.

Local database tests require the Docker daemon. When Docker is unavailable, the same transactional SQL is run against the linked DEV database and cleanup is verified afterward.
