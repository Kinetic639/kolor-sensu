import { readFile } from "node:fs/promises";
import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import {
  bookUntilPayment,
  expectConfirmed,
  findVisit,
  payButton,
  paymentElement,
} from "./support/booking";
import {
  adminAccount,
  adminUrl,
  missingAccount,
  specialistAccount,
  specialistUrl,
  webUrl,
} from "./support/target";
import { service, specialist } from "./support/booking";

// A guest books, pays with BLIK and the visit shows up in both portals:
// the path every release must keep working (the wizard's needs:
// ./support/booking.ts). Payments are Stripe's test mode (BLIK code
// 123456) and Turnstile uses its always-pass test keys there. Each run
// leaves one confirmed test visit behind.

test("a guest books a visit, pays with BLIK and both portals show it", async ({
  page,
  browser,
}) => {
  test.skip(!adminAccount || !specialistAccount, missingAccount);
  test.setTimeout(240_000);

  const reference = await bookUntilPayment(page);
  const payment = paymentElement(page);
  await payment.getByText("BLIK", { exact: true }).click();
  await payment.getByLabel("Kod BLIK").fill("123456");
  await payButton(page).click();
  await expectConfirmed(page, reference);

  // The visit as a calendar file, from the confirmation page (Klient · 4,
  // card 6).
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("link", { name: "Dodaj do kalendarza" }).click(),
  ]);
  expect(download.suggestedFilename()).toBe(`wizyta-${reference}.ics`);
  const calendar = await readFile((await download.path())!, "utf8");
  expect(calendar).toContain("BEGIN:VEVENT");
  expect(calendar).toContain(`Numer rezerwacji: ${reference}`);

  await findVisit(browser, adminUrl, adminAccount!, reference);
  await findVisit(browser, specialistUrl, specialistAccount!, reference);
});

// The wizard's steps up to the free times, on a phone: one H1 each and no
// axe violations. No time is held.
test.describe("on a phone", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  async function accessible(page: Page) {
    await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
    const { violations } = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
      .analyze();
    expect(
      violations.map(
        ({ id, nodes }) =>
          `${id}: ${nodes.map((node) => node.target.join(" ")).join(", ")}`,
      ),
    ).toEqual([]);
  }

  test("the wizard's steps are accessible", async ({ page }) => {
    await page.goto(`${webUrl}/umow-wizyte`);
    const services = page.getByRole("region", { name: "Wybierz usługę" });
    await expect(services).toBeVisible();
    await accessible(page);
    await services.getByRole("link", { name: service }).click();

    const forms = page.getByRole("region", { name: "Wybierz formę spotkania" });
    await expect(forms).toBeVisible();
    await accessible(page);
    await forms.getByRole("link", { name: "Stacjonarnie" }).click();

    const people = page.getByRole("region", { name: "Wybierz specjalistę" });
    await expect(people).toBeVisible();
    await accessible(page);
    await people.getByRole("link", { name: specialist }).click();

    await expect(
      page.getByRole("region", { name: "Wybierz termin" }),
    ).toBeVisible();
    await accessible(page);
  });
});
