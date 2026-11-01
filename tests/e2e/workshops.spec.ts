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
// The waitlist needs "Warsztat rezerwowy E2E" (warsztat-rezerwowy-e2e):
// published, priced, one seat, more than a week ahead; the run gives up
// every seat it takes, so the seat is free again.

const slug = process.env.E2E_WORKSHOP_SLUG ?? "warsztat-testowy-e2e";
const title = process.env.E2E_WORKSHOP_TITLE ?? "Warsztat testowy E2E";
const workshopPath = `/warsztaty/${slug}`;
const waitlistPath = `/warsztaty/${process.env.E2E_WAITLIST_SLUG ?? "warsztat-rezerwowy-e2e"}`;

test.use({ reducedMotion: "reduce" });

async function open(page: Page, path: string) {
  await page.addInitScript(() => localStorage.setItem("ks-intro", "1"));
  const response = await page.goto(`${webUrl}${path}`);
  expect(response?.status(), path).toBe(200);
}

/** The page as it is now: one h1, no sideways scroll, no axe violations. */
async function checkCurrent(page: Page, label: string) {
  await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  );
  expect(overflow, label).toBeLessThanOrEqual(0);
  const { violations } = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
    .analyze();
  expect(
    violations.map(({ id, nodes }) => ({
      id,
      targets: nodes.map((node) => node.target.join(" ")),
    })),
    label,
  ).toEqual([]);
}

async function checkPage(page: Page, path: string) {
  for (const width of [390, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    await open(page, path);
    await checkCurrent(page, `${path} at ${width} px`);
  }
}

/** "Zapisz się" once the bot check passes; the details step opens. */
async function holdSeat(page: Page, path = workshopPath) {
  await open(page, path);
  const signup = page.locator("#zapis");
  await expect(signup.getByText("Gotowe. Możesz się zapisać.")).toBeVisible({
    timeout: 30_000,
  });
  await signup.getByRole("button", { name: "Zapisz się" }).click();
  await expect(
    page.getByRole("heading", { level: 1, name: "Twoje dane" }),
  ).toBeVisible();
  // Until when the seat waits (Warsztat · 2, card 2).
  await expect(
    page
      .getByRole("status")
      .filter({ hasText: /Dokończ zapis do \d{1,2}:\d{2}/ }),
  ).toBeVisible();
}

/** The sign-up form (not the newsletter's in the footer). */
const signupForm = (page: Page) =>
  page
    .locator("form")
    .filter({ has: page.getByLabel("Nazwisko", { exact: true }) });

/** `name` is the first name, a space, the last name. */
async function fillDetails(page: Page, name: string) {
  const form = signupForm(page);
  const space = name.indexOf(" ");
  await form.getByLabel("Imię", { exact: true }).fill(name.slice(0, space));
  await form
    .getByLabel("Nazwisko", { exact: true })
    .fill(name.slice(space + 1));
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
  // A picture for a shared link: the cover, or else the list's.
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute(
    "content",
    /\S/,
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
  // The seat into the guest's calendar, from here too (#198).
  const calendar = page.getByRole("link", { name: "Dodaj do kalendarza" });
  const file = await page.request.get(
    new URL((await calendar.getAttribute("href"))!, page.url()).href,
  );
  expect(await file.text()).toContain("BEGIN:VCALENDAR");

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
  // On a phone, each step of the sign-up as accessible as the pages
  // (Warsztat · 1, card 5).
  await page.setViewportSize({ width: 390, height: 900 });
  await holdSeat(page);
  await checkCurrent(page, "the details step on a phone");
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
  await checkCurrent(page, "the seat's page on a phone");

  await page.getByRole("button", { name: "Zrezygnuj z warsztatu" }).click();
  await expect(
    page.getByText("Miejsce się zwolni; nic nie zostało pobrane."),
  ).toBeVisible();
  await page.getByRole("button", { name: "Tak, rezygnuję" }).click();
  await expect(
    page.getByRole("heading", { level: 1, name: "Zapis anulowany" }),
  ).toBeVisible({ timeout: 30_000 });
});

/** Gives the seat (or the waitlist place) up from its page, if it is not already. */
async function giveUp(page: Page, url: string) {
  await page.goto(url);
  const cancel = page.getByRole("button", {
    name: /^(Zrezygnuj z warsztatu|Wypisz się z listy rezerwowej)$/,
  });
  if (!(await cancel.isVisible())) return;
  await cancel.click();
  await page.getByRole("button", { name: "Tak, rezygnuję" }).click();
  await expect(
    page.getByRole("heading", { level: 1, name: "Zapis anulowany" }),
  ).toBeVisible({ timeout: 30_000 });
}

test("a full workshop's waitlist: the freed seat goes to the first on it, who may leave (Warsztat · 6, card 12; · 7, cards 1, 2 and 4)", async ({
  page,
  browser,
}) => {
  test.setTimeout(240_000);
  const there = await page.request.get(`${webUrl}${waitlistPath}`);
  test.skip(
    there.status() === 404,
    `${waitlistPath} is not in the target's database (see the top of this file).`,
  );
  // The one seat, reserved to pay later.
  await holdSeat(page, waitlistPath);
  await fillDetails(page, "Miejsce E2E");
  await page
    .getByRole("button", { name: "Zarezerwuj, zapłacę później" })
    .click();
  await expect(
    page.getByRole("heading", {
      level: 1,
      name: "Miejsce zarezerwowane, czeka na płatność",
    }),
  ).toBeVisible({ timeout: 30_000 });
  const seatUrl = page.url();

  const context = await browser.newContext();
  const guest = await context.newPage();
  let waitUrl: string | null = null;
  try {
    // Full: another guest joins the waitlist, first in it.
    await open(guest, waitlistPath);
    await fillDetails(guest, "Rezerwowa E2E");
    await signupForm(guest)
      .getByRole("button", { name: "Zapisz się na listę rezerwową" })
      .click();
    await expect(
      guest.getByRole("heading", {
        level: 1,
        name: "Jesteś na liście rezerwowej",
      }),
    ).toBeVisible({ timeout: 30_000 });
    waitUrl = guest.url();
    await expect(guest.getByText("Twoje miejsce na liście: 1")).toBeVisible();

    // The seat is given up: it is offered to the waitlist at once.
    await giveUp(page, seatUrl);
    await guest.reload();
    await expect(
      guest.getByRole("heading", {
        level: 1,
        name: "Zwolniło się miejsce dla Ciebie",
      }),
    ).toBeVisible();

    // Leaving: the seat is free again.
    await giveUp(guest, waitUrl);
  } finally {
    await giveUp(page, seatUrl).catch(() => {});
    if (waitUrl) await giveUp(guest, waitUrl).catch(() => {});
    await context.close();
  }
});
