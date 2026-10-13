import { expect, test } from "@playwright/test";
import {
  adminAccount,
  adminUrl,
  missingAccount,
  signIn,
  webUrl,
} from "./support/target";

test("the home page is rendered on the server with its title", async ({
  request,
}) => {
  const response = await request.get(webUrl);
  expect(response.ok()).toBe(true);

  // The heading is in the HTML the server sends, not fetched afterwards.
  const html = await response.text();
  expect(html).toMatch(/<title>[^<]*Kolor Sensu[^<]*<\/title>/);
  expect(html).toMatch(/<h1[\s>]/);
});

test("an arbitrary unmatched path 404s (no dynamic CMS route exists)", async ({
  request,
}) => {
  const response = await request.get(`${webUrl}/definitely-not-a-real-page`);
  expect(response.status()).toBe(404);
});

test("/specjalisci shows every published specialist", async ({
  page,
  request,
}) => {
  const published = (await (
    await request.get(`${webUrl}/api/specialists`)
  ).json()) as Array<{ displayName: string }>;

  const response = await page.goto(`${webUrl}/specjalisci`);
  expect(response?.ok()).toBe(true);
  for (const { displayName } of published) {
    await expect(
      page.getByText(displayName, { exact: true }).first(),
    ).toBeVisible();
  }
});

test("/specjalisci is responsive at common viewport widths", async ({
  page,
}) => {
  for (const width of [390, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(`${webUrl}/specjalisci`);
    await expect(
      page.getByRole("heading", { name: "Specjaliści", level: 1 }),
    ).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
});

test.describe("admin CMS editor", () => {
  test.skip(!adminAccount, missingAccount);

  // Saving replaces the home page's draft, so it runs only locally.
  test(
    "admin saves a draft of the home page",
    { tag: "@writes-data" },
    async ({ page }) => {
      await signIn(page, adminUrl, adminAccount!);
      await page.goto(`${adminUrl}/cms`);
      await expect(
        page.getByRole("button", { name: "Publikuj" }),
      ).toBeVisible();

      await page.getByRole("button", { name: "Edytuj treść" }).click();
      const dialog = page.getByRole("dialog", { name: "Treść strony głównej" });
      await dialog.getByRole("button", { name: "Zapisz szkic" }).click();
      await expect(page.getByText("Zapisano szkic")).toBeVisible();
      await expect(dialog).not.toBeVisible();
    },
  );
});
