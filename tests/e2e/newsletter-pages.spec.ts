import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { webUrl } from "./support/target";

// Newsletter as a visitor sees it, whatever has been sent: the archive
// (its issues, or the line before the first one), the newest issue when
// there is one, and the pages behind the e-mails' links (confirming and
// unsubscribing), each with one h1, no sideways scroll on a phone or a
// computer and no axe violations; the links' pages are kept from Google,
// say what a broken link means, and an issue not in the archive is not
// found. Nothing here writes data (a made-up code changes nothing).

test.use({ reducedMotion: "reduce" });

async function open(page: Page, path: string, status = 200) {
  await page.addInitScript(() => localStorage.setItem("ks-intro", "1"));
  const response = await page.goto(`${webUrl}${path}`);
  expect(response?.status(), path).toBe(status);
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

const robots = (page: Page) =>
  page.locator('meta[name="robots"]').getAttribute("content");

test("the archive and the newest issue", async ({ page }) => {
  await checkPage(page, "/newsletter");
  const issues = page.locator('main a[href^="/newsletter/"]');
  const hrefs = (await issues.evaluateAll((links) =>
    links.map((link) => link.getAttribute("href")),
  )) as string[];
  const numbered = hrefs.filter((href) => /^\/newsletter\/\d+$/.test(href));
  if (numbered.length === 0) {
    await expect(
      page.getByText("Pierwszy newsletter jeszcze przed nami", {
        exact: false,
      }),
    ).toBeVisible();
    return;
  }
  const newest = numbered[0]!;
  await checkPage(page, newest);
  await expect(page).toHaveTitle(/Newsletter nr \d+/);
  await expect(
    page.getByRole("link", { name: /Wszystkie wydania/ }),
  ).toBeVisible();
});

test("an issue not in the archive is not found", async ({ page }) => {
  await open(page, "/newsletter/999999", 404);
});

test("the confirmation page: kept from Google, says what a broken link means", async ({
  page,
}) => {
  await checkPage(page, "/newsletter/potwierdz");
  expect(await robots(page)).toMatch(/noindex/);
  await expect(page.getByText(/W tym linku brakuje kodu/)).toBeVisible();

  await checkPage(page, "/newsletter/potwierdz?token=e2e-made-up-token");
  await page.getByRole("button", { name: "Potwierdzam zapis" }).click();
  await expect(page.locator("main").getByRole("alert")).toContainText(
    "Ten link nie działa",
    {
      timeout: 20_000,
    },
  );
});

test("the unsubscribe page: kept from Google, says what a broken link means", async ({
  page,
}) => {
  for (const path of [
    "/newsletter/wypisz",
    "/newsletter/wypisz?kod=e2e-made-up-code",
  ]) {
    await checkPage(page, path);
    expect(await robots(page)).toMatch(/noindex/);
    await expect(page.getByText(/Ten link nie działa/)).toBeVisible();
    await expect(page.getByRole("button", { name: /Wypisz/ })).toHaveCount(0);
  }
});
