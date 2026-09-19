# Supabase Foundation

## Project identity

The linked Supabase project is the shared **remote development** backend for Kolor Sensu.

| Property     | Value                  |
| ------------ | ---------------------- |
| Project name | `Kolor Sensu`          |
| Project ref  | `jawduzlwnicjfhlkipzi` |
| Organization | `kolor sensu`          |
| Region       | `eu-central-1`         |
| PostgreSQL   | 17                     |

Production must use a separate Supabase project. Never treat this development project as production.

## Responsibilities

- **Repository files and Supabase CLI** are the canonical source of truth for local configuration, migrations, and generated types.
- **Supabase MCP** inspects and independently verifies the live remote project. It is not a substitute for committed migration files.
- **Git** records every durable schema change through forward-only migrations.

The expected workflow is:

1. Create and edit a repository migration.
2. Review it and verify locally when Docker is available.
3. Apply it to remote development with the linked CLI.
4. Verify the live state independently through MCP.
5. Regenerate database types.
6. Run tests and commit the migration together with generated types.

## Repository layout

```text
supabase/
  config.toml
  migrations/
  seed.sql
  tests/

packages/contracts/src/database.types.ts
packages/supabase/src/
  browser.ts
  env.ts
  server.ts
```

`packages/contracts/src/database.types.ts` is generated output and must not be edited manually. `packages/supabase` provides typed browser and server factories without binding them to any application router, cookie implementation, or authorization model.

## Environment and secrets

Each Next.js application will place its real values in its own ignored `.env.local` file. The committed `.env.example` contains placeholders only.

Client-safe variables:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

Future server-only variable:

- `SUPABASE_SECRET_KEY`

Secret keys and legacy `service_role` credentials must never be included in browser or mobile bundles, committed to Git, logged, or prefixed with `NEXT_PUBLIC_`. Public and secret configuration are validated independently so client code cannot accidentally require or receive the server secret.

## Client architecture

All clients share the generated `Database` type and backend contracts, but session storage remains platform-specific.

- **Next.js web/admin/specialist:** use the `@repo/supabase/browser` and `@repo/supabase/server` factories. Applications will own their cookie adapter when authentication is implemented.
- **Future Expo/mobile:** use `@supabase/supabase-js` with the same generated `Database` type and a native secure-storage session adapter. Mobile must not import the SSR cookie factory.

No auth middleware, cookie binding, route guard, login flow, or role model is implemented in this phase.

## Generated database types

Generate types from the linked remote development project:

```bash
pnpm supabase:types
```

Regenerate after every applied and verified schema migration. Commit the generated file in the same change as the migration.

## CLI commands

```bash
pnpm supabase:start
pnpm supabase:status
pnpm supabase:stop
pnpm supabase:migration:new -- descriptive_name
pnpm supabase:migrations
pnpm supabase:types
```

The CLI is a pinned root development dependency; a global installation is not required. The local link is stored under ignored `supabase/.temp/` state.

## Environments

- **Local:** schema development, resets, and database tests when Docker is available.
- **Remote DEV:** shared integration verification through the linked `Kolor Sensu` project.
- **Production:** a separate project created and linked only when production deployment is intentionally established.

Docker is installed on the current workstation, but its daemon was unavailable during foundation setup. Local Supabase start/status/stop therefore could not be validated; remote development workflows were verified instead.

## Migration discipline

- Use forward migrations only.
- Never edit a migration already applied remotely.
- Keep every durable schema change in Git.
- Do not use MCP for undocumented durable schema changes.
- Verify important remote changes through MCP.
- Regenerate database types after schema changes.
- Prefer compensating forward migrations over rewriting history.

Preferred command sequence:

```bash
pnpm supabase:migration:new -- descriptive_name
pnpm supabase:start
pnpm exec supabase db reset
pnpm exec supabase db push --linked --dry-run
pnpm exec supabase db push --linked
pnpm supabase:types
```

Skip local commands only when the Docker limitation is explicit and remote development verification is appropriate.

## RLS and grants baseline

Every application table must:

1. Have RLS enabled.
2. Use explicit grants.
3. Use explicit policies.
4. Default to deny.
5. Have authorization behavior tested.
6. Never rely on hidden UI for security.

Local configuration sets `api.auto_expose_new_tables = false`, requiring explicit Data API grants. The remote development project also has the active `ensure_rls` event trigger. It executes `public.rls_auto_enable()` after `CREATE TABLE`, `CREATE TABLE AS`, and `SELECT INTO` and enables RLS for tables created in `public`.

The automatic mechanism is defense in depth, not a replacement for explicit migration SQL, grants, policies, or tests. Service/secret-role credentials bypass RLS and must never be used by browser or mobile clients.

The dashboard-created trigger function is `SECURITY DEFINER`. A committed hardening migration revokes direct execution from `PUBLIC`, `anon`, and `authenticated` while preserving execution by `postgres` and the active event trigger. Supabase security and performance advisors are clean after this change.

## Verified remote write path

Two committed forward migrations prove the repository workflow:

1. `connectivity_probe_create` created a disposable public table and explicitly revoked `anon` and `authenticated` access.
2. MCP verified the table existed, contained no rows, and had RLS automatically enabled.
3. `connectivity_probe_remove` dropped the table.
4. MCP verified zero residual connectivity-probe objects and an empty final public schema.
5. `harden_automatic_rls_function_permissions` removed unnecessary API-role execution access from the trigger function without disabling automatic RLS.

The migration history remains as an intentional audit record; the temporary database object does not.

## Shared backend principle

One Supabase backend will serve `apps/web`, `apps/admin`, `apps/specialist`, and a future mobile application. Database contracts and critical operations must not become coupled to one frontend.

Booking, rescheduling, cancellation, room assignment, package consumption, workshop registration, and payment reconciliation must eventually be canonical backend/database/server operations rather than separately reimplemented by each client.

## Future authentication direction

Authentication is deliberately deferred. The next phase will implement one identity per human with multiple roles, not separate accounts per application.

The expected model is:

```text
auth.users
    ↓
profiles
    ↓
user_roles
```

A separate specialist domain profile will hold specialist-specific data. Admin and specialist applications will independently authorize the required role against the same identity and backend.

Next.js applications will use Supabase SSR with secure cookie-based sessions. Future mobile clients will use Supabase JS with native secure storage. Shared contracts must remain independent of either session mechanism.

## MCP verification scope

Verified through MCP:

- Project metadata and health.
- Schemas and tables.
- Safe SQL/catalog queries.
- Database functions and the RLS event trigger.
- RLS state and policies.
- Migration history.
- Database roles and table grants.
- Installed extensions.
- High-level auth schema presence and aggregate state.

The current MCP tool surface does not expose database logs or detailed hosted Auth configuration. Those capabilities are not claimed; use the Supabase dashboard/CLI when they are required.
