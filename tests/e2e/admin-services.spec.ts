import { expect, test } from "@playwright/test";

const adminUrl = "http://localhost:3001";
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

test.describe("Admin Oferta", () => {
  test.skip(
    !email || !password,
    "Set secure E2E admin credentials outside the repository.",
  );

  test("admin creates, edits and manages a canonical service", async ({
    page,
  }) => {
    const slug = `e2e-usluga-${Date.now()}`;
    await login(page, email!, password!);
    await page.goto(`${adminUrl}/oferta`);
    await expect(page.getByRole("heading", { name: "Oferta" })).toBeVisible();

    await page.getByRole("button", { name: "Dodaj usługę" }).first().click();
    await page.getByLabel("Nazwa").fill("Usługa E2E");
    await page.getByLabel("Slug").fill(slug);
    await page.getByLabel("Domyślny czas (min)").fill("50");
    await page.getByRole("button", { name: "Utwórz usługę" }).click();
    await expect(page).toHaveURL(/\/oferta\/[0-9a-f-]+$/);
    await expect(
      page.getByRole("heading", { name: "Usługa E2E" }),
    ).toBeVisible();

    await page.getByRole("button", { name: "Edytuj usługę" }).click();
    await page.getByLabel("Nazwa").fill("Usługa E2E poprawiona");
    await page.getByRole("button", { name: "Zapisz zmiany" }).click();
    await expect(
      page.getByRole("heading", { name: "Usługa E2E poprawiona" }),
    ).toBeVisible();

    await page.getByRole("switch", { name: "Widoczna publicznie" }).click();
    await expect(page.getByText("Prywatna")).toBeVisible();

    await page.goto(`${adminUrl}/oferta`);
    await page.getByRole("button", { name: "Dodaj usługę" }).first().click();
    await page.getByLabel("Nazwa").fill("Duplikat E2E");
    await page.getByLabel("Slug").fill(slug);
    await page.getByRole("button", { name: "Utwórz usługę" }).click();
    await expect(
      page.getByText("Usługa z takim slugiem już istnieje."),
    ).toBeVisible();
  });

  for (const width of [390, 768, 1440]) {
    test(`offer list is responsive at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await login(page, email!, password!);
      await page.goto(`${adminUrl}/oferta`);
      await expect(page.getByRole("heading", { name: "Oferta" })).toBeVisible();
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
  test("specialist cannot open Admin Oferta", async ({ page }) => {
    await login(page, specialistEmail!, specialistPassword!);
    await page.goto(`${adminUrl}/oferta`);
    await expect(page).toHaveURL(`${adminUrl}/access-denied`);
  });
});
