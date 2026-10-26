import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { webUrl } from "./support/target";

// The "O nas" pages as a visitor sees them, whatever the CMS has published:
// O nas, Specjaliści (and the first profile), Gabinety and Kontakt each have
// one h1, links that lead somewhere, no sideways scroll on a phone or a
// computer and no axe violations; Kontakt's map waits for consent and its
// form says what is wrong at each field. Nothing here writes data.

test.use({ reducedMotion: "reduce" });

const PAGES = ["/o-nas", "/specjalisci", "/gabinety", "/kontakt"];

async function open(page: Page, path: string) {
  // The brand intro stays away (it is off anyway); no cookie choice yet.
  await page.addInitScript(() => localStorage.setItem("ks-intro", "1"));
  const response = await page.goto(`${webUrl}${path}`);
  expect(response?.ok(), path).toBe(true);
}

async function settle(page: Page) {
  // Lazy images and reveals settle once scrolled through.
  await page.evaluate(async () => {
    for (let y = 0; y < document.body.scrollHeight; y += 600) {
      window.scrollTo(0, y);
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
    window.scrollTo(0, 0);
  });
}

async function firstProfile(page: Page) {
  await open(page, "/specjalisci");
  const href = await page
    .locator('main a[href^="/specjalisci/"]')
    .first()
    .getAttribute("href")
    .catch(() => null);
  return href;
}

for (const path of PAGES) {
  test(`${path} has one h1 and every link leads to a page`, async ({
    page,
    request,
  }) => {
    await open(page, path);
    await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
    const hrefs = await page
      .locator("main a[href]")
      .evaluateAll((links) =>
        links.map((link) => (link as HTMLAnchorElement).href),
      );
    const pages = [
      ...new Set(
        hrefs
          .filter((href) => href.startsWith(webUrl))
          .map((href) => href.split("#")[0]!),
      ),
    ];
    for (const href of pages) {
      const response = await request.get(href);
      expect(response.status(), href).toBeLessThan(400);
    }
  });

  for (const width of [390, 1280]) {
    test(`${path} at ${width} px does not scroll sideways and passes axe`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 900 });
      await open(page, path);
      await settle(page);
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - window.innerWidth,
      );
      expect(overflow).toBeLessThanOrEqual(0);
      const { violations } = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
        .analyze();
      expect(
        violations.map(({ id, nodes }) => ({
          id,
          targets: nodes.map((node) => node.target.join(" ")),
        })),
      ).toEqual([]);
    });
  }
}

test("a specialist's profile has one h1, a way back, and passes axe on a phone", async ({
  page,
}) => {
  const href = await firstProfile(page);
  test.skip(!href, "No specialist is published here");
  await page.setViewportSize({ width: 390, height: 900 });
  await open(page, href!);
  await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
  await expect(
    page.getByRole("link", { name: "Wszyscy specjaliści" }),
  ).toHaveAttribute("href", "/specjalisci");
  await settle(page);
  const { violations } = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
    .analyze();
  expect(violations.map(({ id }) => id)).toEqual([]);
});

test("Kontakt's map waits for consent, then loads", async ({ page }) => {
  await open(page, "/kontakt");
  const show = page.getByRole("button", { name: "Pokaż mapę" });
  test.skip(
    (await show.count()) === 0,
    "No company address here: no map to show",
  );
  await expect(page.locator('iframe[title^="Mapa:"]')).toHaveCount(0);
  await show.click();
  await expect(page.locator('iframe[title^="Mapa:"]')).toHaveCount(1);
});

test("Kontakt's form says what is wrong at each field, keeping what was typed", async ({
  page,
}) => {
  await open(page, "/kontakt");
  const form = page.getByRole("region", { name: /Napisz do nas/ });
  await form.getByLabel("Imię", { exact: true }).fill("Ola");
  await form.getByLabel("E-mail", { exact: true }).fill("ola@");
  await form.getByLabel("Wiadomość", { exact: true }).fill("Pytanie testowe");
  const send = form.getByRole("button", { name: "Wyślij wiadomość" });
  // Turnstile's test keys pass by themselves on DEV and STAGING; a real
  // key does not pass on localhost.
  const passed = await expect(send)
    .toBeEnabled({ timeout: 20_000 })
    .then(() => true)
    .catch(() => false);
  test.skip(!passed, "Turnstile does not pass here (a real key on localhost)");
  await send.click();
  await expect(form.getByLabel("E-mail", { exact: true })).toHaveAttribute(
    "aria-invalid",
    "true",
  );
  await expect(form.getByText("Podaj poprawny adres e-mail")).toBeVisible();
  await expect(form.getByLabel("Imię", { exact: true })).toHaveValue("Ola");
});

test("Kontakt's form starts with the message the booking page sends (#203)", async ({
  page,
}) => {
  const message = "Dzień dobry, szukam terminu: Konsultacja, online.";
  await open(
    page,
    `/kontakt?wiadomosc=${encodeURIComponent(message)}#formularz`,
  );
  await expect(page.getByLabel(/Wiadomość/)).toHaveValue(message);
  await expect(page.locator("#formularz")).toBeInViewport();
});
