import AxeBuilder from "@axe-core/playwright";
import {
  type APIRequestContext,
  expect,
  test,
  type Page,
} from "@playwright/test";
import { webUrl } from "./support/target";

// The offer pages as a visitor sees them, whatever the portal and the CMS
// have published: Oferta, Cennik and the first service's page each have one
// h1, links that lead somewhere, no sideways scroll on a phone or a
// computer and no axe violations; a service's page tells Google about the
// service; a wrong address under /oferta leads back to the offer. Nothing
// here writes data.

test.use({ reducedMotion: "reduce" });

async function open(page: Page, path: string, status = 200) {
  await page.addInitScript(() => localStorage.setItem("ks-intro", "1"));
  const response = await page.goto(`${webUrl}${path}`);
  expect(response?.status(), path).toBe(status);
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

async function firstService(page: Page) {
  await open(page, "/oferta");
  return page
    .locator('main a[href^="/oferta/"]')
    .first()
    .getAttribute("href")
    .catch(() => null);
}

async function checkPage(page: Page, path: string) {
  for (const width of [390, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    await open(page, path);
    await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
    await settle(page);
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

async function checkLinks(page: Page, request: APIRequestContext) {
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
}

for (const path of ["/oferta", "/cennik"]) {
  test(`${path}: one h1, no sideways scroll, axe on a phone and a computer`, async ({
    page,
  }) => {
    await checkPage(page, path);
  });

  test(`${path}: every link leads to a page`, async ({ page, request }) => {
    await open(page, path);
    await checkLinks(page, request);
  });
}

test("Oferta has no questions: they are on Kontakt", async ({ page }) => {
  await open(page, "/oferta");
  await expect(
    page.getByRole("heading", { name: "Zanim się zapiszesz" }),
  ).toHaveCount(0);
});

test("Cennik says how payment and cancelling work", async ({ page }) => {
  await open(page, "/cennik");
  await expect(
    page.getByRole("region", { name: /Płatności i odwołania/ }),
  ).toBeVisible();
});

test("a service's page: one h1, axe, links, a way to book or to ask", async ({
  page,
  request,
}) => {
  const href = await firstService(page);
  test.skip(!href, "No service is published here");
  await checkPage(page, href!);
  await checkLinks(page, request);
  // Booked online, or the price agreed and a way to call or write.
  const book = page
    .getByRole("main")
    .getByRole("link", { name: /Umów wizytę/ });
  const ask = page.locator('main a[href="/kontakt"]');
  expect((await book.count()) + (await ask.count())).toBeGreaterThan(0);
  if ((await book.count()) > 0) {
    await expect(book.first()).toHaveAttribute(
      "href",
      `/umow-wizyte?usluga=${href!.split("/").at(-1)}`,
    );
  }
});

test("a service's page tells Google about the service", async ({ page }) => {
  const href = await firstService(page);
  test.skip(!href, "No service is published here");
  await open(page, href!);
  const data = await page
    .locator('script[type="application/ld+json"]')
    .allTextContents();
  const service = data
    .map((one) => JSON.parse(one) as { "@type"?: string; name?: string })
    .find((one) => one["@type"] === "Service");
  expect(service?.name).toBeTruthy();
  await expect(page).toHaveTitle(new RegExp(service!.name!));
});

test("a wrong address under /oferta leads back to the offer", async ({
  page,
}) => {
  await open(page, "/oferta/nie-ma-takiej-uslugi", 404);
  await expect(
    page.getByRole("link", { name: /Zobacz ofertę/ }),
  ).toHaveAttribute("href", "/oferta");
});
