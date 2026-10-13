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

Tests that would leave lasting changes (a service in the catalogue, the
home page's draft) carry the `@writes-data` tag and run only locally.

## After every STAGING deployment

`.github/workflows/e2e-staging.yml` runs the whole suite against STAGING
once Vercel reports all three apps live with the commit at the head of
`staging`. It needs the four `E2E_STAGING_*` secrets. A failure keeps the
report and traces as the run's `playwright-report` artifact. It can also be
started by hand from the Actions tab.
