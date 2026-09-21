import { expect, test } from "@playwright/test";

const adminUrl = "http://localhost:3001";
const webUrl = "http://localhost:3000";
const email = process.env.E2E_ANNA_EMAIL;
const password = process.env.E2E_ANNA_PASSWORD;
const specialistEmail = process.env.E2E_SPECIALIST_EMAIL;
const specialistPassword = process.env.E2E_SPECIALIST_PASSWORD;

async function login(
  page: import("@playwright/test").Page,
  user: string,
  secret: string,
) {
  await page.goto(`${adminUrl}/login`);
  await page.getByLabel("Adres e-mail").fill(user);
  await page.getByLabel("Hasło").fill(secret);
  await page.getByRole("button", { name: "Zaloguj się" }).click();
}

test.describe("Admin Warsztaty", () => {
  test.skip(
    !email || !password,
    "Set secure E2E admin credentials outside the repository.",
  );

  test("A-H: admin creates, edits, publishes and cancels a workshop", async ({
    page,
  }) => {
    const slug = `e2e-warsztat-${Date.now()}`;

    // A: Admin opens /warsztaty
    await login(page, email!, password!);
    await page.goto(`${adminUrl}/warsztaty`);
    await expect(
      page.getByRole("heading", { name: "Warsztaty" }),
    ).toBeVisible();

    // B: Admin creates a draft workshop
    await page.getByRole("button", { name: "Dodaj warsztat" }).first().click();
    await page.getByLabel("Tytuł").fill("Warsztat E2E");
    await page.getByLabel("Slug").fill(slug);
    await page
      .getByRole("combobox", { name: "Prowadzący specjalista" })
      .click();
    await page.getByRole("option").first().click();
    await page.getByRole("combobox", { name: "Lokalizacja" }).click();
    await page.getByRole("option").first().click();
    await page.getByLabel("Data").fill("2026-11-01");
    await page.getByLabel("Godzina rozpoczęcia").fill("17:00");
    await page.getByLabel("Godzina zakończenia").fill("19:00");
    await page.getByRole("button", { name: "Utwórz warsztat" }).click();
    await expect(page).toHaveURL(/\/warsztaty\/[0-9a-f-]+$/);

    // C: workshop appears in the Admin list
    await page.goto(`${adminUrl}/warsztaty`);
    await expect(
      page.getByRole("link", { name: "Warsztat E2E" }),
    ).toBeVisible();

    // D: Admin edits the workshop
    await page.getByRole("link", { name: "Warsztat E2E" }).click();
    await page.getByRole("button", { name: "Edytuj warsztat" }).click();
    await page.getByLabel("Tytuł").fill("Warsztat E2E poprawiony");
    await page.getByRole("button", { name: "Zapisz zmiany" }).click();
    await expect(
      page.getByRole("heading", { name: "Warsztat E2E poprawiony" }),
    ).toBeVisible();

    // E: Admin publishes the workshop
    await page.getByRole("button", { name: "Opublikuj" }).click();
    await expect(page.getByText("Opublikowany")).toBeVisible();

    // F: the public page then contains it
    await page.goto(`${webUrl}/warsztaty/${slug}`);
    await expect(
      page.getByRole("heading", { name: "Warsztat E2E poprawiony" }),
    ).toBeVisible();

    // G: Admin cancels the workshop (with confirmation)
    await page.goto(`${adminUrl}/warsztaty`);
    await page.getByRole("link", { name: "Warsztat E2E poprawiony" }).click();
    await page.getByRole("button", { name: "Odwołaj warsztat" }).click();
    await page.getByRole("button", { name: "Tak, odwołaj warsztat" }).click();
    await expect(page.getByText("Odwołany")).toBeVisible();

    // H: public behavior for a cancelled workshop -- addressable, labelled,
    // excluded from the upcoming list.
    await page.goto(`${webUrl}/warsztaty/${slug}`);
    await expect(page.getByText("Odwołany")).toBeVisible();
    await page.goto(`${webUrl}/warsztaty`);
    await expect(
      page.getByRole("heading", { name: "Warsztat E2E poprawiony" }),
    ).toHaveCount(0);
  });

  for (const width of [390, 768, 1440]) {
    test(`workshops list is responsive at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await login(page, email!, password!);
      await page.goto(`${adminUrl}/warsztaty`);
      await expect(
        page.getByRole("heading", { name: "Warsztaty" }),
      ).toBeVisible();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
    });
  }
});

test.describe("specialist-only access", () => {
  test.skip(
    !specialistEmail || !specialistPassword,
    "Set secure specialist-only credentials outside the repository.",
  );

  // I: specialist-only user cannot manage workshops
  test("specialist cannot open Admin Warsztaty", async ({ page }) => {
    await login(page, specialistEmail!, specialistPassword!);
    await page.goto(`${adminUrl}/warsztaty`);
    await expect(page).toHaveURL(`${adminUrl}/access-denied`);
  });
});
