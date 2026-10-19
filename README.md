# Kolor Sensu

Production foundation for the Kolor Sensu psychotherapy center. The repository
is a pnpm/Turborepo monorepo containing three independent Next.js applications
and focused shared packages.

## Applications

| Application       | Purpose                                       | Development URL       |
| ----------------- | --------------------------------------------- | --------------------- |
| `apps/web`        | Public website and future appointment booking | http://localhost:3000 |
| `apps/admin`      | Administration portal                         | http://localhost:3001 |
| `apps/specialist` | Specialist portal                             | http://localhost:3002 |

## Commands

```bash
pnpm install
pnpm dev
pnpm build
pnpm lint
pnpm typecheck
pnpm format
pnpm format:check
pnpm supabase:migrations
pnpm supabase:types
```

Copy `.env.example` to an app-local `.env.local` only when a feature needs
environment variables. Never commit secrets. `.env.example` lists every
variable, which app needs it and where it comes from (e.g. the CMS's
shared `CMS_REVALIDATE_SECRET` and `CMS_PREVIEW_SECRET`, set in both web
and admin).

See `docs/architecture/monorepo.md` for ownership and dependency rules.
See `docs/architecture/supabase-foundation.md` for database workflows, secrets,
generated types, RLS, and multi-client boundaries.
