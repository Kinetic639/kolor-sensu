import { expect, test, type Page } from "@playwright/test";

function collectRuntimeErrors(page: Page) {
  const errors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  page.on("pageerror", (error) => errors.push(error.message));
  return errors;
}

for (const story of [
  {
    id: "scheduling-schedulingfoundation--specialist-header-with-availability",
    name: "specialist-composition",
    expected: "Anna Nowak",
  },
  {
    id: "scheduling-schedulingfoundation--room-header-with-availability",
    name: "room-composition",
    expected: "Gabinet 2",
  },
  {
    id: "scheduling-resourceheader--specialist-no-availability",
    name: "specialist-unavailable",
    expected: "Karolina Adamczyk",
  },
  {
    id: "scheduling-availabilityblock--unavailable",
    name: "availability-unavailable",
    expected: "Brak dostępności",
  },
  {
    id: "scheduling-schedulingfoundation--online-availability-example",
    name: "online-availability",
    expected: "Online",
  },
  {
    id: "scheduling-schedulingfoundation--hybrid-availability-example",
    name: "hybrid-availability",
    expected: "Hybrydowo",
  },
  {
    id: "scheduling-resourceheader--container-widths",
    name: "resource-header-widths",
    expected: "Narrow · 176 px",
  },
  {
    id: "scheduling-availabilityblock--container-widths",
    name: "availability-widths",
    expected: "Wide · 320 px",
  },
  {
    id: "scheduling-availabilityblock--room-sage-compact",
    name: "availability-compact",
    expected: "Gabinet 1",
  },
  {
    id: "scheduling-schedulingfoundation--room-header-no-availability",
    name: "room-unavailable-composition",
    expected: "Brak dostępności",
  },
] as const) {
  test(`${story.name} renders without runtime errors`, async ({
    page,
  }, testInfo) => {
    const runtimeErrors = collectRuntimeErrors(page);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`/iframe.html?id=${story.id}&viewMode=story`);

    await expect(page.getByText(story.expected).first()).toBeVisible();
    expect(
      await page.evaluate(
        () =>
          document.documentElement.scrollWidth >
          document.documentElement.clientWidth,
      ),
    ).toBe(false);
    await page.screenshot({
      path: testInfo.outputPath(`${story.name}.png`),
      fullPage: true,
    });
    expect(runtimeErrors).toEqual([]);
  });
}
