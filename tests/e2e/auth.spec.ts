import { expect, test, type Page } from "@playwright/test";
import {
  adminAccount,
  adminUrl,
  dualRoleAccount,
  missingAccount,
  signIn,
  specialistAccount,
  specialistUrl,
} from "./support/target";

async function signOut(page: Page, portalUrl: string) {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(portalUrl);
  await page.getByRole("button", { name: "Menu użytkownika" }).click();
  await page.getByRole("menuitem", { name: "Wyloguj się" }).click();
  await expect(page).toHaveURL(`${portalUrl}/login?status=signed-out`);
  await page.goto(portalUrl);
  await expect(page).toHaveURL(`${portalUrl}/login`);
}

test("anonymous visitors are redirected from the admin portal", async ({
  page,
}) => {
  await page.goto(adminUrl);
  await expect(page).toHaveURL(`${adminUrl}/login`);
  await expect(
    page.getByRole("heading", { name: "Zaloguj się" }),
  ).toBeVisible();
});

test("anonymous visitors are redirected from the specialist portal", async ({
  page,
}) => {
  await page.goto(specialistUrl);
  await expect(page).toHaveURL(`${specialistUrl}/login`);
  await expect(
    page.getByRole("heading", { name: "Zaloguj się" }),
  ).toBeVisible();
});

for (const width of [375, 390, 430, 768, 1280, 1440]) {
  test(`admin login remains usable at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(`${adminUrl}/login`);

    await expect(page.getByLabel("Adres e-mail")).toBeVisible();
    await expect(page.getByLabel("Hasło")).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Zaloguj się" }),
    ).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  });
}

test("admin signs in, moves around the portal and signs out", async ({
  page,
}) => {
  test.skip(!adminAccount, missingAccount);
  await page.setViewportSize({ width: 1280, height: 900 });
  await signIn(page, adminUrl, adminAccount!);

  const nav = page.getByRole("navigation", { name: "Nawigacja portalu" });
  await expect(nav.getByRole("link", { name: "Dashboard" })).toHaveAttribute(
    "aria-current",
    "page",
  );
  await nav.getByRole("link", { name: "Specjaliści" }).click();
  await expect(page).toHaveURL(`${adminUrl}/specjalisci`);
  await expect(nav.getByRole("link", { name: "Specjaliści" })).toHaveAttribute(
    "aria-current",
    "page",
  );

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(
    page.getByRole("navigation", { name: "Nawigacja mobilna" }),
  ).toBeVisible();

  await signOut(page, adminUrl);
});

test("specialist signs in to their portal and signs out", async ({ page }) => {
  test.skip(!specialistAccount, missingAccount);
  await page.setViewportSize({ width: 1280, height: 900 });
  await signIn(page, specialistUrl, specialistAccount!);
  await expect(
    page.getByRole("heading", { name: "Panel główny" }),
  ).toBeVisible();

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(
    page.getByRole("navigation", { name: "Nawigacja mobilna" }),
  ).toBeVisible();

  await signOut(page, specialistUrl);
});

test("an admin who is also a specialist reaches both portals", async ({
  page,
}) => {
  test.skip(!dualRoleAccount, "No account with both roles for this target.");
  await signIn(page, adminUrl, dualRoleAccount!);
  await expect(
    page.getByRole("navigation", { name: "Nawigacja portalu" }),
  ).toBeVisible();
  // The portals are separate sites (separate sessions once deployed).
  await signIn(page, specialistUrl, dualRoleAccount!);
  await expect(
    page.getByRole("heading", { name: "Panel główny" }),
  ).toBeVisible();
});
