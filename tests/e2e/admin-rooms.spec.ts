import {
  expect,
  test,
  type APIRequestContext,
  type Page,
} from "@playwright/test";

const adminUrl = "http://localhost:3001";
const email = process.env.E2E_ANNA_EMAIL;
const password = process.env.E2E_ANNA_PASSWORD;
const specialistEmail = process.env.E2E_SPECIALIST_EMAIL;
const specialistPassword = process.env.E2E_SPECIALIST_PASSWORD;
const supabaseUrl = process.env.E2E_SUPABASE_URL;
const serviceRoleKey = process.env.E2E_SUPABASE_SERVICE_ROLE_KEY;

async function login(page: Page, user: string, secret: string) {
  await page.goto(`${adminUrl}/login`);
  await page.getByLabel("Adres e-mail").fill(user);
  await page.getByLabel("Hasło").fill(secret);
  await page.getByRole("button", { name: "Zaloguj się" }).click();
}

test.describe("Admin Gabinety", () => {
  const suffix = Date.now();
  const locationSlug = `e2e-lokalizacja-${suffix}`;
  const roomSlug = `e2e-gabinet-${suffix}`;

  test.skip(
    !email || !password || !supabaseUrl || !serviceRoleKey,
    "Set secure Admin and Supabase cleanup credentials outside the repository.",
  );

  test.afterAll(async ({ request }) => {
    await cleanup(request, "rooms", roomSlug);
    await cleanup(request, "locations", locationSlug);
  });

  test("admin configures a usable room from an empty resource setup", async ({
    page,
  }) => {
    await login(page, email!, password!);
    await page.goto(`${adminUrl}/gabinety`);
    await expect(page.getByRole("heading", { name: "Gabinety" })).toBeVisible();

    await page.getByRole("button", { name: "Dodaj lokalizację" }).click();
    await page.getByLabel("Nazwa lokalizacji").fill("Lokalizacja E2E");
    await page.getByLabel("Slug lokalizacji").fill(locationSlug);
    await page.getByLabel("Adres").fill("Testowa 1");
    await page.getByLabel("Miasto").fill("Warszawa");
    await page.getByRole("button", { name: "Zapisz lokalizację" }).click();
    await expect(page.getByText("Lokalizacja E2E")).toBeVisible();

    await page.getByRole("button", { name: "Dodaj gabinet" }).click();
    await page.getByLabel("Nazwa gabinetu").fill("Gabinet E2E");
    await page.getByLabel("Slug gabinetu").fill(roomSlug);
    await page.getByLabel("Pojemność").fill("3");
    await page.getByRole("button", { name: "Utwórz gabinet" }).click();
    await expect(page).toHaveURL(/\/gabinety\/[0-9a-f-]+$/);
    await expect(
      page.getByRole("heading", { name: "Gabinet E2E" }),
    ).toBeVisible();

    await page.getByRole("button", { name: "Edytuj gabinet" }).click();
    await page.getByLabel("Nazwa gabinetu").fill("Gabinet E2E poprawiony");
    await page.getByRole("button", { name: "Zapisz gabinet" }).click();
    await expect(
      page.getByRole("heading", { name: "Gabinet E2E poprawiony" }),
    ).toBeVisible();

    await page.getByRole("tab", { name: "Profil publiczny" }).click();
    await page.getByLabel("Nazwa publiczna").fill("Gabinet terapeutyczny E2E");
    await page.getByLabel("Profil opublikowany").click();
    await page.getByRole("button", { name: "Zapisz profil publiczny" }).click();

    await page.getByRole("tab", { name: "Godziny otwarcia" }).click();
    await page.getByRole("button", { name: "Dodaj przedział" }).first().click();
    await page.getByRole("button", { name: "Zapisz godziny" }).click();
    await expect(page.getByText("Zmiany zostały zapisane")).toBeVisible();

    await page.getByRole("tab", { name: "Dostępność" }).click();
    await page.getByRole("button", { name: "Dodaj wyjątek" }).click();
    await page.getByLabel("Powód").fill("Zamknięcie E2E");
    await page.getByRole("button", { name: "Zapisz wyjątek" }).click();
    await expect(page.getByText("Zamknięcie E2E")).toBeVisible();
  });

  for (const width of [390, 768, 1440]) {
    test(`rooms list is responsive at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await login(page, email!, password!);
      await page.goto(`${adminUrl}/gabinety`);
      await expect(
        page.getByRole("heading", { name: "Gabinety" }),
      ).toBeVisible();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
    });
  }
});

test.describe("specialist-only room management access", () => {
  test.skip(
    !specialistEmail || !specialistPassword,
    "Set secure specialist-only credentials outside the repository.",
  );
  test("specialist cannot manage rooms in Admin", async ({ page }) => {
    await login(page, specialistEmail!, specialistPassword!);
    await page.goto(`${adminUrl}/gabinety`);
    await expect(page).toHaveURL(`${adminUrl}/access-denied`);
  });
});

async function cleanup(
  request: APIRequestContext,
  table: "rooms" | "locations",
  slug: string,
) {
  if (!supabaseUrl || !serviceRoleKey) return;
  const headers = {
    apikey: serviceRoleKey,
    Authorization: `Bearer ${serviceRoleKey}`,
    Prefer: "return=representation",
  };
  if (table === "rooms") {
    const response = await request.get(
      `${supabaseUrl}/rest/v1/rooms?slug=eq.${slug}&select=id`,
      { headers },
    );
    const rows = response.ok()
      ? ((await response.json()) as { id: string }[])
      : [];
    for (const row of rows) {
      for (const child of [
        "room_availability_exceptions",
        "room_opening_hours",
        "room_public_profiles",
      ]) {
        await request.delete(
          `${supabaseUrl}/rest/v1/${child}?room_id=eq.${row.id}`,
          { headers },
        );
      }
    }
  }
  await request.delete(`${supabaseUrl}/rest/v1/${table}?slug=eq.${slug}`, {
    headers,
  });
}
