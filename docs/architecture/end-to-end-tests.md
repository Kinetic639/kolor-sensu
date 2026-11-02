# End-to-end tests

Playwright drives a real browser through the three apps: the public site,
the admin portal and the specialist portal. The tests live in `tests/e2e`.

## Where they run

`E2E_TARGET` picks the sites (`tests/e2e/support/target.ts`):

| Target            | Sites                                             | Accounts (env)                                    |
| ----------------- | ------------------------------------------------- | ------------------------------------------------- |
| `local` (default) | Playwright starts the apps on localhost:3000–3002 | `E2E_ANNA_*` (admin), `E2E_SPECIALIST_*`          |
| `dev`             | `ks-dev*.ambrasystem.eu`                          | as `local`                                        |
| `staging`         | `ks-staging*.ambrasystem.eu`                      | `E2E_STAGING_ADMIN_*`, `E2E_STAGING_SPECIALIST_*` |

An account holding both roles is optional (`E2E_DUAL_ROLE_*`, or
`E2E_STAGING_DUAL_ROLE_*`); without it, that one test is skipped.
Each account is `*_EMAIL` plus `*_PASSWORD`. Locally they come from the root
`.env.local` (gitignored, loaded by `playwright.config.ts`); in CI from
secrets. A test whose account is missing is skipped, not failed.

```bash
pnpm test:e2e                          # local
E2E_TARGET=staging pnpm test:e2e       # bash
$env:E2E_TARGET='staging'; pnpm test:e2e   # PowerShell
```

## What they need in the database

The booking test (`booking.spec.ts`) books "Konsultacja testowa E2E" with
"Test Specjalista" (both overridable: `E2E_BOOKING_SERVICE`,
`E2E_BOOKING_SPECIALIST`): a bookable service, the test specialist leading
it in person, their weekly hours in a room that is open then. DEV and
STAGING have it. Stripe is in test mode there (BLIK code `123456`) and
Turnstile uses Cloudflare's always-pass test keys.

Each run of the booking test leaves one confirmed test visit, in a week
picked at random so runs do not all take the same hours.

The payment tests (`payments.spec.ts`) walk the same wizard
(`support/booking.ts`) and pay with Stripe's test cards (a card, one asking
for 3D Secure, a declined one) and with Przelewy24. They run only with
`E2E_PAYMENTS=1`: on STAGING by hand, Actions → Staging E2E → Run workflow
with "payments" ticked. Once they have passed there, the gate goes and they
join every release's run.

The workshop test (`workshops.spec.ts`) needs "Warsztat testowy E2E"
(`warsztat-testowy-e2e`; overridable: `E2E_WORKSHOP_SLUG`,
`E2E_WORKSHOP_TITLE`): published, online, priced (10 zł), with plenty of
seats (500), months ahead, led by "Test Specjalista". The admin makes it
under Warsztaty → Nowy warsztat. DEV and STAGING have it. It checks
Warsztaty and the workshop's page
(one h1, 390 and 1280 px, axe, the Event data for Google), a guest signing
up and paying with BLIK (then the admin and the leader see them), and a
guest reserving to pay later and giving the seat up. Each run leaves one
confirmed test seat.

The home page test (`home.spec.ts`) needs nothing seeded: it checks what
any published content must keep (one h1, the crisis strip, the closing
invitation, links that resolve, no sideways scroll at 390 and 1280 px) and
runs axe (`@axe-core/playwright`, WCAG 2.2 AA) at both widths; it also
checks the shared-link picture (1200 × 630). `crisis-help.spec.ts` walks
from Kontakt's footer to `/pomoc-w-kryzysie`: 112 first, every number
dialling, axe on a phone. `about-pages.spec.ts` checks O nas, Specjaliści (and the first
profile), Gabinety and Kontakt: one h1, links, 390 and 1280 px, axe; the
map waiting for consent; the form's errors (skipped where Turnstile's real
key cannot pass, as on localhost). It writes nothing. `offer-pages.spec.ts`
does the same for Oferta, Cennik and the first service's page (one h1,
links, 390 and 1280 px, axe), and checks that Oferta has no questions,
Cennik its rules, a service's page its way to book or to ask and its data
for Google, and that a wrong address under /oferta leads back to it. `keyboard-zoom.spec.ts` walks the public pages (and the first service and workshop) with
a keyboard: the first Tab is "Przejdź do treści" and leads into the page,
nothing focused hides under the cookie notice (WCAG 2.4.11), and at 200 %
(640 px) no page scrolls sideways. `legal-pages.spec.ts` checks Regulamin, Polityka
prywatności and Pliki cookies: one h1 with the document's headings under it,
links, 390 and 1280 px, axe, the footer's links to each, and their title,
description, canonical address and link preview.

Tests that would leave lasting changes (a service in the catalogue, the
home page's draft) carry the `@writes-data` tag and run only locally.

Tests that hold many times (`booking-hold.spec.ts`, most of
`booking-wizard.spec.ts`) carry `@holds`. The database lets one address
hold 5 times in 15 minutes, and a deployed site counts the real address,
so they run only against a site without a proxy in front: Playwright's own,
or one started by hand and given as `E2E_WEB_URL` (with `E2E_TARGET=dev`
for DEV's database), where each test is a visitor of its own
(`newVisitor`). Start that site with Cloudflare's Turnstile test keys
(`NEXT_PUBLIC_TURNSTILE_SITE_KEY=1x00000000000000000000AA`,
`TURNSTILE_SECRET_KEY=1x0000000000000000000000000000000AA`), and better as a
production build (`next build`, `next start --port 3010`): in `next dev`
the first visit to each page compiles it, too slowly for some tests.

The rest of the suite holds too (a visit, a seat, a waitlist place), more
than 5 times in 15 minutes from one runner. So the web app on DEV and
STAGING has `E2E_BYPASS_KEY` in Vercel (never in production), and a run
with the same `E2E_BYPASS_KEY` (the root `.env.local`, the CI secret)
sends it in `x-e2e-key` (`tests/e2e/support/e2e-key.ts`). The site then
gives each of its holds a fresh visitor key (`holdKey` in
`apps/web/src/features/booking/guards.ts`), so the limits by visitor do
not stop the tests. The limits by e-mail and phone stay, and
`supabase/tests` tests the limits themselves (#345).

## After every STAGING deployment

`.github/workflows/e2e-staging.yml` runs the whole suite against STAGING
once Vercel reports all three apps live with the commit at the head of
`staging`. It needs the four `E2E_STAGING_*` secrets and `E2E_BYPASS_KEY`. A failure keeps the
report and traces as the run's `playwright-report` artifact. It can also be
started by hand from the Actions tab.
