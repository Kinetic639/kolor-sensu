import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Browser, type Page } from "@playwright/test";
import {
  adminAccount,
  adminUrl,
  missingAccount,
  signIn,
  specialistAccount,
  specialistUrl,
  webUrl,
} from "./support/target";

// Warsztaty (docs/product/workshops-plan.md): the list and a workshop's
// page as a visitor sees them (one h1, no sideways scroll on a phone or a
// computer, no axe violations, the Event data for Google); a guest signs
// up and pays with BLIK, and the admin and the leader see them; a guest
// reserves to pay later and gives the seat up again. It needs, in the
// target's database, "Warsztat testowy E2E" (warsztat-testowy-e2e): online,
// published, priced, with seats, led by "Test Specjalista"; DEV has it.
// Stripe is in test mode (BLIK 123456) and Turnstile passes. Each run
// leaves one confirmed test seat behind (the other gives itself up).

const slug = process.env.E2E_WORKSHOP_SLUG ?? "warsztat-testowy-e2e";
const title = process.env.E2E_WORKSHOP_TITLE ?? "Warsztat testowy E2E";
const workshopPath = `/warsztaty/${slug}`;

test.use({ reducedMotion: "reduce" });

async function open(page: Page, path: string) {
  await page.addInitScript(() => localStorage.setItem("ks-intro", "1"));
  const response = await page.goto(`${webUrl}${path}`);
  expect(response?.status(), path).toBe(200);
}

async function checkPage(page: Page, path: string) {
  for (const width of [390, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    await open(page, path);
    await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    );
    expect(overflow, `${path} at ${width} px`).toBeLessThanOrEqual(0);
    const { violations } = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
      .analyze();
    expect(
      violations.map(({ id, nodes }) => ({
        id,
        targets: nodes.map((node) => node.target.join(" ")),
      })),
      `${path} at ${width} px`,
    ).toEqual([]);
  }
}

/** "Zapisz się" once the bot check passes; the details step opens. */
async function holdSeat(page: Page) {
  await open(page, workshopPath);
  const signup = page.locator("#zapis");
  await expect(signup.getByText("Gotowe. Możesz się zapisać.")).toBeVisible({
    timeout: 30_000,
  });
  await signup.getByRole("button", { name: "Zapisz się" }).click();
  await expect(
    page.getByRole("heading", { level: 1, name: "Twoje dane" }),
  ).toBeVisible();
}

/** The sign-up form (not the newsletter's in the footer). */
const signupForm = (page: Page) =>
  page.locator("form").filter({ has: page.getByLabel("Imię i nazwisko") });

async function fillDetails(page: Page, name: string) {
  const form = signupForm(page);
  await form.getByLabel("Imię i nazwisko").fill(name);
  await form.getByLabel("Telefon").fill("500600700");
  await form.getByLabel("E-mail").fill(`e2e-${Date.now()}@example.invalid`);
  await form.getByRole("checkbox", { name: /^Akceptuję regulamin/ }).check();
  await form.getByRole("checkbox", { name: /polityką prywatności/ }).check();
}

async function payWithBlik(page: Page) {
  const payment = page.locator("form iframe").first().contentFrame();
  await payment.getByText("BLIK", { exact: true }).click();
  await payment.getByLabel("Kod BLIK").fill("123456");
  await page.getByRole("button", { name: /^Zapłać \d/ }).click();
}

async function seeParticipant(
  browser: Browser,
  url: string,
  account: NonNullable<typeof adminAccount>,
  path: string,
  name: string,
) {
  const context = await browser.newContext();
  const page = await context.newPage();
  await signIn(page, url, account);
  await page.goto(`${url}${path}`);
  await expect(page.getByText(name).first()).toBeVisible();
  await context.close();
}

test("Warsztaty and a workshop's page: one h1, no sideways scroll, axe, the Event data", async ({
  page,
}) => {
  test.setTimeout(120_000);
  await checkPage(page, "/warsztaty");
  await expect(page.getByRole("link", { name: title }).first()).toBeVisible();

  await checkPage(page, workshopPath);
  await expect(
    page.getByRole("heading", { level: 1, name: title }),
  ).toBeVisible();
  const event = await page
    .locator('script[type="application/ld+json"]')
    .evaluateAll((scripts) =>
      scripts
        .map((script) => JSON.parse(script.textContent ?? "{}"))
        .find((data) => data["@type"] === "Event"),
    );
  expect(event).toMatchObject({
    name: title,
    eventAttendanceMode: "https://schema.org/OnlineEventAttendanceMode",
    offers: { availability: "https://schema.org/InStock" },
  });
});

test("a guest signs up for a workshop, pays with BLIK, and the admin and the leader see them", async ({
  page,
  browser,
}) => {
  test.skip(!adminAccount || !specialistAccount, missingAccount);
  test.setTimeout(240_000);
  const name = `Uczestnik E2E ${Date.now().toString(36)}`;

  await holdSeat(page);
  await fillDetails(page, name);
  await page.getByRole("button", { name: "Zapłać teraz" }).click();
  await expect(page.getByRole("heading", { name: "Płatność" })).toBeVisible();
  await payWithBlik(page);
  await expect(
    page.getByRole("heading", { name: "Miejsce potwierdzone" }),
  ).toBeVisible({ timeout: 90_000 });

  // The admin finds the workshop and the participant on its page.
  const context = await browser.newContext();
  const admin = await context.newPage();
  await signIn(admin, adminUrl, adminAccount!);
  await admin.goto(
    `${adminUrl}/warsztaty?stan=wszystkie&q=${encodeURIComponent(title)}`,
  );
  await admin.getByRole("link", { name: title }).first().click();
  await expect(
    admin.getByRole("heading", { name: "Uczestnicy" }),
  ).toBeVisible();
  await expect(admin.getByText(name)).toBeVisible();
  await context.close();

  await seeParticipant(
    browser,
    specialistUrl,
    specialistAccount!,
    "/warsztaty",
    name,
  );
});

test("a guest reserves a seat to pay later and gives it up from its page", async ({
  page,
}) => {
  test.setTimeout(180_000);
  await holdSeat(page);
  await fillDetails(page, "Rezygnacja E2E");
  await page
    .getByRole("button", { name: "Zarezerwuj, zapłacę później" })
    .click();
  await expect(
    page.getByRole("heading", {
      level: 1,
      name: "Miejsce zarezerwowane, czeka na płatność",
    }),
  ).toBeVisible({ timeout: 30_000 });
  await expect(
    page.getByRole("button", { name: "Zapłać teraz" }),
  ).toBeVisible();

  await page.getByRole("button", { name: "Zrezygnuj z warsztatu" }).click();
  await expect(
    page.getByText("Miejsce się zwolni; nic nie zostało pobrane."),
  ).toBeVisible();
  await page.getByRole("button", { name: "Tak, rezygnuję" }).click();
  await expect(
    page.getByRole("heading", { level: 1, name: "Zapis anulowany" }),
  ).toBeVisible({ timeout: 30_000 });
});
