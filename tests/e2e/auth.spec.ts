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
      page.getByRole("heading", { name: "Admin Portal" }),
    ).toBeVisible();
    await expect(page.getByText(/Specjaliści: \d+/)).toBeVisible();

    await page.goto(specialistUrl);
    await expect(
      page.getByRole("heading", { name: "Specialist Portal" }),
    ).toBeVisible();
    await expect(page.getByText("Połączona")).toBeVisible();

    await page.getByRole("button", { name: "Wyloguj się" }).click();
    await page.goto(adminUrl);
    await expect(page).toHaveURL(`${adminUrl}/login`);

    await context.close();
  });
});
