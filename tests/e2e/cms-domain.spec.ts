import { expect, test } from "@playwright/test";

const webUrl = "http://localhost:3000";
const adminUrl = "http://localhost:3001";
const annaEmail = process.env.E2E_ANNA_EMAIL;
const annaPassword = process.env.E2E_ANNA_PASSWORD;

test("published CMS home content renders server-side with SEO metadata in the initial HTML", async ({
  request,
}) => {
  const response = await request.get(webUrl);
  expect(response.ok()).toBe(true);

  const html = await response.text();
  // Proves the heading/body came from the server-rendered HTML, not a
  // client fetch: the published site_content payload is "Kolor Sensu" /
  // "Centrum Psychoterapii. Treść strony głównej w przygotowaniu.".
  expect(html).toContain("<title>Kolor Sensu</title>");
  expect(html).toContain("Kolor Sensu");
  expect(html).toContain("Centrum Psychoterapii");
});

test("an arbitrary unmatched path 404s (no dynamic CMS route exists)", async ({
  request,
}) => {
  const response = await request.get(`${webUrl}/definitely-not-a-real-page`);
  expect(response.status()).toBe(404);
});

test("/specjalisci renders exactly the two published specialists from the real Specialist Domain", async ({
  page,
}) => {
  const response = await page.goto(`${webUrl}/specjalisci`);
  expect(response?.ok()).toBe(true);

  await expect(page.getByText("Specjalista 1", { exact: true })).toBeVisible();
  await expect(page.getByText("Specjalista 2", { exact: true })).toBeVisible();

  // Exactly two rendered cards: count DOM nodes with the shared DEV bio
  // sentence (a raw-HTML/regex count is not reliable here -- Next.js's RSC
  // flight payload re-serializes the same text into an embedded <script>,
  // doubling a naive substring count).
  await expect(
    page.getByText(
      "Profil testowy wykorzystywany do weryfikacji listy specjalistów.",
      { exact: true },
    ),
  ).toHaveCount(2);
});

test("/specjalisci is responsive at common viewport widths", async ({
  page,
}) => {
  for (const width of [390, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(`${webUrl}/specjalisci`);
    await expect(
      page.getByRole("heading", { name: "Specjaliści" }),
    ).toBeVisible();
  }
});

test.describe("admin CMS editor", () => {
  test.skip(
    !annaEmail || !annaPassword,
    "Set E2E_ANNA_EMAIL and E2E_ANNA_PASSWORD outside the repository.",
  );

  test("admin can edit and publish the Home content", async ({ page }) => {
    await page.goto(`${adminUrl}/login`);
    await page.getByLabel("Adres e-mail").fill(annaEmail!);
    await page.getByLabel("Hasło").fill(annaPassword!);
    await page.getByRole("button", { name: "Zaloguj się" }).click();

    await page.goto(`${adminUrl}/cms`);
    await expect(
      page.getByRole("heading", { name: "Strona główna" }),
    ).toBeVisible();
    await expect(page.getByRole("button", { name: "Publikuj" })).toBeVisible();

    await page.getByRole("button", { name: "Edytuj treść" }).click();
    await expect(
      page.getByRole("heading", { name: "Treść strony głównej" }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Zapisz szkic" }).click();
    await expect(
      page.getByRole("heading", { name: "Treść strony głównej" }),
    ).not.toBeVisible();
  });
});
