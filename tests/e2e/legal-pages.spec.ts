import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { webUrl } from "./support/target";

// The legal documents as a visitor sees them, whatever the CMS has
// published: Regulamin, Polityka prywatności and Pliki cookies each have
// one h1 with the document's headings under it, links that lead somewhere,
// no sideways scroll on a phone or a computer and no axe violations; the
// footer leads to each. Nothing here writes data.

test.use({ reducedMotion: "reduce" });

const PAGES = ["/regulamin", "/polityka-prywatnosci", "/cookies"];

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

test("each document's headings stand under its one h1", async ({ page }) => {
  for (const path of PAGES) {
    await open(page, path);
    await expect(page.getByRole("heading", { level: 1 }), path).toHaveCount(1);
    expect(
      await page.getByRole("main").getByRole("heading", { level: 2 }).count(),
      path,
    ).toBeGreaterThan(0);
  }
});

test("the footer leads to every legal document", async ({ page }) => {
  await open(page, "/");
  const footer = page.getByRole("contentinfo");
  for (const path of PAGES) {
    // The newsletter's consent links the policy too; that one is the form's.
    await expect(
      footer.locator(`xpath=.//a[@href="${path}"][not(ancestor::form)]`),
      path,
    ).toHaveCount(1);
  }
});

test("each document has its title, description and link preview for Google and sharing", async ({
  page,
  request,
}) => {
  for (const path of PAGES) {
    await open(page, path);
    const h1 = (await page.getByRole("heading", { level: 1 }).textContent())!;
    await expect(page, path).toHaveTitle(new RegExp(h1.trim()));
    await expect(
      page.locator('meta[name="description"]'),
      path,
    ).toHaveAttribute("content", /\S/);
    await expect(page.locator('link[rel="canonical"]'), path).toHaveAttribute(
      "href",
      new RegExp(`${path}$`),
    );
    const image = await page
      .locator('meta[property="og:image"]')
      .first()
      .getAttribute("content");
    expect(image, path).toBeTruthy();
    const response = await request.get(image!);
    expect(response.ok(), path).toBe(true);
    expect(response.headers()["content-type"], path).toMatch(/^image\//);
  }
});
