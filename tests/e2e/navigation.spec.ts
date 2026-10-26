import { expect, test, type Page } from "@playwright/test";
import { webUrl } from "./support/target";

// The header's menu, whatever the CMS and the portal have published: on a
// computer each item leads to a page (a dropdown's pages too) and "Umów
// wizytę" opens booking; on a phone the menu opens and closes with the
// keyboard, gives the focus back, and a tap on an item opens its page.
// Nothing here writes data.

test.use({ reducedMotion: "reduce" });

const ITEMS = ["O nas", "Oferta", "Edukacja"];

async function open(page: Page, path = "/") {
  await page.addInitScript(() => localStorage.setItem("ks-intro", "1"));
  const response = await page.goto(`${webUrl}${path}`);
  expect(response?.ok(), path).toBe(true);
}

test("on a computer every menu item leads to a page", async ({
  page,
  request,
}) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await open(page);
  const header = page.getByRole("banner");
  const nav = header.getByRole("navigation", { name: "Główna" });
  for (const label of ITEMS) {
    await expect(nav.getByText(label, { exact: true })).toBeVisible();
  }
  await expect(
    header.getByRole("link", { name: "Umów wizytę" }),
  ).toHaveAttribute("href", "/umow-wizyte");

  const hrefs = new Set<string>();
  const collect = async () => {
    for (const href of await nav
      .getByRole("link")
      .evaluateAll((links) =>
        links.map((link) => (link as HTMLAnchorElement).href),
      )) {
      hrefs.add(href.split("#")[0]!);
    }
  };
  await collect();
  // A dropdown's pages show once it is open. Pointed at, it opens (right
  // after another closes, at once: a click then would close it again).
  for (const label of await nav.getByRole("button").allInnerTexts()) {
    const trigger = nav.getByRole("button", {
      name: label.trim(),
      exact: true,
    });
    await trigger.hover();
    await expect(trigger).toHaveAttribute("aria-expanded", "true");
    await collect();
    await page.keyboard.press("Escape");
  }
  for (const label of ITEMS) {
    expect(
      [...hrefs].some((href) =>
        href.startsWith(
          `${webUrl}/${label === "O nas" ? "o-nas" : label.toLowerCase()}`,
        ),
      ),
      label,
    ).toBe(true);
  }
  for (const href of hrefs) {
    const response = await request.get(href);
    expect(response.status(), href).toBeLessThan(400);
  }
});

test("on a phone the menu opens and closes with the keyboard, then leads to a page", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await open(page);
  const button = page.getByRole("button", { name: "Otwórz menu" });
  await button.focus();
  await page.keyboard.press("Enter");
  const menu = page.getByRole("dialog", { name: "Menu" });
  await expect(menu).toBeVisible();
  const nav = menu.getByRole("navigation", { name: "Główna" });
  for (const label of ITEMS) {
    await expect(
      nav.getByRole("link", { name: label, exact: true }),
    ).toBeVisible();
  }

  await page.keyboard.press("Escape");
  await expect(menu).toBeHidden();
  await expect(button).toBeFocused();

  await button.click();
  await nav.getByRole("link", { name: "Oferta", exact: true }).click();
  await expect(page).toHaveURL(`${webUrl}/oferta`, { timeout: 15_000 });
  await expect(menu).toBeHidden();
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
});
