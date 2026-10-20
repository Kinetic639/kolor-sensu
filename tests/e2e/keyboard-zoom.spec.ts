import { expect, test, type Page } from "@playwright/test";
import { webUrl } from "./support/target";

// The public pages with a keyboard and zoomed in, whatever the CMS and the
// portal have published: the first Tab is "Przejdź do treści" and it leads
// into the page; nothing the keyboard reaches hides under the cookie notice
// (WCAG 2.4.11); at 200 % (a 1280 px screen is then 640 px wide) the page
// does not scroll sideways (1.4.10). Nothing here writes data.

test.use({ reducedMotion: "reduce" });

const PAGES = [
  "/",
  "/o-nas",
  "/specjalisci",
  "/gabinety",
  "/kontakt",
  "/oferta",
  "/cennik",
  "/regulamin",
  "/polityka-prywatnosci",
  "/cookies",
];

async function open(page: Page, path: string) {
  // The brand intro stays away; no cookie choice yet (the notice shows).
  await page.addInitScript(() => localStorage.setItem("ks-intro", "1"));
  const response = await page.goto(`${webUrl}${path}`);
  expect(response?.ok(), path).toBe(true);
}

/** Every page here, with the first service's page. */
async function pages(page: Page) {
  await open(page, "/oferta");
  const service = await page
    .locator('main a[href^="/oferta/"]')
    .first()
    .getAttribute("href")
    .catch(() => null);
  return service ? [...PAGES, service] : PAGES;
}

test("the first Tab on every page skips to its content", async ({ page }) => {
  for (const path of await pages(page)) {
    await open(page, path);
    await page.keyboard.press("Tab");
    const skip = page.locator(":focus");
    await expect(skip, path).toHaveText("Przejdź do treści");
    await expect(skip, path).toBeVisible();
    await page.keyboard.press("Enter");
    await expect(page, path).toHaveURL(/#tresc$/);
  }
});

test("nothing the keyboard reaches hides under the cookie notice", async ({
  page,
}) => {
  for (const path of await pages(page)) {
    await open(page, path);
    const notice = page.getByRole("region", { name: "Pliki cookies" });
    await expect(notice, path).toBeVisible();
    const hidden: string[] = [];
    for (let stop = 0; stop < 40; stop++) {
      await page.keyboard.press("Tab");
      const under = await page.evaluate(() => {
        const focused = document.activeElement as HTMLElement | null;
        const notice = document.querySelector('[aria-label="Pliki cookies"]');
        if (!focused || !notice || notice.contains(focused)) return null;
        // Wholly covered: no corner nor the middle shows.
        const box = focused.getBoundingClientRect();
        const points = [
          [box.left + 2, box.top + 2],
          [box.right - 2, box.top + 2],
          [box.left + 2, box.bottom - 2],
          [box.right - 2, box.bottom - 2],
          [box.left + box.width / 2, box.top + box.height / 2],
        ];
        const covered = points.every(([x, y]) => {
          const top = document.elementFromPoint(x!, y!);
          return top !== null && notice.contains(top);
        });
        return covered
          ? (focused.textContent ?? "").trim().slice(0, 40) || focused.tagName
          : null;
      });
      if (under) hidden.push(under);
    }
    expect(hidden, path).toEqual([]);
  }
});

test("at 200 % no page scrolls sideways", async ({ page }) => {
  await page.setViewportSize({ width: 640, height: 450 });
  for (const path of await pages(page)) {
    await open(page, path);
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    );
    expect(overflow, path).toBeLessThanOrEqual(0);
  }
});
