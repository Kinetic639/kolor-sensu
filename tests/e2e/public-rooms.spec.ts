import { expect, test } from "@playwright/test";

const webUrl = "http://localhost:3000";

test("A: /gabinety returns 200", async ({ page }) => {
  const response = await page.goto(`${webUrl}/gabinety`);
  expect(response?.ok()).toBe(true);
});

test("B: Header contains a Gabinety link", async ({ page }) => {
  await page.goto(`${webUrl}/`);
  await expect(
    page
      .getByRole("navigation", { name: "Nawigacja główna" })
      .getByRole("link", { name: "Gabinety" }),
  ).toHaveAttribute("href", "/gabinety");
});

test("C: Footer contains a Gabinety link", async ({ page }) => {
  await page.goto(`${webUrl}/`);
  await expect(
    page
      .getByRole("navigation", { name: "Nawigacja w stopce" })
      .getByRole("link", { name: "Gabinety" }),
  ).toHaveAttribute("href", "/gabinety");
});

test("D: navigation from Home to Gabinety works", async ({ page }) => {
  await page.goto(`${webUrl}/`);
  await page
    .getByRole("navigation", { name: "Nawigacja główna" })
    .getByRole("link", { name: "Gabinety" })
    .click();

  await expect(page).toHaveURL(`${webUrl}/gabinety`);
  await expect(
    page.getByRole("heading", { name: "Gabinety", exact: true }),
  ).toBeVisible();
});

test("E: /gabinety uses real live Rooms Domain data", async ({ request }) => {
  // Confirmed live via MCP: exactly 1 published public room profile,
  // "Gabinet-Zielony", belonging to location "Siedziba Główna".
  const response = await request.get(`${webUrl}/gabinety`);
  const html = await response.text();
  expect(html).toContain("Gabinet-Zielony");
  expect(html).toContain("Siedziba Główna");
});

test("F/G: location context renders and no internal fields leak", async ({
  page,
}) => {
  const response = await page.goto(`${webUrl}/gabinety`);
  const html = await response!.text();

  // H: location name renders as a real heading, not just plain text.
  await expect(
    page.getByRole("heading", { name: "Siedziba Główna" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Gabinet-Zielony" }),
  ).toBeVisible();

  // Never expose internal/operational fields that have no public-safe
  // path under the current domain: capacity, slug, opening hours,
  // availability exceptions.
  expect(html).not.toMatch(/\bcapacity\b/i);
  expect(html).not.toContain("closed_all_day");
  expect(html).not.toContain("blocked_interval");
});

test("I: opening hours are not rendered (not public-safe under the current domain)", async ({
  page,
}) => {
  // Confirmed live via MCP: room_opening_hours has zero anon SELECT
  // policy. The page must not expose them even though 5 rows exist.
  await page.goto(`${webUrl}/gabinety`);
  await expect(page.getByText(/\d{2}:\d{2}\s*[–-]\s*\d{2}:\d{2}/)).toHaveCount(
    0,
  );
});

test("J: page content is present in the initial server-rendered HTML", async ({
  request,
}) => {
  const response = await request.get(`${webUrl}/gabinety`);
  expect(response.ok()).toBe(true);
  const html = await response.text();
  expect(html).toContain("<h1");
  expect(html).toContain("Gabinety");
  expect(html).toContain("Gabinet-Zielony");
});

test.describe("responsive /gabinety", () => {
  for (const width of [390, 768, 1440]) {
    test(`no horizontal overflow or console errors at ${width}px`, async ({
      page,
    }) => {
      const consoleErrors: string[] = [];
      page.on("console", (message) => {
        if (message.type() === "error") consoleErrors.push(message.text());
      });

      await page.setViewportSize({ width, height: 900 });
      await page.goto(`${webUrl}/gabinety`);

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
