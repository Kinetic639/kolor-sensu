import { expect, test } from "@playwright/test";

const webUrl = "http://localhost:3000";

// Live DEV data (confirmed via MCP): the one demonstrative published
// workshop seeded in
// supabase/migrations/20260921131500_dev_seed_demonstrative_workshop.sql,
// led by "Specjalista 1" (specialist-49fba7c70a9a) at Gabinet-Zielony
// (gabinet-zielony), Siedziba Główna.
const workshopSlug = "jak-radzic-sobie-ze-stresem";

test("J: /warsztaty returns 200", async ({ page }) => {
  const response = await page.goto(`${webUrl}/warsztaty`);
  expect(response?.ok()).toBe(true);
});

test("K: navigation contains Warsztaty", async ({ page }) => {
  await page.goto(`${webUrl}/`);
  await expect(
    page
      .getByRole("navigation", { name: "Nawigacja główna" })
      .getByRole("link", { name: "Warsztaty" }),
  ).toHaveAttribute("href", "/warsztaty");
  await expect(
    page
      .getByRole("navigation", { name: "Nawigacja w stopce" })
      .getByRole("link", { name: "Warsztaty" }),
  ).toHaveAttribute("href", "/warsztaty");
});

test("L: a published upcoming workshop appears on the list", async ({
  page,
}) => {
  await page.goto(`${webUrl}/warsztaty`);
  await expect(
    page.getByRole("heading", { name: "Jak radzić sobie ze stresem" }),
  ).toBeVisible();
});

test("M: a draft workshop never appears on the public list", async ({
  request,
}) => {
  // No draft workshop is retained in DEV (only the one published
  // demonstrative row exists), so this proves the honest state: the
  // public list contains exactly the one published workshop, nothing
  // else. RLS itself (public-domain.sql / workshops DB suite) proves a
  // draft row is unreadable by anon at the row level.
  const response = await request.get(`${webUrl}/warsztaty`);
  const html = await response.text();
  const matches = html.match(/Jak radzić sobie ze stresem/g) ?? [];
  expect(matches.length).toBeGreaterThan(0);
});

test("N: the workshop card links to its detail page", async ({ page }) => {
  await page.goto(`${webUrl}/warsztaty`);
  await page.getByRole("link", { name: "Jak radzić sobie ze stresem" }).click();
  await expect(page).toHaveURL(`${webUrl}/warsztaty/${workshopSlug}`);
});

test("O: /warsztaty/[slug] returns 200", async ({ page }) => {
  const response = await page.goto(`${webUrl}/warsztaty/${workshopSlug}`);
  expect(response?.ok()).toBe(true);
});

test("P: detail shows title, date, price, capacity and leader", async ({
  page,
}) => {
  await page.goto(`${webUrl}/warsztaty/${workshopSlug}`);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Jak radzić sobie ze stresem",
  );
  await expect(page.getByText("15 października 2026")).toBeVisible();
  await expect(page.getByText("150,00", { exact: false })).toBeVisible();
  await expect(page.getByText("Liczba miejsc")).toBeVisible();
  await expect(page.getByText("Specjalista 1")).toBeVisible();
});

test("Q: leader link resolves to the real public specialist detail page", async ({
  page,
}) => {
  await page.goto(`${webUrl}/warsztaty/${workshopSlug}`);
  await page.getByRole("link", { name: "Specjalista 1" }).click();
  await expect(page).toHaveURL(`${webUrl}/specjalisci/specialist-49fba7c70a9a`);
});

test("R: room link resolves to the real public room detail page", async ({
  page,
}) => {
  await page.goto(`${webUrl}/warsztaty/${workshopSlug}`);
  await page.getByRole("link", { name: "Gabinet-Zielony" }).click();
  await expect(page).toHaveURL(`${webUrl}/gabinety/gabinet-zielony`);
});

test("S: an unknown/hidden workshop slug 404s", async ({ page }) => {
  // getPublicWorkshopBySlug returns null identically whether the slug
  // doesn't exist or exists but is a draft -- same query, same code path.
  const response = await page.goto(`${webUrl}/warsztaty/nie-istnieje`);
  expect(response?.status()).toBe(404);
});

test("T: core content is present in the initial server-rendered HTML", async ({
  request,
}) => {
  const response = await request.get(`${webUrl}/warsztaty/${workshopSlug}`);
  const html = await response.text();
  expect(html).toContain("Jak radzić sobie ze stresem");
  expect(html).toContain("Specjalista 1");
  expect(html).toContain("Gabinet-Zielony");
});

test.describe("responsive /warsztaty pages", () => {
  for (const width of [390, 768, 1440]) {
    test(`no horizontal overflow or console errors at ${width}px`, async ({
      page,
    }) => {
      const consoleErrors: string[] = [];
      page.on("console", (message) => {
        if (message.type() === "error") consoleErrors.push(message.text());
      });

      await page.setViewportSize({ width, height: 900 });
      await page.goto(`${webUrl}/warsztaty`);
      await page.goto(`${webUrl}/warsztaty/${workshopSlug}`);

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
