import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { webUrl } from "./support/target";

// The home page as a visitor sees it, whatever the CMS has published: one
// h1, the crisis strip with numbers to call, the closing invitation, links
// that lead somewhere, no sideways scroll on a phone and no axe violations.
// The brand intro is skipped (it plays once, and is checked in Storybook);
// reduced motion keeps the sections from being caught mid-reveal.

test.use({ reducedMotion: "reduce" });

async function openHome(page: Page) {
  await page.addInitScript(() => localStorage.setItem("ks-intro", "1"));
  const response = await page.goto(webUrl);
  expect(response?.ok()).toBe(true);
}

test("the home page has one h1, the crisis strip and the closing invitation", async ({
  page,
}) => {
  await openHome(page);
  await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);

  const crisis = page.getByRole("complementary").filter({
    has: page.locator('a[href^="tel:"]'),
  });
  await expect(crisis).toHaveCount(1);
  await expect(crisis.locator('a[href="tel:112"]')).toBeVisible();

  const main = page.getByRole("main");
  await expect(
    main.getByRole("link", { name: "Skontaktuj się" }).last(),
  ).toHaveAttribute("href", "/kontakt");
  await expect(main.locator('a[href="/umow-wizyte"]').last()).toBeVisible();
});

test("a first visit shows no brand intro (it is off for now)", async ({
  page,
}) => {
  const response = await page.goto(webUrl);
  expect(response?.ok()).toBe(true);
  await expect(page.locator(".ks-intro")).toHaveCount(0);
});

test("a shared link shows a picture: the CMS's, or the site's own 1200 × 630", async ({
  page,
  request,
}) => {
  await openHome(page);
  const content = await page
    .locator('meta[property="og:image"]')
    .first()
    .getAttribute("content");
  expect(content).toBeTruthy();
  const image = await request.get(content!);
  expect(image.ok()).toBe(true);
  expect(image.headers()["content-type"]).toMatch(/^image\//);
  // The site's own picture (no CMS photo set) says its size.
  if (new URL(content!).pathname.endsWith("/opengraph-image")) {
    await expect(
      page.locator('meta[property="og:image:width"]'),
    ).toHaveAttribute("content", "1200");
  }
});

test("every link on the home page leads to a page", async ({
  page,
  request,
}) => {
  await openHome(page);
  const hrefs = await page
    .locator("a[href]")
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
  expect(pages.length).toBeGreaterThan(5);
  for (const href of pages) {
    const response = await request.get(href);
    expect(response.status(), href).toBeLessThan(400);
  }
});

for (const width of [390, 1280]) {
  test(`at ${width} px the home page does not scroll sideways and passes axe`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    await openHome(page);
    // Lazy images and reveals settle once scrolled through.
    await page.evaluate(async () => {
      for (let y = 0; y < document.body.scrollHeight; y += 600) {
        window.scrollTo(0, y);
        await new Promise((resolve) => setTimeout(resolve, 50));
      }
      window.scrollTo(0, 0);
    });

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
