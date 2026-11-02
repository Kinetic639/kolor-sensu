import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { webUrl } from "./support/target";

// Help in a crisis: one click from any page (the footer), 112 first on its
// page, every number dialling, and no axe violations on a phone. The
// footer has its own crisis block too, so the checks below look in main.

test.use({ reducedMotion: "reduce", viewport: { width: 390, height: 844 } });

test("every page's footer leads to help in a crisis, which starts with 112", async ({
  page,
}) => {
  await page.goto(`${webUrl}/kontakt`);
  await page
    .getByRole("contentinfo")
    .getByRole("link", { name: "Pomoc w kryzysie" })
    .first()
    .click();
  await expect(page).toHaveURL(/\/pomoc-w-kryzysie$/);
  await expect(
    page.getByRole("heading", { level: 1, name: /Pomoc w kryzysie/ }),
  ).toBeVisible();

  const main = page.getByRole("main");
  await expect(main.locator('a[href^="tel:"]').first()).toHaveAttribute(
    "href",
    "tel:112",
  );
  const lines = main
    .getByRole("list", { name: "Bezpłatne telefony wsparcia" })
    .locator('a[href^="tel:"]');
  expect(await lines.count()).toBeGreaterThan(0);

  const { violations } = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
    .analyze();
  expect(violations.map(({ id }) => id)).toEqual([]);
});

test("the booking wizard ends with help in a crisis (#247)", async ({
  page,
}) => {
  await page.goto(`${webUrl}/umow-wizyte`);
  const note = page
    .getByRole("main")
    .getByRole("complementary", { name: "Pomoc w kryzysie" });
  await expect(note.getByRole("link", { name: "112" })).toHaveAttribute(
    "href",
    "tel:112",
  );
  await expect(
    note.getByRole("link", { name: "Pomoc w kryzysie" }),
  ).toHaveAttribute("href", "/pomoc-w-kryzysie");
});
