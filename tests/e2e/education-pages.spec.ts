import AxeBuilder from "@axe-core/playwright";
import {
  type APIRequestContext,
  expect,
  test,
  type Page,
} from "@playwright/test";
import { webUrl } from "./support/target";

// Edukacja as a visitor sees it, whatever the portal has published:
// /edukacja, the articles and the e-books, and the first article's and
// e-book's pages, each with one h1, links that lead somewhere, no sideways
// scroll on a phone or a computer and no axe violations; an article tells
// Google it is an Article and an e-book that it is a Book; an e-book's film
// loads nothing until it is clicked; a wrong address is not found. Nothing
// here writes data.

test.use({ reducedMotion: "reduce" });

async function open(page: Page, path: string, status = 200) {
  await page.addInitScript(() => localStorage.setItem("ks-intro", "1"));
  const response = await page.goto(`${webUrl}${path}`);
  expect(response?.status(), path).toBe(status);
}

async function settle(page: Page) {
  await page.evaluate(async () => {
    for (let y = 0; y < document.body.scrollHeight; y += 600) {
      window.scrollTo(0, y);
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
    window.scrollTo(0, 0);
  });
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

/** The first link under a path on a list page, if any is published. */
async function first(page: Page, list: string, prefix: string) {
  await open(page, list);
  const links = await page
    .locator(`main a[href^="${prefix}"]`)
    .evaluateAll((all) => all.map((one) => one.getAttribute("href")!));
  return (
    links.find(
      (href) => !href.includes("/kategoria/") && href !== prefix.slice(0, -1),
    ) ?? null
  );
}

async function structuredData(page: Page, type: string) {
  const data = await page
    .locator('script[type="application/ld+json"]')
    .allTextContents();
  return data
    .map(
      (one) =>
        JSON.parse(one) as { "@type"?: string } & Record<string, unknown>,
    )
    .find((one) => one["@type"] === type);
}

for (const path of ["/edukacja", "/edukacja/artykuly", "/edukacja/ebooki"]) {
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

test("an article: one h1, axe, links, and Google told it is an Article", async ({
  page,
  request,
}) => {
  const href = await first(page, "/edukacja/artykuly", "/edukacja/artykuly/");
  test.skip(!href, "No article is published here");
  await checkPage(page, href!);
  await checkLinks(page, request);
  const article = await structuredData(page, "Article");
  expect(article?.headline).toBeTruthy();
  await expect(
    page.getByRole("link", { name: /Pomoc w kryzysie/ }).first(),
  ).toBeVisible();
});

test("an e-book: one h1, axe, links, a Book for Google, the film on a click", async ({
  page,
  request,
}) => {
  const href = await first(page, "/edukacja/ebooki", "/edukacja/ebooki/");
  test.skip(!href, "No e-book is published here");
  await checkPage(page, href!);
  await checkLinks(page, request);
  expect((await structuredData(page, "Book"))?.name).toBeTruthy();
  const play = page.getByRole("button", { name: "Odtwórz film" });
  if ((await play.count()) > 0) {
    await expect(page.locator("main iframe")).toHaveCount(0);
    await play.click();
    await expect(page.locator("main iframe")).toHaveAttribute(
      "src",
      /youtube-nocookie\.com|player\.vimeo\.com.*dnt=1/,
    );
  }
});

test("a wrong address under Edukacja is not found", async ({ page }) => {
  await open(page, "/edukacja/artykuly/nie-ma-takiego-artykulu", 404);
  await open(page, "/edukacja/ebooki/nie-ma-takiego-ebooka", 404);
  await open(page, "/edukacja/artykuly/kategoria/nie-ma-takiej", 404);
});

test("an article's draft preview is not open to visitors", async ({ page }) => {
  await open(
    page,
    "/edukacja/artykuly/podglad/00000000-0000-4000-8000-000000000000",
    404,
  );
});
