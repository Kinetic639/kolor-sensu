import { expect, test } from "@playwright/test";
import {
  bookUntilDetails,
  chooseTime,
  goToTimes,
  holdChosenTime,
  pickTime,
} from "./support/booking";
import { webUrl } from "./support/target";

// The wizard around a booking (Klient · 1 in Miro): coming back to it from
// the header, starting again, a time someone else took first, and the
// hours in Polish time. Every time held here is given back at the end; the
// details step is never sent.

const header = (page: import("@playwright/test").Page) =>
  page.getByRole("banner");

test("Dokończ rezerwację leads back to where the booking was left (card 11)", async ({
  page,
}) => {
  test.setTimeout(120_000);
  await goToTimes(page);
  const times = page.url();
  // Inside the wizard the header stays as it is.
  await expect(
    header(page).getByRole("link", { name: "Umów wizytę" }),
  ).toBeVisible();

  await page.goto(`${webUrl}/o-nas`);
  const resume = header(page).getByRole("link", { name: "Dokończ rezerwację" });
  await expect(resume).toBeVisible();
  await resume.click();
  await expect(
    page.getByRole("region", { name: "Wybierz termin" }),
  ).toBeVisible();
  const back = new URL(page.url());
  for (const key of ["usluga", "forma", "specjalista"]) {
    expect(back.searchParams.get(key)).toBe(
      new URL(times).searchParams.get(key),
    );
  }

  // With a time held, it leads to the details step.
  await pickTime(page);
  await holdChosenTime(page);
  await expect(page.getByRole("region", { name: "Twoje dane" })).toBeVisible();
  await page.goto(`${webUrl}/`);
  await header(page).getByRole("link", { name: "Dokończ rezerwację" }).click();
  await expect(page.getByRole("region", { name: "Twoje dane" })).toBeVisible();

  // Starting again: nothing left to finish.
  await page.getByRole("button", { name: "Zacznij od nowa" }).click();
  await expect(
    page.getByRole("region", { name: "Wybierz usługę" }),
  ).toBeVisible();
  await page.goto(`${webUrl}/`);
  await expect(
    header(page).getByRole("link", { name: "Umów wizytę" }),
  ).toBeVisible();
});

test("Zacznij od nowa clears the choices and gives the time back at once (card 15)", async ({
  page,
}) => {
  test.setTimeout(120_000);
  const { timeHref } = await bookUntilDetails(page);

  await page.getByRole("button", { name: "Zacznij od nowa" }).click();
  await expect(page).toHaveURL(`${webUrl}/umow-wizyte`);
  const summary = page.getByRole("region", { name: "Twoja rezerwacja" });
  await expect(summary.getByText("Wybierz usługę")).toBeVisible();
  await expect(summary.getByText("Wybierz specjalistę")).toBeVisible();

  // The same time is free again at once: chosen, it can be held.
  await page.goto(timeHref);
  await expect(summary.getByText("Wybierz termin")).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Przejdź dalej" }),
  ).toBeVisible();
});

test("a time taken while the client looked at it (card 28)", async ({
  page,
  browser,
}) => {
  test.setTimeout(150_000);
  // Another guest has the same time chosen, not yet held.
  const timeHref = await chooseTime(page);
  const other = await browser.newContext();
  const late = await other.newPage();
  await late.goto(timeHref);
  await expect(late.getByText("Gotowe. Możesz przejść dalej.")).toBeVisible({
    timeout: 30_000,
  });

  // The first holds it; the other, a moment later, is told and sees the
  // week's free times again, without it.
  await holdChosenTime(page);
  await expect(page.getByRole("region", { name: "Twoje dane" })).toBeVisible();
  await late.getByRole("button", { name: "Przejdź dalej" }).click();
  await expect(
    late
      .getByRole("alert")
      .filter({ hasText: "Ten termin został właśnie zajęty." }),
  ).toHaveText(
    "Ten termin został właśnie zajęty. Wybierz, proszę, inny wolny termin.",
  );
  const step = late.getByRole("region", { name: "Wybierz termin" });
  await expect(step).toBeVisible();
  const time = new URL(timeHref).searchParams.get("termin")!;
  await expect(
    step.locator(`a[href*="termin=${encodeURIComponent(time)}"]`),
  ).toHaveCount(0);
  await other.close();

  await page.getByRole("button", { name: "Zacznij od nowa" }).click();
  await expect(
    page.getByRole("region", { name: "Wybierz usługę" }),
  ).toBeVisible();
});

test.describe("abroad", () => {
  test.use({ timezoneId: "America/New_York" });

  test("the hours are Polish time, and the page says so (card 27)", async ({
    page,
  }) => {
    await goToTimes(page);
    await expect(
      page.getByText("Godziny podajemy w czasie polskim."),
    ).toBeVisible();
    // A time's link carries the same wall-clock hour as its label.
    const slot = page
      .getByRole("region", { name: "Wybierz termin" })
      .getByRole("link", { name: /, \d{2}:\d{2}$/ })
      .first();
    if ((await slot.count()) === 0) return;
    const label =
      (await slot.getAttribute("aria-label")) ?? (await slot.textContent())!;
    const href = new URL((await slot.getAttribute("href"))!, webUrl);
    expect(label).toContain(href.searchParams.get("termin")!.slice(11));
  });
});
