# Storybook Guidelines

Kolor Sensu uses one shared Storybook workspace at `apps/storybook`. It discovers colocated stories from shared component packages and does not scan application routes by default.

## Responsibilities

| Tool       | Responsibility                                                                                        |
| ---------- | ----------------------------------------------------------------------------------------------------- |
| Storybook  | Component workshop, visual states, component-level accessibility feedback, and focused interaction QA |
| Vitest     | Domain, utility, and component logic tests                                                            |
| Playwright | Real application pages, responsive QA, accessibility verification, and end-to-end journeys            |

Storybook accessibility checks provide fast component-level feedback. They do not replace Playwright or manual full-page accessibility verification.

## What belongs in Storybook

Default yes:

- shared UI primitives
- reusable layout primitives
- shared visual and interaction states
- scheduling visual primitives
- reusable drawers and modals
- reusable form controls

Default no:

- entire application pages
- route-only compositions
- app-specific business dashboards
- backend-driven flows
- end-to-end journeys

Storybook is not another product application and does not replace the three Next.js applications.

## Story policy

A component should get a story when it is reused, has meaningful visual or interaction states, or forms part of the shared design system. A component does not automatically need a story merely because it exists.

Prefer colocated `*.stories.tsx` files next to reusable components. Keep story sets representative rather than exhaustive, and avoid Storybook bureaucracy.

## Shared visual foundation

Storybook imports Tailwind CSS and `@repo/ui/styles.css`, which in turn loads `@repo/design-system/tokens.css`. It uses the same semantic tokens and shared component source as the applications; Storybook-only product theming is prohibited.

Global decorators are intentionally minimal: a semantic page background, text color, and preview padding. Add application providers or router mocks only to individual stories that genuinely require them.

## Testing and addons

The shared workshop enables Storybook documentation controls, responsive viewport tooling, and the accessibility addon. Stories may use focused `play` functions for meaningful component interactions.

The repository remains on Vitest 5. Storybook 10.6's Vitest addon currently declares support for Vitest 3 and 4 only, so it is not installed. This avoids downgrading the existing test foundation or forcing incompatible peer dependencies. Interaction examples still run in Storybook through native `play` functions and remain separate from the existing Vitest suite.

Chromatic is intentionally not part of this setup.
