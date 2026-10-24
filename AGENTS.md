# Working on Kolor Sensu (for agents)

How changes are made, shipped and tracked here, for every agent (Claude,
Cursor, Codex) in any worktree. The code itself is described in `README.md`
and `docs/architecture/`; each app has its own `AGENTS.md` (read
`apps/*/AGENTS.md` before touching an app: its Next.js has breaking changes).

## Talking to the owner

- Reply in Polish, in plain words (no jargon). Code, commits and docs are in
  English; PR descriptions and GitHub issues are in Polish.
- A plan or a question is not a go-ahead. Show the plan and start when the
  owner says so ("rób"). Small steps inside an approved task need no asking.
- Never put secrets in chat, commits or issues. Test accounts live in the
  root `.env.local` (gitignored); set CI secrets from it without printing
  them. Test e-mail addresses use `@example.invalid`.

## Branches, pull requests, releases

```
feature branch ──PR──▶ develop ──release PR──▶ staging ──▶ main (production, later)
                          │                       │
                    deploys DEV             deploys STAGING + Staging E2E
```

- Branch from `develop`; open the PR **to `develop`** (never to `main`).
  Never push to `develop`, `staging` or `main` (a Husky pre-push hook
  refuses); the owner merges.
- Pre-commit runs Prettier on staged files (lint-staged).
- Before a PR: tests (TDD), typecheck, lint, format. Delete a stale
  `tsconfig.tsbuildinfo` before trusting `tsc`; run `next typegen` after
  adding routes. UI components get Storybook stories.
- PR description: Co / Jak / Sprawdzone, and `Closes #N` for the issue it
  fixes. Before adding commits to an open PR, check it is not merged
  already; if it is, open a new PR.
- CI (`.github/workflows/ci.yml`): format and lint, types, unit tests, and
  the database (every migration on a fresh local Supabase, then
  `supabase/tests/*.sql`).
- A push to `develop` or `staging` runs `deploy.yml`: CI again, then the
  migrations and `supabase config push` for that environment; Vercel builds
  the three apps.
- Vercel does not build working branches (each app's `vercel.json` turns
  off `feat/`, `fix/`, `chore/`, `docs/`, `refactor/`, `test/`, `feature/`
  and `claude/`, to stay within the plan's build limit), so name branches
  with one of these prefixes: a PR then has no preview deployment and no
  Vercel checks. `develop`, `staging` and `main` build as before. A preview
  of one branch can be started by hand from the Vercel dashboard.
- A release is a PR from `develop` to `staging`. Once all three apps are live
  on STAGING, `e2e-staging.yml` runs the Playwright suite against it
  (`docs/architecture/end-to-end-tests.md`). A change to a flow the tests
  walk (booking, sign-in) must keep `tests/e2e` passing:
  `E2E_TARGET=dev pnpm test:e2e`.
- CodeRabbit (free plan) only summarises: read what it says, but review the
  diff yourself.

## Environments

| Env     | Sites                                                           | Supabase                        |
| ------- | --------------------------------------------------------------- | ------------------------------- |
| DEV     | `ks-dev.ambrasystem.eu`, `ks-dev-admin…`, `ks-dev-specjalista…` | `wkvcdjvyoqllzzodbgau` (linked) |
| STAGING | `ks-staging.ambrasystem.eu`, `-admin`, `-specjalista`           | `jmjenrepttbpnwxegauq`          |

Never link the repository to a production project. Stripe and Turnstile are
in test mode on DEV and STAGING (BLIK code `123456`). Leave test data on DEV
unless asked; if a browser is shared with the owner, use an own, isolated
tab.

## Database changes

A new file in `supabase/migrations/` (never edit an applied one), with tests
in `supabase/tests/`. Redefining a function copies its current body whole;
changing what a function returns means checking everything that uses it.

## Miro

The product map is the Miro board (`https://miro.com/app/board/uXjVEaKfAoo=/`).
Reading it has a limit: read the copy in `docs/miro/` first and change the
board in one batch; keep the copy in step with every change
(`docs/miro/README.md`).

## Issues and the board

- Every finding (bug, UX, accessibility, a product question) becomes a
  GitHub issue at once: `gh issue create --body-file` (Polish quotes break
  inline arguments). Sections: Gdzie, Co się dzieje, Co powinno się dziać,
  Jak odtworzyć, Wskazówka. Labels: kind (`bug`, `ux`, `accessibility`,
  `bezpieczeństwo`, `do decyzji`), area (`strona`, `portal-admina`,
  `portal-specjalisty`, `baza`, `infrastruktura`), priority (`P0` blocks
  launch, `P1` before launch, `P2` after).
- The board is GitHub Project #7 (`gh project item-list 7 --owner
Kinetic639`). **Order list** is the owner's queue: take work from its top.
  Move the card as the work goes:

  | When                                   | Status                             |
  | -------------------------------------- | ---------------------------------- |
  | work starts                            | In progress                        |
  | PR open                                | In review                          |
  | merged to `develop` and checked on DEV | Ready (issue stays open)           |
  | released to STAGING, Staging E2E green | close the issue with a note → Done |

  GitHub closes `Closes #N` only on merges to `main`, so closing is done by
  hand. Set the Priority field from the label.
