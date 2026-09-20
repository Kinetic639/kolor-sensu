# Portal feature integration

## 1. Protected portal shell

Every protected Admin and Specialist route is rendered inside the shared `PortalShell` from `packages/ui`. The server layout performs the role guard, reads the authenticated profile and roles, and passes only serializable user context into the small interactive shell boundary. Authentication remains server-authoritative.

## 2. Shared navigation configuration

Admin and Specialist define typed navigation data in their own `src/lib/portal-navigation.ts` files. Both configurations render through the same `AppSidebar` and `MobileBottomNav`; route matching is derived from the current pathname and supports nested routes. Navigation labels are Polish and route slugs are consistently Polish.

## 3. Shared and domain-specific components

Generic portal chrome, dashboard presentation, empty states, and interaction primitives belong in `packages/ui`. Domain-specific fetching, permissions, mutations, and view-model mapping belong at the app or feature boundary. Apps must not fork the shared shell or create a second UI layer.

## 4. shadcn primitive strategy

Use mature shadcn/Radix-compatible primitives for generic behavior such as Sidebar, Sheet, DropdownMenu, Avatar, Button, Tooltip, and Badge. Product-specific Kolor Sensu components compose those primitives and use semantic tokens from `packages/design-system`; default shadcn visual styling is not the product identity.

## 5. Route structure

Admin routes are `/`, `/kalendarz`, `/specjalisci`, `/gabinety`, `/oferta`, `/klienci`, `/cms`, and `/ustawienia`. Specialist routes are `/`, `/kalendarz`, `/dostepnosc`, `/uslugi`, `/profil`, and `/ustawienia`. Unimplemented destinations remain honest placeholders inside the production shell rather than fake functional screens.

## 6. Feature pipeline

Future features follow this pipeline:

`domain/backend → packages/supabase data access → app feature/query layer → view model → shared or domain UI → protected portal route`

Raw Supabase rows should not become presentation contracts. Pages or feature modules map domain results into stable UI view models. Missing domains use explicit loading, empty, or unavailable states rather than fabricated data.

## 7. Storybook role

Storybook is the component workshop for shared primitives, reusable product components, canonical shell states, responsive states, accessibility feedback, and focused interaction examples. Fixtures are allowed in stories to demonstrate visual states. Storybook is not a product route or backend integration environment.

## 8. Playwright role

Playwright verifies real applications, authentication, role boundaries, route navigation, responsive behavior, browser console health, and end-to-end journeys. It complements component tests and Storybook accessibility checks; neither replaces real-page verification.

## 9. Adding future portal features

Add the backend/domain contract first, expose focused data-access helpers, create a feature/query boundary, map results to view models, build reusable states in `packages/ui` only when genuinely shared, add the route under the existing protected layout, then cover reusable states in Storybook and the real workflow in Playwright. Do not recreate sidebar, header, auth state, or global shell providers in a feature.

## 10. Backend and UI advance together

A backend domain is not complete from the product perspective until its authorized portal workflow is integrated and verified. Conversely, portal UI must not simulate nonexistent backend semantics. Backend capability and user-facing integration should advance together through the same documented pipeline.

## 11. Admin Oferta vertical slice

Admin Oferta is the second real Admin vertical slice after Specialists. The existing
Services Domain and shared Zod contracts remain authoritative. Server loaders compose
catalog summaries and per-service specialist offers into route-specific view models;
raw database rows do not reach presentation components.

`servicesKeys` scopes list, detail, and offer queries. Server-rendered initial data
prevents blank client loading, while TanStack Query owns refreshes and mutations.
Create and edit forms use React Hook Form with `serviceCreateSchema`; lifecycle
mutations update only the affected service and invalidate service list/detail keys.

The list summary loads offer counts in one joined query and never fetches every offer
payload. Detail loading fetches one service and its specialist offers in parallel.
Specialist prices, modality, duration overrides, and client acceptance remain in
`specialist_services` and are displayed read-only. Playwright covers the real Admin
workflow, responsive widths, duplicate-safe errors, and role boundaries when secure
credentials are available.

## 12. Admin Gabinety vertical slice

Admin Gabinety is a complete resource-management slice. `/gabinety` composes
location management, room creation, search and lifecycle filters from server-loaded
initial data and focused TanStack Query invalidation. `/gabinety/[id]` independently
loads operational room data, public presentation, recurring opening hours and
date-specific resource exceptions.

RHF forms use the shared Location/Room Zod contracts. Opening hours are replaced by
one atomic database operation; availability exceptions remain a date-oriented list,
not a calendar. The UI intentionally says “resource availability” and never models
specialist working time. Reusable status/exception presentation lives in
`packages/ui`; permissions, mutations and room-domain behavior remain in the feature
and Supabase packages.
