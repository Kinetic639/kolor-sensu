import { expect, test } from "@playwright/test";

const webUrl = "http://localhost:3000";

test("A: /oferta returns 200", async ({ page }) => {
  const response = await page.goto(`${webUrl}/oferta`);
  expect(response?.ok()).toBe(true);
});

test("B: Header contains an Oferta link", async ({ page }) => {
  await page.goto(`${webUrl}/`);
  await expect(
    page
      .getByRole("navigation", { name: "Nawigacja główna" })
      .getByRole("link", { name: "Oferta" }),
  ).toHaveAttribute("href", "/oferta");
});

test("C: Footer contains an Oferta link", async ({ page }) => {
  await page.goto(`${webUrl}/`);
  await expect(
    page
      .getByRole("navigation", { name: "Nawigacja w stopce" })
      .getByRole("link", { name: "Oferta" }),
  ).toHaveAttribute("href", "/oferta");
});

test("D: navigation from Home to Oferta works", async ({ page }) => {
  await page.goto(`${webUrl}/`);
  await page
    .getByRole("navigation", { name: "Nawigacja główna" })
    .getByRole("link", { name: "Oferta" })
    .click();

  await expect(page).toHaveURL(`${webUrl}/oferta`);
  await expect(
    page.getByRole("heading", { name: "Oferta", exact: true }),
  ).toBeVisible();
});

test("E: navigation from Specialists to Oferta works", async ({ page }) => {
  await page.goto(`${webUrl}/specjalisci`);
  await page
    .getByRole("navigation", { name: "Nawigacja główna" })
    .getByRole("link", { name: "Oferta" })
    .click();

  await expect(page).toHaveURL(`${webUrl}/oferta`);
});

test("F/G: only real public/active services render, using their actual DEV data", async ({
  page,
}) => {
  const response = await page.goto(`${webUrl}/oferta`);
  const html = await response!.text();

  // Confirmed live via MCP: exactly these 2 services are active+publicly_visible.
  expect(html).toContain("Terapia dla par");
  expect(html).toContain("konsultacja psychologiczna");
  // Never seeded/invented names must not appear.
  expect(html).not.toContain("Test Public Service");
  expect(html).not.toContain("Test Inactive Service");

  // G: the rendered card count matches the live public-service count
  // exactly (2, confirmed via MCP) -- structural proof that no
  // hidden/inactive service leaks through, since listPublicServices() is
  // RLS-scoped to active+publicly_visible before the page ever sees it.
  await expect(page.getByRole("heading", { level: 2 })).toHaveCount(2);
});

test("H: honest fallback renders when a public service has zero public offers", async ({
  page,
}) => {
  // Confirmed live via MCP: specialist_services is currently empty, so
  // every public service must show the no-offer fallback, never an
  // invented price.
  await page.goto(`${webUrl}/oferta`);
  const priceFallbacks = page.getByText("Cena ustalana indywidualnie");
  await expect(priceFallbacks.first()).toBeVisible();
});

test("I: no modality badge renders for a service with zero public offers", async ({
  page,
}) => {
  await page.goto(`${webUrl}/oferta`);
  await expect(page.getByText("Online", { exact: true })).toHaveCount(0);
  await expect(page.getByText("Stacjonarnie", { exact: true })).toHaveCount(0);
  await expect(page.getByText("0 specjalistów").first()).toBeVisible();
});

test("J: offer content is present in the initial server-rendered HTML", async ({
  request,
}) => {
  const response = await request.get(`${webUrl}/oferta`);
  expect(response.ok()).toBe(true);
  const html = await response.text();
  expect(html).toContain("<h1");
  expect(html).toContain("Oferta");
  expect(html).toContain("Terapia dla par");
});

test.describe("responsive /oferta", () => {
  for (const width of [390, 768, 1440]) {
    test(`no horizontal overflow or console errors at ${width}px`, async ({
      page,
    }) => {
      const consoleErrors: string[] = [];
      page.on("console", (message) => {
        if (message.type() === "error") consoleErrors.push(message.text());
      });

      await page.setViewportSize({ width, height: 900 });
      await page.goto(`${webUrl}/oferta`);

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
