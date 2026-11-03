import type { Page } from "@playwright/test";

// Where the end-to-end tests run, chosen by E2E_TARGET:
//   local   (default) the three apps started by Playwright on localhost
//   dev     the deployed DEV sites (ks-dev*.ambrasystem.eu)
// Never STAGING: it is the client's, without test data.
// The test accounts come from the environment (the root .env.local, or the
// CI secrets), never from the repository.

export type Target = "local" | "dev";

const targets: Record<
  Target,
  { web: string; admin: string; specialist: string }
> = {
  local: {
    web: "http://localhost:3000",
    admin: "http://localhost:3001",
    specialist: "http://localhost:3002",
  },
  dev: {
    web: "https://ks-dev.ambrasystem.eu",
    admin: "https://ks-dev-admin.ambrasystem.eu",
    specialist: "https://ks-dev-specjalista.ambrasystem.eu",
  },
};

function readTarget(): Target {
  const value = process.env.E2E_TARGET ?? "local";
  if (value === "local" || value === "dev") return value;
  throw new Error(`E2E_TARGET must be local or dev, not "${value}".`);
}

export const target = readTarget();
export const { admin: adminUrl, specialist: specialistUrl } = targets[target];
// E2E_WEB_URL: the site elsewhere, e.g. one started by hand on another port
// while 3000 is taken (with E2E_TARGET=dev: its database, no apps started).
export const webUrl = process.env.E2E_WEB_URL ?? targets[target].web;

export type Credentials = { email: string; password: string };

function credentials(prefix: string): Credentials | null {
  const email = process.env[`${prefix}_EMAIL`];
  const password = process.env[`${prefix}_PASSWORD`];
  return email && password ? { email, password } : null;
}

// The centre's admin, and a specialist without the admin role. Locally and
// on DEV (whose database the local apps use) the admin is "E2E_ANNA".
export const adminAccount = credentials("E2E_ANNA");
export const specialistAccount = credentials("E2E_SPECIALIST");
// Optional: an account with both roles, for the test that it reaches both
// portals (E2E_DUAL_ROLE_*).
export const dualRoleAccount = credentials("E2E_DUAL_ROLE");

export const missingAccount =
  "Set the test account for this target outside the repository (.env.local or CI secrets).";

export async function signIn(
  page: Page,
  portalUrl: string,
  account: Credentials,
) {
  await page.goto(`${portalUrl}/login`);
  await page.getByLabel("Adres e-mail").fill(account.email);
  await page.getByLabel("Hasło").fill(account.password);
  await page.getByRole("button", { name: "Zaloguj się" }).click();
  await page.waitForURL((url) => !url.pathname.startsWith("/login"));
}
