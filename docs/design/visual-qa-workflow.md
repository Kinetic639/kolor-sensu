# Visual QA Workflow

Rendered browser verification is mandatory for every design-screen task.

> **SOURCE CODE REVIEW IS NOT SUFFICIENT FOR UI COMPLETION.**

A screen is not complete until it has been opened in a real browser, inspected
at the required viewport sizes, checked for runtime problems, and visually
matched against the approved reference.

## Required workflow

1. Read the approved reference image.
2. Inspect the existing shared design tokens and components.
3. Implement the screen without duplicating established primitives.
4. Run the relevant application.
5. Open the actual route with Playwright MCP or equivalent browser tooling.
6. Verify desktop rendering at the target reference size.
7. Verify mobile rendering at the target reference size.
8. Compare visual hierarchy against the reference.
9. Check spacing, typography, dimensions, colors, borders, radius, alignment,
   overflow, and responsive behavior.
10. Fix observed discrepancies.
11. Re-open the route and capture a new screenshot.
12. Repeat the compare-and-fix loop until the result is acceptable.
13. Run `pnpm lint`, `pnpm typecheck`, `pnpm build`, and
    `pnpm format:check`.

## Browser checks

For every major screen, browser QA must confirm:

- the intended route and document title;
- the expected primary heading and visible content;
- viewport dimensions actually applied by the browser;
- no horizontal overflow, clipped primary content, or broken wrapping;
- intended controls can be operated with real clicks, typing, or keyboard
  input;
- no JavaScript exceptions, React/Next.js hydration errors, or unexpected
  resource-loading failures;
- desktop, tablet, and mobile behavior is coherent.

Record console findings explicitly. React DevTools suggestions, HMR connection
messages, and the Next.js development indicator are expected in development and
must not be confused with production UI or runtime failures.

Screenshots and DOM/console captures used only as temporary evidence belong in
`artifacts/browser-smoke/`, which is ignored by Git. Never place QA artifacts in
application source or production asset directories.

## Reference image policy

Approved images under `docs/design/references/` are visual implementation
specifications. Before coding, inspect the relevant reference. After coding,
capture the rendered application and compare it visually with that reference.
Iterate on discrepancies before claiming completion.

Use the wording **“visually matched against the approved reference.”** Do not
claim pixel-perfect equality unless dimensions and differences were actually
measured with appropriate comparison tooling.

## Responsive standard

Default validation widths are:

- `1440px`
- `1280px`
- `1024px`
- `768px`
- `430px`
- `390px`
- `375px`

Not every screen requires screenshots at all seven widths, but every major
screen must be rendered and inspected at desktop, tablet, and mobile sizes.
Calendar-heavy views require additional scrutiny around tablet and mobile
adaptation, including overflow, controls, information density, and alternate
layout behavior.

## Completion gate

UI work may be reported complete only when browser evidence supports the claim.
If browser automation is unavailable, disconnected, or unable to open the
application, stop the design task and report the setup blocker instead of
falling back to source-only review.

## Verified baseline

The browser workflow was verified on 2026-09-17 with Playwright MCP against all
three local applications. Navigation, accessibility DOM snapshots, JavaScript
evaluation, viewport resizing, console inspection, browser-history navigation,
and screenshot capture were exercised successfully.

The smoke test rendered each app at `1440x1000`, `1280x800`, `768x1024`,
`390x844`, and `375x812`. All measured viewport widths matched, primary headings
remained visible, and no horizontal overflow was detected. The placeholder apps
do not currently expose product controls, so navigation and DOM inspection were
used to verify browser interaction capability without adding a test-only
feature.
