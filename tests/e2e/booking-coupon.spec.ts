import { expect, test, type Page } from "@playwright/test";
import {
  chooseTime,
  goToTimes,
  holdChosenTime,
  newVisitor,
} from "./support/booking";
import { createDiscountCode } from "./support/discount";
import { adminAccount, missingAccount } from "./support/target";

// A discount code with one use left, two guests at once (Klient · 4a,
// card 6): one gets the discount, the other is told the code is used up.
// The code is made in the admin portal (as the team makes one) and stays
// behind, used; both times held are given back at the end.

const details = (page: Page) =>
  page.getByRole("region", { name: "Twoje dane" });

/** On the time step: a free time other than `not`, chosen. */
async function pickOther(page: Page, not: string) {
  const step = page.getByRole("region", { name: "Wybierz termin" });
  for (let week = 0; week < 8; week += 1) {
    for (const link of await step
      .getByRole("link", { name: /, \d{2}:\d{2}$/ })
      .all()) {
      const href = (await link.getAttribute("href"))!;
      if (!href.includes(`termin=${encodeURIComponent(not)}`)) {
        await link.click();
        await page.waitForURL(/termin=/);
        return;
      }
    }
    const before = page.url();
    await step.getByRole("link", { name: "Następny tydzień" }).click();
    await page.waitForURL((url) => url.href !== before);
  }
  throw new Error("No other free time in eight weeks.");
}

test("a code with one use left: two guests at once, one gets it (card 6)", async ({
  page,
  browser,
}) => {
  test.skip(!adminAccount, missingAccount);
  test.setTimeout(240_000);
  const code = await createDiscountCode(browser);

  // Two guests, each a visitor of their own, each with a time held.
  await newVisitor(page.context());
  const first = new URL(await chooseTime(page)).searchParams.get("termin")!;
  await holdChosenTime(page);
  await expect(details(page)).toBeVisible();

  const other = await browser.newContext();
  await newVisitor(other);
  const second = await other.newPage();
  await goToTimes(second);
  await pickOther(second, first);
  await holdChosenTime(second);
  await expect(details(second)).toBeVisible();

  // The same code, sent at the same moment.
  for (const guest of [page, second]) {
    await details(guest).getByLabel("Kod rabatowy (opcjonalnie)").fill(code);
  }
  await Promise.all(
    [page, second].map((guest) =>
      details(guest).getByRole("button", { name: "Zastosuj" }).click(),
    ),
  );

  const applied = (guest: Page) =>
    guest.getByRole("status").filter({ hasText: `Kod ${code}: rabat` });
  const usedUp = (guest: Page) =>
    details(guest).getByText("Ten kod został już wykorzystany.");
  const outcome = async (guest: Page) => {
    await expect(applied(guest).or(usedUp(guest))).toBeVisible({
      timeout: 30_000,
    });
    return (await applied(guest).count()) > 0 ? "discount" : "used up";
  };
  expect([await outcome(page), await outcome(second)].sort()).toEqual([
    "discount",
    "used up",
  ]);

  for (const guest of [page, second]) {
    await guest.getByRole("button", { name: "Zacznij od nowa" }).click();
    await expect(
      guest.getByRole("region", { name: "Wybierz usługę" }),
    ).toBeVisible({ timeout: 30_000 });
  }
  await other.close();
});
