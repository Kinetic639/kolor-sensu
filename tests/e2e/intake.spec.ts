import { expect, test } from "@playwright/test";
import { webUrl } from "./support/target";

// The questionnaire before a first consultation (Klient · 3): a service
// that asks for it sends the guest there first; a mood of 0 shows the
// crisis lines, each dialling; answered and agreed to, it goes back to the
// wizard. No time is held. It needs a service that asks for it
// (E2E_INTAKE_SERVICE, by default DEV's "konsultacja-psychologiczna");
// where there is none, it is skipped.

const service = process.env.E2E_INTAKE_SERVICE ?? "konsultacja-psychologiczna";

test("the questionnaire before a first consultation, with help at a mood of 0", async ({
  page,
}) => {
  await page.goto(`${webUrl}/umow-wizyte/test?usluga=${service}`);
  const title = page.getByRole("heading", {
    level: 1,
    name: "Test przed konsultacją",
  });
  test.skip(
    !(await title.isVisible()),
    `No service "${service}" asking for the questionnaire here.`,
  );

  await page.getByRole("button", { name: "Rozpocznij test" }).click();
  // The scale's numbers are labels over hidden radios.
  const mood = (value: number) =>
    page.locator(`label:has(input[name="mood"][value="${value}"])`);
  await mood(0).click();
  await expect(
    page.getByText("Nie musisz zmagać się z tym samodzielnie"),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: /116 123/ }).first(),
  ).toHaveAttribute("href", "tel:116123");

  // A mood to book with; each question answered with its first answer.
  await mood(5).click();
  const consent = page.getByRole("checkbox", {
    name: /Wyrażam zgodę na przetwarzanie danych o moim zdrowiu/,
  });
  for (let step = 0; step < 12; step += 1) {
    if (await consent.isVisible()) break;
    await page.getByRole("button", { name: "Dalej" }).click();
    const answers = page.locator("fieldset input");
    if ((await answers.count()) > 0 && !(await answers.first().isChecked())) {
      await answers.first().check();
    }
  }
  await consent.check();
  await page.getByRole("button", { name: "Zapisz i wybierz termin" }).click();
  await expect(
    page.getByRole("region", { name: "Wybierz formę spotkania" }),
  ).toBeVisible({ timeout: 30_000 });
});
