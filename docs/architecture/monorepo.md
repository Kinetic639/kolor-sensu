# Monorepo Architecture

## Applications

- `apps/web` owns the public website and the future appointment booking flow.
- `apps/admin` owns operational and administrative workflows.
- `apps/specialist` owns specialist-facing workflows.

Each application is independently deployable. Routes, layouts, application
state, feature composition, and app-specific business rules stay in the app
that owns them.

## Shared packages

- `packages/ui` contains reusable, presentational React primitives. It may
  depend on `packages/design-system` and must stay free of application policy.
- `packages/design-system` contains approved design tokens and typography
  foundations. Current values are placeholders for the visual-design phase.
- `packages/contracts` contains intentionally small shared domain types.
- `packages/mock-data` contains deterministic demo data for development and
  future scenarios. It may depend on `packages/contracts`.
- `packages/scheduling` is reserved for framework-agnostic scheduling
  primitives. It may depend on `packages/contracts`.
- `packages/app-runtime` contains cross-application runtime infrastructure such
  as the TanStack Query provider and local UI-store factories.
- `packages/mock-api` contains MSW transport handlers backed by fixtures from
  `packages/mock-data`.
- `packages/supabase` contains typed, application-independent Supabase client
  factories and environment validation. Applications retain their own session
  adapters and authorization policy.
- `packages/config` contains shared TypeScript and ESLint configuration.

## Import boundaries

Applications may import shared packages through their public package exports.
Shared packages must not import from `apps/*`. Package-to-package dependencies
must follow this direction:

```text
apps/* -> ui -> design-system
apps/* -> contracts
apps/* -> mock-data -> contracts
apps/* -> scheduling -> contracts
apps/* -> app-runtime
apps/* -> supabase -> contracts
mock-api -> mock-data -> contracts
apps/* -> config
```

Circular dependencies are not allowed. Do not reach into another package's
private source paths; add an explicit export instead.

## What should not be shared

Do not move code into a package merely because two files look similar. Keep
route handlers, screens, app navigation, authorization decisions, data-access
adapters, and feature-specific business rules in their owning application
until a stable cross-app contract is proven.

Application-specific data adapters, authentication, payments, and
notifications require separate architectural decisions in later phases. The
shared Supabase foundation is documented in `supabase-foundation.md`.
