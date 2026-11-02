import {
  expect,
  type Browser,
  type BrowserContext,
  type Page,
} from "@playwright/test";
import { e2eHeaders } from "./e2e-key";
import { signIn, type Credentials, webUrl } from "./target";

// A guest's way through the booking wizard, shared by the booking and the
// payment tests. It needs, in the target's database, a bookable service led
// by the test specialist, with their hours in a room that is open; DEV and
// STAGING have "Konsultacja testowa E2E" with "Test Specjalista".

/**
 * The browser as a visitor of its own: an address (from TEST-NET-2) the
 * site counts holds by. Taken only by a site without a proxy in front
 * (@holds tests, see playwright.config.ts); a deployed site counts the
 * real address.
 */
export async function newVisitor(context: BrowserContext) {
  const part = () => 1 + Math.floor(Math.random() * 254);
  // Replaces the context's headers, so the run's key goes along again.
  await context.setExtraHTTPHeaders({
    ...e2eHeaders(),
    "x-forwarded-for": `198.51.${part()}.${part()}`,
  });
}

export const service =
  process.env.E2E_BOOKING_SERVICE ?? "Konsultacja testowa E2E";
export const specialist =
  process.env.E2E_BOOKING_SPECIALIST ?? "Test Specjalista";

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

/**
 * From the wizard's start to the payment step: the service, in person, the
 * specialist, a free time, the guest's details. The visit's reference.
 */
export async function bookUntilPayment(page: Page): Promise<string> {
  const { reference, details } = await bookUntilDetails(page);
  await details.getByRole("button", { name: "Zapłać teraz" }).click();

  // The payment step waits for Stripe's session: some seconds at times.
  await expect(page.getByRole("heading", { name: "Płatność" })).toBeVisible({
    timeout: 30_000,
  });
  return reference;
}

/**
 * From the wizard's start to the details given, before paying (a discount
 * code applied first, when given): the reference, the guest's e-mail and
 * the details step.
 */
export async function bookUntilDetails(
  page: Page,
  { code }: { code?: string } = {},
) {
  const timeHref = await chooseTime(page);
  await holdChosenTime(page);
  const details = page.getByRole("region", { name: "Twoje dane" });
  await expect(details).toBeVisible();
  const reference = (await details
    .getByText(/^\d{4}-\d{3,}$/)
    .textContent())!.trim();
  if (code) {
    await details.getByLabel("Kod rabatowy (opcjonalnie)").fill(code);
    await details.getByRole("button", { name: "Zastosuj" }).click();
    await expect(
      page.getByRole("status").filter({ hasText: `Kod ${code}: rabat` }),
    ).toBeVisible({ timeout: 30_000 });
  }
  await details.getByLabel("Imię", { exact: true }).fill("Gość");
  await details.getByLabel("Nazwisko", { exact: true }).fill("E2E");
  await details.getByLabel("Telefon").fill("500600700");
  const email = `e2e-${Date.now()}@example.invalid`;
  await details.getByLabel("E-mail").fill(email);
  await details
    .getByRole("checkbox", { name: "Akceptuję regulamin rezerwacji" })
    .check();
  await details.getByRole("checkbox", { name: /polityką prywatności/ }).check();
  // A visit within 14 days asks for the request to start early (card 15).
  const early = details.getByRole("checkbox", {
    name: /Wizyta wypada w ciągu 14 dni/,
  });
  if ((await early.count()) > 0) await early.check();
  return { reference, email, details, timeHref };
}

/** From the wizard's start to the free times (in person, the test specialist). */
export async function goToTimes(page: Page) {
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
  await expect(
    page.getByRole("region", { name: "Wybierz termin" }),
  ).toBeVisible();
}

/** To a free time, chosen but not held: the wizard's address with it. */
export async function chooseTime(page: Page) {
  await goToTimes(page);
  return pickTime(page);
}

/** On the time step: a free time chosen; the address with it. */
export async function pickTime(page: Page) {
  await pickSlot(page);
  await page.waitForURL(/termin=/);
  return page.url();
}

/** "Przejdź dalej", once the check that a person books has passed. */
export async function holdChosenTime(page: Page) {
  await expect(page.getByText("Gotowe. Możesz przejść dalej.")).toBeVisible({
    timeout: 30_000,
  });
  await page.getByRole("button", { name: "Przejdź dalej" }).click();
}

/** BLIK in Stripe's Payment Element, test code 123456, and pay. */
export async function payWithBlik(page: Page) {
  const payment = paymentElement(page);
  await payment.getByText("BLIK", { exact: true }).click();
  await payment.getByLabel("Kod BLIK").fill("123456");
  await payButton(page).click();
}

/** Stripe's Payment Element (its first frame, in our payment form). */
export const paymentElement = (page: Page) =>
  page.locator("form iframe").first().contentFrame();

/** Our pay button, "Zapłać 200,00 zł". */
export const payButton = (page: Page) =>
  page.getByRole("button", { name: /^Zapłać \d/ });

/** The return page once Stripe has confirmed the payment. */
export async function expectConfirmed(page: Page, reference: string) {
  await expect(
    page.getByRole("heading", { name: "Wizyta potwierdzona" }),
  ).toBeVisible({ timeout: 90_000 });
  await expect(page.getByText(reference)).toBeVisible();
}

/** The visit, confirmed, in a portal's Rezerwacje. */
export async function findVisit(
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
