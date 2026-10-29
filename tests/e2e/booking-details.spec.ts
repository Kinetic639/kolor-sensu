import { expect, test, type Page } from "@playwright/test";
import { goToTimes, holdChosenTime, newVisitor } from "./support/booking";
import { webUrl } from "./support/target";

// The details step (Klient · 3 in Miro): the request a visit within 14
// days asks for, and the booking's rules in the Regulamin. Every time held
// here is given back; nothing is paid.

test.beforeEach(({ context }) => newVisitor(context));

const details = (page: Page) =>
  page.getByRole("region", { name: "Twoje dane" });
const earlyStart = (page: Page) =>
  details(page).getByRole("checkbox", { name: /Wizyta wypada w ciągu 14 dni/ });

/** On the time step: the first free time, from `weeks` weeks on. */
async function pickFrom(page: Page, weeks: number) {
  const step = page.getByRole("region", { name: "Wybierz termin" });
  for (let week = 0; week < weeks; week += 1) {
    await step.getByRole("link", { name: "Następny tydzień" }).click();
    await expect(step).toBeVisible();
  }
  for (let week = 0; week < 6; week += 1) {
    const slot = step.getByRole("link", { name: /, \d{2}:\d{2}$/ }).first();
    if ((await slot.count()) > 0) {
      await slot.click();
      await page.waitForURL(/termin=/);
      return new URL(page.url()).searchParams.get("termin")!;
    }
    await step.getByRole("link", { name: "Następny tydzień" }).click();
  }
  throw new Error("No free time in six weeks.");
}

async function fillIn(page: Page) {
  const form = details(page);
  await form.getByLabel("Imię", { exact: true }).fill("Gość");
  await form.getByLabel("Nazwisko", { exact: true }).fill("E2E");
  await form.getByLabel("Telefon").fill("500600701");
  await form.getByLabel("E-mail").fill(`e2e-${Date.now()}@example.invalid`);
  await form
    .getByRole("checkbox", { name: "Akceptuję regulamin rezerwacji" })
    .check();
  await form.getByRole("checkbox", { name: /polityką prywatności/ }).check();
}

const daysAhead = (time: string) =>
  (Date.parse(`${time}:00+01:00`) - Date.now()) / 86_400_000;

test("a visit within 14 days asks for the request to start early (card 15) @holds", async ({
  page,
}) => {
  test.setTimeout(150_000);
  await goToTimes(page);
  const time = await pickFrom(page, 0);
  test.skip(daysAhead(time) >= 13, "No free time within the next 13 days.");
  await holdChosenTime(page);
  await expect(details(page)).toBeVisible();

  await fillIn(page);
  await expect(earlyStart(page)).not.toBeChecked();
  await details(page).getByRole("button", { name: "Zapłać teraz" }).click();
  await expect(
    details(page).getByText(
      "Zaznacz, że chcesz wizyty przed upływem 14 dni od rezerwacji, albo wybierz późniejszy termin.",
    ),
  ).toBeVisible();

  await earlyStart(page).check();
  await details(page).getByRole("button", { name: "Zapłać teraz" }).click();
  await expect(page.getByRole("heading", { name: "Płatność" })).toBeVisible({
    timeout: 30_000,
  });
  await page.getByRole("button", { name: "Zacznij od nowa" }).click();
  await expect(
    page.getByRole("region", { name: "Wybierz usługę" }),
  ).toBeVisible();
});

test("a visit further ahead does not ask for it (card 15) @holds", async ({
  page,
}) => {
  test.setTimeout(150_000);
  await goToTimes(page);
  const time = await pickFrom(page, 3);
  expect(daysAhead(time)).toBeGreaterThan(14);
  await holdChosenTime(page);
  await expect(details(page)).toBeVisible();
  await expect(earlyStart(page)).toHaveCount(0);
  await page.getByRole("button", { name: "Zacznij od nowa" }).click();
  await expect(
    page.getByRole("region", { name: "Wybierz usługę" }),
  ).toBeVisible();
});

test("the Regulamin says the booking's rules, numbers from the settings (card 14)", async ({
  page,
}) => {
  await page.goto(`${webUrl}/regulamin`);
  const rules = page.getByRole("region", { name: "Zasady rezerwacji" });
  await expect(rules).toBeVisible();
  for (const title of [
    "Wybrany termin",
    "Płatność później",
    "Odwołanie wizyty",
    "Zmiana terminu",
    "Wizyta w ciągu 14 dni",
    "Wizyty dzieci i młodzieży",
  ]) {
    await expect(rules.getByText(title, { exact: true })).toBeVisible();
  }
  await expect(rules).toContainText(/czeka na Ciebie \d+ min/);
  await expect(rules).toContainText(/najpóźniej \d+ godz\. przed wizytą/);
  await expect(rules).toContainText(
    /odwołując ją najpóźniej \d+ godz\. przed jej początkiem/,
  );
});
