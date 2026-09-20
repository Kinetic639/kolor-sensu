import { expect, test } from "@playwright/test";

const stories = [
  {
    name: "admin",
    id: "portal-dashboard-compositions--admin-desktop",
    heading: "Dzień dobry, Michale",
  },
  {
    name: "specialist",
    id: "portal-dashboard-compositions--specialist-desktop",
    heading: "Panel główny",
  },
] as const;

const viewports = [375, 390, 430, 768, 1024, 1280, 1440] as const;

for (const story of stories) {
  test(`${story.name} dashboard remains responsive without runtime errors`, async ({
    page,
  }) => {
    const runtimeErrors: string[] = [];
    page.on("console", (message) => {
      if (message.type() === "error") runtimeErrors.push(message.text());
    });
    page.on("pageerror", (error) => runtimeErrors.push(error.message));

    for (const width of viewports) {
      await page.setViewportSize({ width, height: width < 768 ? 844 : 1000 });
      await page.goto(`/iframe.html?id=${story.id}&viewMode=story`);
      await expect(
        page.getByRole("heading", { level: 1, name: story.heading }),
      ).toBeVisible();

      const hasHorizontalOverflow = await page.evaluate(
        () =>
          document.documentElement.scrollWidth >
          document.documentElement.clientWidth,
      );
      expect(hasHorizontalOverflow, `horizontal overflow at ${width}px`).toBe(
        false,
      );

      if (width === 390 || width === 1440) {
        await page.screenshot({
          path: `artifacts/portal-${story.name}-${width}.png`,
          fullPage: true,
        });
      }
    }

    expect(runtimeErrors).toEqual([]);
  });
}

test("Storybook accessibility panel loads for dashboard primitives", async ({
  page,
}) => {
  await page.goto(
    "/?path=/story/portal-dashboard-primitives--appointment&addonPanel=storybook/a11y/panel",
  );

  const accessibilityTab = page.getByRole("tab", { name: /Accessibility/i });
  await expect(accessibilityTab).toBeVisible();
  await accessibilityTab.click();
  await expect(
    page.getByText("No accessibility violations found."),
  ).toBeVisible();
  await page.screenshot({
    path: "artifacts/storybook-a11y.png",
    fullPage: true,
  });
});

test("tablet navigation opens as an accessible drawer", async ({ page }) => {
  await page.setViewportSize({ width: 768, height: 1024 });
  await page.goto(
    "/iframe.html?id=portal-dashboard-compositions--admin-desktop&viewMode=story",
  );

  await page.getByRole("button", { name: "Przełącz nawigację" }).click();
  const navigationDrawer = page.getByRole("dialog", {
    name: "Nawigacja portalu",
  });

  await expect(navigationDrawer).toBeVisible();
  await expect(
    navigationDrawer.getByRole("link", { name: "Dashboard" }),
  ).toHaveAttribute("aria-current", "page");
  await expect(
    page.getByRole("navigation", { name: "Nawigacja mobilna" }),
  ).toBeHidden();
  await page.screenshot({
    path: "artifacts/portal-admin-tablet-navigation.png",
    fullPage: true,
  });
});
