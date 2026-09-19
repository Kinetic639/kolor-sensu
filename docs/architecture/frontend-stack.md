# Frontend Stack

The frontend stack separates accessible behavior, visual foundations, remote
state, local UI state, domain helpers, fixtures, and transport mocks. Libraries
are installed in the workspace that owns their responsibility rather than at the
repository root.

## Stack summary

| Concern              | Library                            | Responsibility                                     | Owner                                                 |
| -------------------- | ---------------------------------- | -------------------------------------------------- | ----------------------------------------------------- |
| Primitives           | shadcn-compatible Radix components | Accessible component behavior                      | `packages/ui`                                         |
| Styling              | Tailwind CSS                       | Utility styling over semantic tokens               | apps and `packages/ui`                                |
| Variants             | Class Variance Authority           | Typed component variants                           | `packages/ui`                                         |
| Class composition    | clsx + tailwind-merge              | Conditional and conflict-safe classes              | `packages/ui`                                         |
| Icons                | Lucide React                       | Shared interface icons                             | `packages/ui`                                         |
| Server state         | TanStack Query                     | Remote/backend async data                          | `packages/app-runtime`                                |
| Client state         | Zustand                            | Local UI and workflow state                        | `packages/app-runtime`, instantiated by features      |
| Forms                | React Hook Form                    | Form state and submission                          | `packages/ui` when shared; apps when feature-specific |
| Validation           | Zod                                | Runtime schemas and reusable contracts             | `packages/contracts` and feature modules              |
| Dates                | date-fns + date-fns-tz             | Date calculations, locale, and timezone display    | `packages/scheduling`                                 |
| Drag and drop        | DnD Kit                            | Interaction layer for future scheduling/reordering | `packages/scheduling`                                 |
| Unit/component tests | Vitest + React Testing Library     | Fast logic and DOM behavior tests                  | Tested workspace packages                             |
| Mock API             | MSW                                | Transport-level request mocking                    | `packages/mock-api`                                   |
| Fixtures             | Repository fixtures                | Canonical demo objects and factories               | `packages/mock-data`                                  |
| Toasts               | Sonner                             | Shared lightweight notification renderer           | `packages/ui`                                         |
| E2E/visual QA        | Playwright MCP                     | Rendered browser validation                        | External verified tooling                             |

## UI primitive strategy

`packages/ui` contains the shared shadcn-compatible component source. Apps must
not generate independent copies of the same primitives. The package currently
proves the integration with Button, Input, Label, Dialog, Sheet, Tabs, Select,
Tooltip, Switch, Checkbox, and Popover. Radix supplies behavior and accessibility;
Tailwind classes consume semantic CSS variables supplied by the design system.

The configuration in `packages/ui/components.json` is the target for future
shadcn CLI additions. Add components selectively from that directory and review
generated styling before keeping it. Default shadcn visuals are not the Kolor
Sensu design language.

Business components, route composition, and feature policy remain inside the
owning app. `packages/ui` must not become a dashboard or booking-component dump.

## Semantic styling

Shared primitives use semantic variables such as `--background`, `--surface`,
`--surface-muted`, `--primary`, `--primary-soft`, `--text`, `--text-muted`, and
`--border`. Accent placeholders are also available for mint, blue, lilac, peach,
and rose. Their current neutral values are temporary and must be replaced only
during the approved visual-design phase.

Every app explicitly scans `packages/ui/src`, so Tailwind retains shared package
classes in production builds.

## State management rules

TanStack Query owns remote, server, and asynchronous backend data. Specialists,
appointments, rooms, services, and similar persisted records must not be copied
into Zustand stores.

Zustand is for local UI or workflow state such as booking-step progress, calendar
filters, panel disclosure, and unsaved local drafts. Prefer feature-local store
instances. `createDisclosureStore` demonstrates an isolated factory rather than
one global application store.

`QueryProvider` creates a new QueryClient during server rendering and reuses one
browser client. Queries are considered fresh for one minute, do not refetch on
window focus, and retry once. React Query Devtools render only in development.
Apps compose QueryProvider and the toast renderer explicitly; there is no giant
provider that silently enables unrelated infrastructure.

## Forms and validation

React Hook Form owns form interaction state. Zod owns runtime validation.
Reusable domain schemas belong in `packages/contracts`; feature-specific schemas
belong in a stable feature module, not inline in arbitrary page components.
Schemas may be reused by forms, request parsing, and tests. The UI tests include a
validated-submit example using `zodResolver` without introducing a product form.

## Dates and drag interactions

Future backends must persist instants in UTC. User-facing dates are formatted in
the configured timezone, currently defaulting to `Europe/Warsaw`, with Polish
locale support where appropriate. Shared calendar/date calculations belong in
`packages/scheduling` rather than components.

DnD Kit is reserved for availability block movement/resizing, calendar event
movement, and optional content ordering. It is an interaction adapter only;
scheduling domain state and commands must not depend directly on DnD event
objects.

## Data and mocking

`packages/mock-data` owns canonical fixture objects and factories.
`packages/mock-api` owns MSW handlers that expose fixtures through mocked HTTP
transport. MSW does not replace mock-data, define the production API, or run on
every placeholder page. Tests opt into the Node server; browser mocks are enabled
explicitly by an app when a development scenario needs them.

## Testing strategy

Vitest runs per workspace through Turborepo. Logic tests use the Node environment;
React component tests use jsdom, React Testing Library, jest-dom matchers, and
user-event. Current smoke coverage verifies shared Button interaction, React Hook
Form with Zod validation, isolated Zustand store instances, timezone formatting,
and an MSW handler backed by canonical fixture data.

Use `pnpm test` for watch mode and `pnpm test:run` for a deterministic single
run. Browser and visual acceptance remain in the verified Playwright workflow.

## Intentionally not adopted

The foundation does not include Redux, MobX, XState, GraphQL, tRPC, Storybook,
Sentry, OpenTelemetry, Supabase, payment SDKs, dashboard templates, data tables,
calendar UI, command palettes, or chart systems. Those require explicit future
product or architecture decisions.
