import { expect, test, type Page } from "@playwright/test";
import { webUrl } from "./support/target";

// The cookie notice as a visitor uses it: equal buttons on the first
// screen, nothing from Google before consent, the choice kept with its
// date and version, and the footer's "Ustawienia plików cookies" to change
// or withdraw consent, which the map on Kontakt follows at once. Nothing
// here writes data on the server.

test.use({ reducedMotion: "reduce" });

const notice = (page: Page) =>
  page.getByRole("region", { name: "Pliki cookies" });

async function open(page: Page, path: string) {
  const response = await page.goto(`${webUrl}${path}`);
  expect(response?.ok(), path).toBe(true);
}

test("the notice offers equal buttons, and nothing from Google loads before consent", async ({
  page,
}) => {
  const google: string[] = [];
  page.on("request", (request) => {
    if (/google\.com|gstatic\.com|googleapis\.com/.test(request.url())) {
      google.push(request.url());
    }
  });
  await open(page, "/kontakt");
  const buttons = notice(page).getByRole("button");
  await expect(buttons).toHaveText([
    "Akceptuję wszystkie",
    "Tylko niezbędne",
    "Dostosuj",
  ]);
  const classes = await buttons.evaluateAll((all) =>
    all.map((button) => button.className),
  );
  expect(new Set(classes).size).toBe(1);
  await expect(page.locator('iframe[title^="Mapa:"]')).toHaveCount(0);
  expect(google).toEqual([]);
});

test("a refusal is kept with its date and version, and the notice goes", async ({
  page,
}) => {
  await open(page, "/");
  await notice(page).getByRole("button", { name: "Tylko niezbędne" }).click();
  await expect(notice(page)).toHaveCount(0);
  const record = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("ks-cookie-consent") ?? "null"),
  );
  expect(record).toMatchObject({ version: 1, categories: { external: false } });
  expect(Number.isNaN(Date.parse(record.givenAt))).toBe(false);
  await page.reload();
  await expect(notice(page)).toHaveCount(0);
});

test("consent to the map is given and withdrawn from the footer, and the map follows", async ({
  page,
}) => {
  await open(page, "/kontakt");
  const map = page.locator('iframe[title^="Mapa:"]');
  test.skip(
    (await page.getByRole("button", { name: "Pokaż mapę" }).count()) === 0,
    "No company address here: no map",
  );

  await notice(page).getByRole("button", { name: "Dostosuj" }).click();
  await notice(page)
    .getByRole("checkbox", { name: /Mapy i treści zewnętrzne/ })
    .check();
  await notice(page).getByRole("button", { name: "Zapisz wybór" }).click();
  await expect(map).toHaveCount(1);

  const settings = page
    .getByRole("contentinfo")
    .getByRole("button", { name: "Ustawienia plików cookies" });
  await settings.click();
  await expect(notice(page)).toBeVisible();
  const maps = notice(page).getByRole("checkbox", {
    name: /Mapy i treści zewnętrzne/,
  });
  await expect(maps).toBeChecked();
  await maps.uncheck();
  await notice(page).getByRole("button", { name: "Zapisz wybór" }).click();
  await expect(map).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Pokaż mapę" })).toBeVisible();
});

test("the footer's settings close without changing the choice", async ({
  page,
}) => {
  await open(page, "/");
  await notice(page)
    .getByRole("button", { name: "Akceptuję wszystkie" })
    .click();
  const before = await page.evaluate(() =>
    localStorage.getItem("ks-cookie-consent"),
  );
  await page
    .getByRole("contentinfo")
    .getByRole("button", { name: "Ustawienia plików cookies" })
    .click();
  await notice(page).getByRole("button", { name: "Zamknij bez zmian" }).click();
  await expect(notice(page)).toHaveCount(0);
  expect(
    await page.evaluate(() => localStorage.getItem("ks-cookie-consent")),
  ).toBe(before);
});
