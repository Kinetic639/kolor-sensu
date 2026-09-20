import { expect, test } from "@playwright/test";

const adminUrl = "http://localhost:3001";
const specialistUrl = "http://localhost:3002";
const annaEmail = process.env.E2E_ANNA_EMAIL;
const annaPassword = process.env.E2E_ANNA_PASSWORD;

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

test.describe("authenticated dual-role account", () => {
  test.skip(
    !annaEmail || !annaPassword,
    "Set E2E_ANNA_EMAIL and E2E_ANNA_PASSWORD outside the repository.",
  );

  test("dual-role Anna can use both portals and logout", async ({
    browser,
  }) => {
    const context = await browser.newContext();
    const page = await context.newPage();

    await page.goto(`${adminUrl}/login`);
    await page.getByLabel("Adres e-mail").fill(annaEmail!);
    await page.getByLabel("Hasło").fill(annaPassword!);
    await page.getByRole("button", { name: "Zaloguj się" }).click();
    await expect(
      page.getByRole("heading", { name: "Centrum zarządzania ośrodkiem" }),
    ).toBeVisible();
    await expect(
      page.getByRole("navigation", { name: "Nawigacja portalu" }),
    ).toBeVisible();
    await expect(page.getByRole("link", { name: "Dashboard" })).toHaveAttribute(
      "aria-current",
      "page",
    );

    await page.setViewportSize({ width: 1280, height: 900 });
    await page.getByRole("button", { name: "Przełącz nawigację" }).click();
    await expect(page.locator('[data-state="collapsed"]')).toBeVisible();
    await page.getByRole("link", { name: "Specjaliści" }).click();
    await expect(page).toHaveURL(`${adminUrl}/specjalisci`);
    await expect(
      page.getByRole("heading", { name: "Specjaliści" }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Specjaliści" }),
    ).toHaveAttribute("aria-current", "page");

    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(adminUrl);
    await expect(
      page.getByRole("navigation", { name: "Nawigacja mobilna" }),
    ).toBeVisible();

    await page.goto(specialistUrl);
    await expect(
      page.getByRole("heading", { name: "Panel główny" }),
    ).toBeVisible();
    await expect(
      page.getByRole("navigation", { name: "Nawigacja mobilna" }),
    ).toBeVisible();

    await page.setViewportSize({ width: 768, height: 1024 });
    await page.reload();
    await page.getByRole("button", { name: "Przełącz nawigację" }).click();
    await expect(
      page.getByRole("dialog", { name: "Nawigacja portalu" }),
    ).toBeVisible();

    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto(specialistUrl);
    await page.getByRole("button", { name: "Menu użytkownika" }).click();
    await page.getByRole("menuitem", { name: "Wyloguj się" }).click();
    await page.goto(adminUrl);
    await expect(page).toHaveURL(`${adminUrl}/login`);

    await context.close();
  });
});
