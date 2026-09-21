import { expect, test } from "@playwright/test";

const webUrl = "http://localhost:3000";

test("A: / loads with a Header and Footer", async ({ page }) => {
  const response = await page.goto(`${webUrl}/`);
  expect(response?.ok()).toBe(true);

  await expect(page.locator("header")).toBeVisible();
  await expect(page.locator("footer")).toBeVisible();
  await expect(page.locator("main")).toBeVisible();
});

test("B: /specjalisci loads with a Header and Footer", async ({ page }) => {
  const response = await page.goto(`${webUrl}/specjalisci`);
  expect(response?.ok()).toBe(true);

  await expect(page.locator("header")).toBeVisible();
  await expect(page.locator("footer")).toBeVisible();
  await expect(page.locator("main")).toBeVisible();
});

test("C: navigation from Home to Specialists works", async ({ page }) => {
  await page.goto(`${webUrl}/`);
  await page
    .getByRole("navigation", { name: "Nawigacja główna" })
    .getByRole("link", { name: "Specjaliści" })
    .click();

  await expect(page).toHaveURL(`${webUrl}/specjalisci`);
  await expect(
    page.getByRole("heading", { name: "Specjaliści" }),
  ).toBeVisible();
});

test("D: navigation from Specialists to Home works", async ({ page }) => {
  await page.goto(`${webUrl}/specjalisci`);
  await page
    .getByRole("navigation", { name: "Nawigacja główna" })
    .getByRole("link", { name: "Strona główna" })
    .click();

  await expect(page).toHaveURL(`${webUrl}/`);
});

test("E: the mobile menu opens and exposes the same navigation", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${webUrl}/`);

  await expect(
    page.getByRole("navigation", { name: "Nawigacja główna" }),
  ).toBeHidden();

  await page.getByRole("button", { name: "Otwórz menu nawigacji" }).click();
  const mobileNav = page.getByRole("navigation", { name: "Nawigacja mobilna" });
  await expect(mobileNav).toBeVisible();
  // Mirrors the live public-navigation config, currently 4 real routes
  // (/, /specjalisci, /oferta, /gabinety) -- update this count only when
  // that config gains or loses an entry, never to make a test pass.
  await expect(mobileNav.getByRole("link")).toHaveCount(4);

  await mobileNav.getByRole("link", { name: "Specjaliści" }).click();
  await expect(page).toHaveURL(`${webUrl}/specjalisci`);
});

test("F: no navigation link points to a non-existent route", async ({
  page,
}) => {
  await page.goto(`${webUrl}/`);

  const knownRoutes = new Set(["/", "/specjalisci", "/oferta", "/gabinety"]);
  const headerLinks = await page
    .locator("header nav a")
    .evaluateAll((links) => links.map((link) => new URL(link.href).pathname));
  const footerLinks = await page
    .locator("footer nav a")
    .evaluateAll((links) => links.map((link) => new URL(link.href).pathname));

  for (const href of [...headerLinks, ...footerLinks]) {
    expect(knownRoutes.has(href)).toBe(true);
  }
});

test.describe("responsive shell", () => {
  for (const width of [390, 768, 1440]) {
    test(`no horizontal overflow or console errors at ${width}px`, async ({
      page,
    }) => {
      const consoleErrors: string[] = [];
      page.on("console", (message) => {
        if (message.type() === "error") consoleErrors.push(message.text());
      });

      await page.setViewportSize({ width, height: 900 });
      await page.goto(`${webUrl}/`);
      await page.goto(`${webUrl}/specjalisci`);

      const hasOverflow = await page.evaluate(
        () =>
          document.documentElement.scrollWidth >
          document.documentElement.clientWidth,
      );
      expect(hasOverflow).toBe(false);
      expect(consoleErrors).toEqual([]);
    });
  }
});
