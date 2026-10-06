import { expect, test, type Page } from "@playwright/test";

const widths = [390, 768, 1440] as const;

function collectRuntimeErrors(page: Page) {
  const errors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  page.on("pageerror", (error) => errors.push(error.message));
  return errors;
}

test("rich-text editor remains responsive at QA widths", async ({ page }) => {
  const runtimeErrors = collectRuntimeErrors(page);

  for (const width of widths) {
    await page.setViewportSize({ width, height: width === 390 ? 844 : 1000 });
    await page.goto(
      "/iframe.html?id=rich-text-editor--all-formatting-features&viewMode=story",
    );
    await expect(
      page.getByRole("textbox", { name: "Edytor tekstu sformatowanego" }),
    ).toBeVisible();
    await expect(
      page.getByRole("toolbar", { name: "Formatowanie tekstu" }),
    ).toBeVisible();

    const hasHorizontalOverflow = await page.evaluate(
      () =>
        document.documentElement.scrollWidth >
        document.documentElement.clientWidth,
    );
    expect(hasHorizontalOverflow, `horizontal overflow at ${width}px`).toBe(
      false,
    );
  }

  expect(runtimeErrors).toEqual([]);
});

test("toolbar formatting and safe link editing work", async ({ page }) => {
  const runtimeErrors = collectRuntimeErrors(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/iframe.html?id=rich-text-editor--empty&viewMode=story");

  const editor = page.getByRole("textbox", {
    name: "Edytor tekstu sformatowanego",
  });
  await editor.click();
  await page.getByRole("button", { name: "Pogrubienie" }).click();
  await editor.pressSequentially("Ważna treść");
  await expect(editor.locator("strong")).toHaveText("Ważna treść");

  await editor.press("Control+A");
  await page.getByRole("button", { name: "Edytuj link" }).click();
  const linkInput = page.getByLabel("Adres linku");
  await linkInput.fill("javascript:alert(1)");
  await page.getByRole("button", { name: "Zapisz link" }).click();
  await expect(page.getByRole("alert")).toBeVisible();
  await linkInput.fill("https://example.com");
  await page.getByRole("button", { name: "Zapisz link" }).click();
  await expect(
    editor.getByRole("link", { name: "Ważna treść" }),
  ).toHaveAttribute("href", "https://example.com");

  expect(runtimeErrors).toEqual([]);
});

test("renderer displays semantic content without client errors", async ({
  page,
}) => {
  const runtimeErrors = collectRuntimeErrors(page);
  await page.goto(
    "/iframe.html?id=rich-text-renderer--all-formatting&viewMode=story",
  );

  await expect(
    page.getByRole("heading", {
      level: 2,
      name: "Jak wygląda pierwsze spotkanie?",
    }),
  ).toBeVisible();
  await expect(page.getByRole("list").first()).toBeVisible();
  await expect(
    page.getByText("Nie musisz wiedzieć, od czego zacząć."),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "zasady spotkań" }),
  ).toHaveAttribute("href", "/oferta");
  expect(runtimeErrors).toEqual([]);
});

for (const story of [
  "rich-text-editor--link-editor-open",
  "rich-text-renderer--all-formatting",
] as const) {
  test(`Storybook a11y reports no violations for ${story}`, async ({
    page,
  }) => {
    await page.goto(`/?path=/story/${story}&addonPanel=storybook/a11y/panel`);
    const accessibilityTab = page.getByRole("tab", { name: /Accessibility/i });
    await expect(accessibilityTab).toBeVisible();
    await accessibilityTab.click();
    await expect(
      page.getByText("No accessibility violations found."),
    ).toBeVisible();
  });
}
