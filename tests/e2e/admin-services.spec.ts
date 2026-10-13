import { expect, test } from "@playwright/test";
import {
  adminAccount,
  adminUrl,
  missingAccount,
  signIn,
  specialistAccount,
} from "./support/target";

test.describe("Admin Oferta", () => {
  test.skip(!adminAccount, missingAccount);

  // Each run adds a service (inactive and hidden), so it runs only locally.
  test(
    "admin creates a service and cannot reuse its address",
    { tag: "@writes-data" },
    async ({ page }) => {
      const slug = `e2e-usluga-${Date.now()}`;
      await signIn(page, adminUrl, adminAccount!);
      await page.goto(`${adminUrl}/oferta`);

      const create = async (name: string) => {
        await page.getByRole("button", { name: "Dodaj usługę" }).click();
        const dialog = page.getByRole("dialog", { name: "Nowa usługa" });
        await dialog.getByLabel("Nazwa").fill(name);
        await dialog.getByLabel("Adres na stronie").fill(slug);
        await dialog.getByRole("switch", { name: "Usługa aktywna" }).click();
        await dialog
          .getByRole("switch", { name: "Widoczna publicznie" })
          .click();
        await dialog.getByRole("button", { name: "Utwórz usługę" }).click();
        return dialog;
      };

      await create("Usługa E2E");
      await expect(page).toHaveURL(/\/oferta\/[0-9a-f-]+$/);
      await expect(
        page.getByRole("heading", { name: "Usługa E2E", level: 1 }),
      ).toBeVisible();

      await page.goto(`${adminUrl}/oferta`);
      const dialog = await create("Duplikat E2E");
      await expect(
        dialog.getByText("Usługa z takim adresem już istnieje."),
      ).toBeVisible();
    },
  );

  for (const width of [390, 768, 1440]) {
    test(`offer list is responsive at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await signIn(page, adminUrl, adminAccount!);
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
  test.skip(!specialistAccount, missingAccount);
  test("specialist cannot open Admin Oferta", async ({ page }) => {
    await signIn(page, adminUrl, specialistAccount!);
    await page.goto(`${adminUrl}/oferta`);
    await expect(page).toHaveURL(`${adminUrl}/access-denied`);
  });
});
