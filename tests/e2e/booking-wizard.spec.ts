import { expect, test } from "@playwright/test";
import {
  bookUntilDetails,
  chooseTime,
  goToTimes,
  holdChosenTime,
  pickTime,
  newVisitor,
} from "./support/booking";
import { webUrl } from "./support/target";

// The wizard around a booking (Klient · 1 in Miro): coming back to it from
// the header, starting again, a time someone else took first, and the
// hours in Polish time. Every time held here is given back at the end; the
// details step is never sent.

// Each test a visitor of its own (the hold limit, @holds).
test.beforeEach(({ context }) => newVisitor(context));

const header = (page: import("@playwright/test").Page) =>
  page.getByRole("banner");

test("Dokończ rezerwację leads back to where the booking was left (card 11) @holds", async ({
  page,
}) => {
  test.setTimeout(120_000);
  await goToTimes(page);
  const times = page.url();
  // Inside the wizard the header stays as it is.
  await expect(
    header(page).getByRole("link", { name: "Umów wizytę" }),
  ).toBeVisible();

  await page.goto(`${webUrl}/o-nas`);
  const resume = header(page).getByRole("link", { name: "Dokończ rezerwację" });
  await expect(resume).toBeVisible();
  await resume.click();
  await expect(
    page.getByRole("region", { name: "Wybierz termin" }),
  ).toBeVisible();
  const back = new URL(page.url());
  for (const key of ["usluga", "forma", "specjalista"]) {
    expect(back.searchParams.get(key)).toBe(
      new URL(times).searchParams.get(key),
    );
  }

  // With a time held, it leads to the details step.
  await pickTime(page);
  await holdChosenTime(page);
  await expect(page.getByRole("region", { name: "Twoje dane" })).toBeVisible();
  await page.goto(`${webUrl}/`);
  await header(page).getByRole("link", { name: "Dokończ rezerwację" }).click();
  await expect(page.getByRole("region", { name: "Twoje dane" })).toBeVisible();

  // Starting again: nothing left to finish.
  await page.getByRole("button", { name: "Zacznij od nowa" }).click();
  await expect(
    page.getByRole("region", { name: "Wybierz usługę" }),
  ).toBeVisible();
  await page.goto(`${webUrl}/`);
  await expect(
    header(page).getByRole("link", { name: "Umów wizytę" }),
  ).toBeVisible();
});

test("Zacznij od nowa clears the choices and gives the time back at once (card 15) @holds", async ({
  page,
}) => {
  test.setTimeout(120_000);
  const { timeHref } = await bookUntilDetails(page);

  await page.getByRole("button", { name: "Zacznij od nowa" }).click();
  await expect(page).toHaveURL(`${webUrl}/umow-wizyte`);
  const summary = page.getByRole("region", { name: "Twoja rezerwacja" });
  await expect(summary.getByText("Wybierz usługę")).toBeVisible();
  await expect(summary.getByText("Wybierz specjalistę")).toBeVisible();

  // The same time is free again at once: chosen, it can be held.
  await page.goto(timeHref);
  await expect(summary.getByText("Wybierz termin")).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Przejdź dalej" }),
  ).toBeVisible();
});

test("a time taken while the client looked at it (card 28) @holds", async ({
  page,
  browser,
}) => {
  test.setTimeout(150_000);
  // Another guest has the same time chosen, not yet held.
  const timeHref = await chooseTime(page);
  const other = await browser.newContext();
  await newVisitor(other);
  const late = await other.newPage();
  await late.goto(timeHref);
  await expect(late.getByText("Gotowe. Możesz przejść dalej.")).toBeVisible({
    timeout: 30_000,
  });

  // The first holds it; the other, a moment later, is told and sees the
  // week's free times again, without it.
  await holdChosenTime(page);
  await expect(page.getByRole("region", { name: "Twoje dane" })).toBeVisible();
  await late.getByRole("button", { name: "Przejdź dalej" }).click();
  await expect(
    late
      .getByRole("alert")
      .filter({ hasText: "Ten termin został właśnie zajęty." }),
  ).toHaveText(
    "Ten termin został właśnie zajęty. Wybierz, proszę, inny wolny termin.",
  );
  const step = late.getByRole("region", { name: "Wybierz termin" });
  await expect(step).toBeVisible();
  const time = new URL(timeHref).searchParams.get("termin")!;
  await expect(
    step.locator(`a[href*="termin=${encodeURIComponent(time)}"]`),
  ).toHaveCount(0);
  await other.close();

  await page.getByRole("button", { name: "Zacznij od nowa" }).click();
  await expect(
    page.getByRole("region", { name: "Wybierz usługę" }),
  ).toBeVisible();
});

test.describe("abroad", () => {
  test.use({ timezoneId: "America/New_York" });

  test("the hours are Polish time, and the page says so (card 27)", async ({
    page,
  }) => {
    await goToTimes(page);
    await expect(
      page.getByText("Godziny podajemy w czasie polskim."),
    ).toBeVisible();
    // A time's link carries the same wall-clock hour as its label.
    const slot = page
      .getByRole("region", { name: "Wybierz termin" })
      .getByRole("link", { name: /, \d{2}:\d{2}$/ })
      .first();
    if ((await slot.count()) === 0) return;
    const label =
      (await slot.getAttribute("aria-label")) ?? (await slot.textContent())!;
    const href = new URL((await slot.getAttribute("href"))!, webUrl);
    expect(label).toContain(href.searchParams.get("termin")!.slice(11));
  });
});

for (const preferredMode of ["online", "stacjonarnie"] as const) {
  test(
    "a preselected visit continues automatically to details after choosing " +
      preferredMode +
      " @holds",
    async ({ page }) => {
      test.setTimeout(120_000);
      const services = (await (
        await page.request.get(webUrl + "/api/services")
      ).json()) as { name: string; slug: string }[];
      const service = services.find(
        (one) =>
          one.name ===
          (process.env.E2E_BOOKING_SERVICE ?? "Konsultacja testowa E2E"),
      )!;
      const offers = (await (
        await page.request.get(
          webUrl + "/api/services/" + service.slug + "/offers",
        )
      ).json()) as { specialistPublicSlug: string }[];
      const query = new URLSearchParams({
        specjalista: offers[0]!.specialistPublicSlug,
        usluga: service.slug,
        najblizszy: "1",
      });
      const preview = (await (
        await page.request.get(
          webUrl + "/api/booking/specialist-preview?" + query,
        )
      ).json()) as {
        picker: {
          days: {
            slots: {
              options: { service: string; mode: string; href: string }[];
            }[];
          }[];
        };
      };
      const options = preview.picker.days
        .flatMap((day) => day.slots)
        .flatMap((slot) => slot.options)
        .filter((option) => option.service === service.slug);
      const complete = new URL(
        options.find((option) => option.mode === preferredMode)!.href,
        webUrl,
      );
      const values = Object.fromEntries(
        ["usluga", "specjalista", "termin"].map((key) => [
          key,
          complete.searchParams.get(key)!,
        ]),
      );
      await page.goto(webUrl + "/umow-wizyte?" + new URLSearchParams(values));
      const summary = page.getByRole("region", { name: "Twoja rezerwacja" });
      await expect(
        page.getByRole("region", { name: "Wybierz formę spotkania" }),
      ).toBeVisible();
      await expect(summary.getByText(/godz\./)).toContainText(
        values.termin!.slice(11),
      );
      await expect(
        page.getByRole("link", { name: "Krok 3: Specjalista (ukończony)" }),
      ).toBeVisible();
      await page
        .getByRole("region", { name: "Wybierz formę spotkania" })
        .getByRole("link", {
          name:
            complete.searchParams.get("forma") === "online"
              ? "Online"
              : "Stacjonarnie",
          exact: true,
        })
        .click();
      if (
        new URL(page.url()).searchParams.get("forma") === "stacjonarnie" &&
        (await page
          .getByRole("region", { name: "Wybierz miejsce" })
          .isVisible())
      ) {
        const hrefs = await page
          .getByRole("region", { name: "Wybierz miejsce" })
          .getByRole("link")
          .evaluateAll((links) =>
            links.map((link) => (link as HTMLAnchorElement).href),
          );
        await page.goto(
          hrefs.find(
            (href) =>
              new URL(href).searchParams.get("lokalizacja") ===
              complete.searchParams.get("lokalizacja"),
          ) ?? hrefs[0]!,
        );
      }
      try {
        await expect(page).toHaveURL(/\/umow-wizyte\/dane$/, {
          timeout: 45_000,
        });
        await expect(
          page.getByRole("region", { name: "Twoje dane" }),
        ).toBeVisible();
        await expect(
          page.getByRole("group", { name: "Krok 5: Dane" }),
        ).toHaveAttribute("aria-current", "step");
      } finally {
        const restart = page.getByRole("button", { name: "Zacznij od nowa" });
        if (await restart.isVisible()) await restart.click();
      }
    },
  );
}
