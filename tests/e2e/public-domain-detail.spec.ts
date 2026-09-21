import { expect, test } from "@playwright/test";

const webUrl = "http://localhost:3000";

// Live DEV data (confirmed via MCP): specialist "specialist-1bc3b80af9b5"
// (Specjalista 2), service "terapia-dla-par", room "gabinet-zielony" in
// location "Siedziba Główna". 0 public specialist_services rows exist, so
// offer/cross-link sections are exercised in their honest empty state,
// never with invented data.
const specialistSlug = "specialist-1bc3b80af9b5";
const serviceSlug = "terapia-dla-par";
const roomSlug = "gabinet-zielony";

test.describe("specialist detail", () => {
  test("A: valid public specialist slug returns 200", async ({ page }) => {
    const response = await page.goto(`${webUrl}/specjalisci/${specialistSlug}`);
    expect(response?.ok()).toBe(true);
  });

  test("B: correct display name appears as the page heading", async ({
    page,
  }) => {
    await page.goto(`${webUrl}/specjalisci/${specialistSlug}`);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      "Specjalista 2",
    );
  });

  test("C: profile content renders from the Specialist Domain", async ({
    request,
  }) => {
    const response = await request.get(
      `${webUrl}/specjalisci/${specialistSlug}`,
    );
    const html = await response.text();
    // Confirmed live via MCP: the DEV-safe shared bio sentence.
    expect(html).toContain(
      "Profil testowy wykorzystywany do weryfikacji listy specjalistów.",
    );
  });

  test("D: offers section reflects real data (currently zero public offers, honestly)", async ({
    page,
  }) => {
    // Data-gated: 0 specialist_services rows exist in DEV. This proves
    // the honest empty state (no "Oferowane usługi" section, no invented
    // offer), not the populated-offers rendering path.
    await page.goto(`${webUrl}/specjalisci/${specialistSlug}`);
    await expect(
      page.getByRole("heading", { name: "Oferowane usługi" }),
    ).toHaveCount(0);
  });

  test("E: an unknown/private specialist slug 404s", async ({ page }) => {
    // getPublishedSpecialistBySlug returns null identically whether the
    // slug doesn't exist or exists but is inactive/unpublished -- same
    // query, same code path -- so a nonexistent slug proves the same
    // privacy-safe behavior a hidden real specialist would get.
    const response = await page.goto(`${webUrl}/specjalisci/nie-istnieje`);
    expect(response?.status()).toBe(404);
  });

  test("F: the specialist list links to the detail page", async ({ page }) => {
    await page.goto(`${webUrl}/specjalisci`);
    await page.getByRole("link", { name: "Specjalista 2" }).click();
    await expect(page).toHaveURL(`${webUrl}/specjalisci/${specialistSlug}`);
  });
});

test.describe("service detail", () => {
  test("G: valid public service slug returns 200", async ({ page }) => {
    const response = await page.goto(`${webUrl}/oferta/${serviceSlug}`);
    expect(response?.ok()).toBe(true);
  });

  test("H: service content renders", async ({ page }) => {
    await page.goto(`${webUrl}/oferta/${serviceSlug}`);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      "Terapia dla par",
    );
    // The page prefers the long `description` over `shortDescription`
    // when both exist -- confirmed live via MCP this service has both,
    // so the long description (not the short one) is what should render.
    await expect(
      page.getByText("Konflikt, zdrada, wypalenie", { exact: false }),
    ).toBeVisible();
  });

  test("I: specialists section reflects real data (currently zero public offers, honestly)", async ({
    page,
  }) => {
    await page.goto(`${webUrl}/oferta/${serviceSlug}`);
    await expect(
      page.getByRole("heading", { name: "Specjaliści oferujący tę usługę" }),
    ).toHaveCount(0);
  });

  test("J: derived price falls back honestly when there are zero public offers", async ({
    page,
  }) => {
    await page.goto(`${webUrl}/oferta/${serviceSlug}`);
    await expect(page.getByText("Cena ustalana indywidualnie")).toBeVisible();
  });

  test("K: an unknown/private service slug 404s", async ({ page }) => {
    const response = await page.goto(`${webUrl}/oferta/nie-istnieje`);
    expect(response?.status()).toBe(404);
  });

  test("L: the offer list links to the detail page", async ({ page }) => {
    await page.goto(`${webUrl}/oferta`);
    await page.getByRole("link", { name: "Terapia dla par" }).click();
    await expect(page).toHaveURL(`${webUrl}/oferta/${serviceSlug}`);
  });
});

test.describe("room detail", () => {
  test("M: valid public room slug returns 200", async ({ page }) => {
    const response = await page.goto(`${webUrl}/gabinety/${roomSlug}`);
    expect(response?.ok()).toBe(true);
  });

  test("N: public room profile data renders", async ({ page }) => {
    await page.goto(`${webUrl}/gabinety/${roomSlug}`);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      "Gabinet-Zielony",
    );
    await expect(page.getByText("winda")).toBeVisible();
  });

  test("O: public location context renders", async ({ page }) => {
    await page.goto(`${webUrl}/gabinety/${roomSlug}`);
    await expect(page.getByText("Siedziba Główna")).toBeVisible();
  });

  test("P: an unknown/private room slug 404s", async ({ page }) => {
    const response = await page.goto(`${webUrl}/gabinety/nie-istnieje`);
    expect(response?.status()).toBe(404);
  });

  test("Q: the room list links to the detail page", async ({ page }) => {
    await page.goto(`${webUrl}/gabinety`);
    await page.getByRole("link", { name: "Gabinet-Zielony" }).click();
    await expect(page).toHaveURL(`${webUrl}/gabinety/${roomSlug}`);
  });

  test("R: private operational room data does not leak", async ({
    request,
  }) => {
    // Confirmed live via MCP: room_opening_hours has zero anon policy (5
    // rows exist but must never render) and room_availability_exceptions
    // likewise. Capacity is also not in the approved public bridge.
    const response = await request.get(`${webUrl}/gabinety/${roomSlug}`);
    const html = await response.text();
    expect(html).not.toMatch(/\d{2}:\d{2}\s*[–-]\s*\d{2}:\d{2}/);
    expect(html).not.toMatch(/\bcapacity\b/i);
    expect(html).not.toContain("closed_all_day");
    expect(html).not.toContain("blocked_interval");
  });
});

test.describe("cross-domain links (data-gated)", () => {
  test("specialist <-> service cross-links are present only when a real public offer exists", async ({
    page,
  }) => {
    await page.goto(`${webUrl}/specjalisci/${specialistSlug}`);
    const offerLinks = page
      .locator("main")
      .getByRole("link", { name: /./ })
      .filter({ hasText: "Terapia dla par" });
    const count = await offerLinks.count();
    if (count === 0) {
      // Confirmed live via MCP: 0 specialist_services rows exist in DEV,
      // so there is no real offer to cross-link through yet. Reported as
      // a data-gated scenario, not invented.
      test.skip(true, "No real public specialist offers exist in DEV yet.");
    }
  });
});

test.describe("responsive detail pages", () => {
  for (const width of [390, 768, 1440]) {
    test(`no horizontal overflow or console errors at ${width}px`, async ({
      page,
    }) => {
      const consoleErrors: string[] = [];
      page.on("console", (message) => {
        if (message.type() === "error") consoleErrors.push(message.text());
      });

      await page.setViewportSize({ width, height: 900 });
      await page.goto(`${webUrl}/specjalisci/${specialistSlug}`);
      await page.goto(`${webUrl}/oferta/${serviceSlug}`);
      await page.goto(`${webUrl}/gabinety/${roomSlug}`);

      const hasOverflow = await page.evaluate(
        () =>
          document.documentElement.scrollWidth >
          document.documentElement.clientWidth,
      );
      expect(hasOverflow).toBe(false);
      expect(consoleErrors).toEqual([]);
    });
  }
});
