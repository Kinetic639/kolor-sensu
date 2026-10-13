import { expect, test, type Browser, type Page } from "@playwright/test";
import {
  adminAccount,
  adminUrl,
  missingAccount,
  signIn,
  specialistAccount,
  specialistUrl,
  type Credentials,
  webUrl,
} from "./support/target";

// A guest books, pays with BLIK and the visit shows up in both portals:
// the path every release must keep working. It needs, in the target's
// database, a bookable service led by the test specialist, with their
// hours in a room that is open; DEV and STAGING have
// "Konsultacja testowa E2E" with "Test Specjalista". Payments are Stripe's
// test mode (BLIK code 123456) and Turnstile uses its always-pass test
// keys there. Each run leaves one confirmed test visit behind.

const service = process.env.E2E_BOOKING_SERVICE ?? "Konsultacja testowa E2E";
const specialist = process.env.E2E_BOOKING_SPECIALIST ?? "Test Specjalista";

const slotName = /, \d{2}:\d{2}$/;

// A week picked at random (1 to 5 ahead) keeps runs from all taking the
// same few hours; when it is full, the next ones are tried.
async function pickSlot(page: Page) {
  const step = page.getByRole("region", { name: "Wybierz termin" });
  await expect(step).toBeVisible();
  const nextWeek = async () => {
    const before = page.url();
    await step.getByRole("link", { name: "Następny tydzień" }).click();
    await page.waitForURL((url) => url.href !== before);
    await expect(step).toBeVisible();
  };

  const skip = 1 + Math.floor(Math.random() * 5);
  for (let week = 0; week < skip; week += 1) await nextWeek();
  for (let week = 0; week < 8; week += 1) {
    const slots = step.getByRole("link", { name: slotName });
    if ((await slots.count()) > 0) {
      await slots.first().click();
      return;
    }
    await nextWeek();
  }
  throw new Error(`No free time for ${specialist} in eight weeks.`);
}

async function payWithBlik(page: Page) {
  const payment = page.locator("form iframe").first().contentFrame();
  await payment.getByText("BLIK", { exact: true }).click();
  await payment.getByLabel("Kod BLIK").fill("123456");
  await page.getByRole("button", { name: /^Zapłać \d/ }).click();
}

async function findVisit(
  browser: Browser,
  portalUrl: string,
  account: Credentials,
  reference: string,
) {
  const context = await browser.newContext();
  const page = await context.newPage();
  await signIn(page, portalUrl, account);
  await page.goto(`${portalUrl}/rezerwacje?q=${encodeURIComponent(reference)}`);
  await expect(page.getByRole("link", { name: reference })).toBeVisible();
  await expect(page.getByText("Potwierdzona").first()).toBeVisible();
  await context.close();
}

test("a guest books a visit, pays with BLIK and both portals show it", async ({
  page,
  browser,
}) => {
  test.skip(!adminAccount || !specialistAccount, missingAccount);
  test.setTimeout(240_000);

  await page.goto(`${webUrl}/umow-wizyte`);
  await page
    .getByRole("region", { name: "Wybierz usługę" })
    .getByRole("link", { name: service })
    .click();
  await page
    .getByRole("region", { name: "Wybierz formę spotkania" })
    .getByRole("link", { name: "Stacjonarnie" })
    .click();
  await page
    .getByRole("region", { name: "Wybierz specjalistę" })
    .getByRole("link", { name: specialist })
    .click();

  await pickSlot(page);
  const proceed = page.getByRole("button", { name: "Przejdź dalej" });
  await expect(page.getByText("Gotowe. Możesz przejść dalej.")).toBeVisible({
    timeout: 30_000,
  });
  await proceed.click();

  const details = page.getByRole("region", { name: "Twoje dane" });
  await expect(details).toBeVisible();
  const reference = (await details
    .getByText(/^\d{4}-\d{3,}$/)
    .textContent())!.trim();
  await details.getByLabel("Imię i nazwisko").fill("Gość E2E");
  await details.getByLabel("Telefon").fill("500600700");
  await details.getByLabel("E-mail").fill(`e2e-${Date.now()}@example.invalid`);
  await details
    .getByRole("checkbox", { name: "Akceptuję regulamin rezerwacji" })
    .check();
  await details.getByRole("checkbox", { name: /polityką prywatności/ }).check();
  await details.getByRole("button", { name: "Zapłać teraz" }).click();

  await expect(page.getByRole("heading", { name: "Płatność" })).toBeVisible();
  await payWithBlik(page);
  await expect(
    page.getByRole("heading", { name: "Wizyta potwierdzona" }),
  ).toBeVisible({ timeout: 90_000 });
  await expect(page.getByText(reference)).toBeVisible();

  await findVisit(browser, adminUrl, adminAccount!, reference);
  await findVisit(browser, specialistUrl, specialistAccount!, reference);
});
