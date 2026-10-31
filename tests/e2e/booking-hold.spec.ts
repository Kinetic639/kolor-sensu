import { expect, test, type Page } from "@playwright/test";
import {
  bookUntilDetails,
  chooseTime,
  goToTimes,
  holdChosenTime,
  newVisitor,
} from "./support/booking";

// A held time (Klient · 2 in Miro): how long it waits and what the client
// sees, two guests at once, back in the wizard, "Zmień termin", two tabs
// and a browser without cookies. Every time held here is given back at
// the end; nothing is paid.

// Each test a visitor of its own (the hold limit, @holds).
test.beforeEach(({ context }) => newVisitor(context));

const details = (page: Page) =>
  page.getByRole("region", { name: "Twoje dane" });
const summary = (page: Page) =>
  page.getByRole("region", { name: "Twoja rezerwacja" });
const termOf = (href: string) => new URL(href).searchParams.get("termin")!;

/** The time held, as the summary names it. */
async function heldLabel(page: Page) {
  return (await summary(page)
    .getByText(/, godz\. \d{2}:\d{2}$/)
    .textContent())!.trim();
}

/**
 * On the time step: a free time on another day than `not` (so the break
 * after one visit does not touch the other), chosen.
 */
async function pickAnother(page: Page, not: string) {
  const step = page.getByRole("region", { name: "Wybierz termin" });
  for (let week = 0; week < 8; week += 1) {
    const links = step.getByRole("link", { name: /, \d{2}:\d{2}$/ });
    for (const link of await links.all()) {
      const href = (await link.getAttribute("href"))!;
      const time = new URL(href, page.url()).searchParams.get("termin")!;
      if (time.slice(0, 10) !== not.slice(0, 10)) {
        await link.click();
        await page.waitForURL(/termin=/);
        return page.url();
      }
    }
    await step.getByRole("link", { name: "Następny tydzień" }).click();
  }
  throw new Error("No other free time in eight weeks.");
}

async function startOver(page: Page) {
  // From the payment step it also stops the payment at Stripe: a while.
  await page.getByRole("button", { name: "Zacznij od nowa" }).click();
  await expect(
    page.getByRole("region", { name: "Wybierz usługę" }),
  ).toBeVisible({ timeout: 30_000 });
}

/** Whether another guest can choose this time now. */
async function freeForOthers(page: Page, timeHref: string) {
  const other = await page.context().browser()!.newContext();
  const guest = await other.newPage();
  await guest.goto(timeHref);
  await expect(
    guest.getByRole("region", { name: "Wybierz termin" }),
  ).toBeVisible();
  const chosen = await summary(guest).getByText("Wybierz termin").count();
  await other.close();
  return chosen === 0;
}

test("a held time waits 10 minutes, says until when, and has a number (cards 1, 2) @holds", async ({
  page,
}) => {
  test.setTimeout(150_000);
  const { reference, timeHref } = await bookUntilDetails(page);
  expect(reference).toMatch(/^\d{4}-\d{3,}$/);

  // Until now + 10 minutes, Polish time.
  const until = (minutes: number) =>
    new Intl.DateTimeFormat("pl-PL", {
      timeZone: "Europe/Warsaw",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(Date.now() + minutes * 60_000));
  const notice = page
    .getByRole("status")
    .filter({ hasText: "Twój termin jest tymczasowo zarezerwowany" });
  await expect(notice).toContainText(
    "Podaj swoje dane i potwierdź wizytę przed tym czasem.",
  );
  const shown = (await notice.textContent())!.match(/do (\d{2}:\d{2})/)![1];
  expect([until(9), until(10), until(11)]).toContain(shown);

  // Nobody else can choose it meanwhile.
  expect(await freeForOthers(page, timeHref)).toBe(false);

  // On the payment step too, with what to do before then.
  await details(page).getByRole("button", { name: "Zapłać teraz" }).click();
  await expect(page.getByRole("heading", { name: "Płatność" })).toBeVisible({
    timeout: 30_000,
  });
  await expect(
    page
      .getByRole("status")
      .filter({ hasText: "Twój termin jest tymczasowo zarezerwowany" }),
    // While a payment is open the time waits as long as it does.
  ).toHaveText(
    /do \d{2}:\d{2}\. Dokończ płatność przed tym czasem, a termin będzie Twój\.$/,
  );

  await startOver(page);
  expect(await freeForOthers(page, timeHref)).toBe(true);
});

test("two guests take the same time at the same moment: one gets it (card 3) @holds", async ({
  page,
  browser,
}) => {
  test.setTimeout(150_000);
  const timeHref = await chooseTime(page);
  const other = await browser.newContext();
  await newVisitor(other);
  const second = await other.newPage();
  await second.goto(timeHref);
  for (const guest of [page, second]) {
    await expect(guest.getByText("Gotowe. Możesz przejść dalej.")).toBeVisible({
      timeout: 30_000,
    });
  }

  await Promise.all(
    [page, second].map((guest) =>
      guest.getByRole("button", { name: "Przejdź dalej" }).click(),
    ),
  );
  const taken = (guest: Page) =>
    guest
      .getByRole("alert")
      .filter({ hasText: "Ten termin został właśnie zajęty." });
  const outcome = async (guest: Page) => {
    await expect(details(guest).or(taken(guest))).toBeVisible({
      timeout: 30_000,
    });
    return (await details(guest).count()) > 0 ? "held" : "taken";
  };
  const outcomes = [await outcome(page), await outcome(second)];
  expect(outcomes.sort()).toEqual(["held", "taken"]);

  for (const guest of [page, second]) {
    if ((await details(guest).count()) > 0) await startOver(guest);
  }
  await other.close();
});

test("back in the wizard, the held time goes back at once; back twice changes nothing (card 5) @holds", async ({
  page,
}) => {
  test.setTimeout(150_000);
  const timeHref = await chooseTime(page);
  await holdChosenTime(page);
  await expect(details(page)).toBeVisible();
  const label = await heldLabel(page);

  await page.goBack();
  await expect(
    page.getByRole("status").filter({ hasText: "zwolniliśmy termin" }),
  ).toHaveText(
    `Po powrocie do wyboru terminu zwolniliśmy termin ${label}. Możesz wybrać go ponownie albo inny.`,
  );
  expect(await freeForOthers(page, timeHref)).toBe(true);
  // The same time can be held again at once.
  await expect(summary(page).getByText("Wybierz termin")).toHaveCount(0);

  // Back once more: nothing is held any more, so nothing else happens;
  // the wizard works and the time stays free.
  await page.goBack();
  await expect(page.getByRole("region", { name: /Wybierz/ })).toBeVisible();
  // (Next's route announcer is an alert too: only the wizard's notices.)
  await expect(
    page.getByRole("alert").filter({ hasText: /termin|rezerwac/i }),
  ).toHaveCount(0);
  expect(await freeForOthers(page, timeHref)).toBe(true);
});

test("Zmień termin gives the earlier time back and holds the new one (card 6) @holds", async ({
  page,
}) => {
  test.setTimeout(180_000);
  const { timeHref } = await bookUntilDetails(page);
  await details(page).getByRole("button", { name: "Zmień termin" }).click();

  // Back to the times, with the same choices; the earlier one is free.
  await expect(
    page.getByRole("region", { name: "Wybierz termin" }),
  ).toBeVisible();
  const back = new URL(page.url());
  for (const key of ["usluga", "forma", "specjalista"]) {
    expect(back.searchParams.get(key)).toBe(
      new URL(timeHref).searchParams.get(key),
    );
  }
  expect(await freeForOthers(page, timeHref)).toBe(true);

  const otherHref = await pickAnother(page, termOf(timeHref));
  await holdChosenTime(page);
  await expect(details(page)).toBeVisible();
  expect(await freeForOthers(page, otherHref)).toBe(false);
  expect(await freeForOthers(page, timeHref)).toBe(true);
  await startOver(page);
});

test("two tabs of one browser: one booking, and the client is told which (card 7) @holds", async ({
  page,
}) => {
  test.setTimeout(180_000);
  // Tab A holds a time and fills in the details.
  const { timeHref } = await bookUntilDetails(page);
  // Tab B holds another one.
  const tabB = await page.context().newPage();
  // (The wizard remembers tab A's choices: the same week of times.)
  await tabB.goto(timeHref);
  await pickAnother(tabB, termOf(timeHref));
  await holdChosenTime(tabB);
  await expect(details(tabB)).toBeVisible();
  const label = await heldLabel(tabB);
  // The first time went back when the second was held.
  expect(await freeForOthers(page, timeHref)).toBe(true);

  // Tab A sends its details: they go to no visit it did not show.
  await details(page).getByRole("button", { name: "Zapłać teraz" }).click();
  await expect(
    page.getByRole("alert").filter({ hasText: "W innej karcie" }),
  ).toHaveText(
    `W innej karcie wybrano inny termin, więc obowiązuje ta rezerwacja: ${label}. Sprawdź, proszę, dane i zapisz je jeszcze raz.`,
  );
  expect(await heldLabel(page)).toBe(label);

  await startOver(page);
  await tabB.close();
});

test.describe("a browser that keeps no cookies", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() =>
      Object.defineProperty(Navigator.prototype, "cookieEnabled", {
        get: () => false,
      }),
    );
  });

  test("holds nothing and says how to book instead (card 8)", async ({
    page,
  }) => {
    await goToTimes(page);
    const step = page.getByRole("region", { name: "Wybierz termin" });
    const slot = step.getByRole("link", { name: /, \d{2}:\d{2}$/ }).first();
    // The first week with a free time (none is held here).
    for (let week = 0; week < 6 && (await slot.count()) === 0; week += 1) {
      const before = page.url();
      await step.getByRole("link", { name: "Następny tydzień" }).click();
      await page.waitForURL((url) => url.href !== before);
    }
    await slot.click();
    await expect(
      page.getByRole("alert").filter({ hasText: "plików cookies" }),
    ).toContainText("Rezerwacja online potrzebuje niezbędnych plików cookies");
    await expect(
      page.getByRole("link", { name: "Kontakt z centrum" }),
    ).toHaveAttribute("href", "/kontakt");
    await expect(
      page.getByRole("button", { name: "Przejdź dalej" }),
    ).toHaveCount(0);
  });
});
