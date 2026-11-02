// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import { toFreeSlots } from "@repo/scheduling";
import type { BookableOffer } from "@repo/supabase";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { BookingParams } from "./search-params";
import { resolveBookingSelection } from "./selection";
import { buildWizardView } from "./wizard";

// The wizard's page body as the client sees it: the notices after a time
// was taken or a hold expired, a form dropped for a specialist, and
// "Zacznij od nowa". The server actions are never sent.
vi.mock("./actions", () => ({
  holdTimeAction: vi.fn(),
  startOverAction: vi.fn(),
}));
vi.mock("./turnstile-widget", () => ({ TurnstileWidget: () => null }));
vi.mock("./release-on-return", () => ({ ReleaseOnReturn: () => null }));

const { BookingWizard } = await import("./booking-wizard");

afterEach(cleanup);

const offer = (
  specialist: string,
  overrides: Partial<BookableOffer> = {},
): BookableOffer => ({
  serviceId: "id-konsultacja",
  serviceName: "Konsultacja",
  serviceSlug: "konsultacja",
  specialistPublicSlug: specialist,
  specialistName: `Imię ${specialist}`,
  specialistProfessionalTitle: null,
  specialistPhotoPath: null,
  priceMinor: 25000,
  currencyCode: "PLN",
  effectiveDurationMinutes: 50,
  supportsInPerson: true,
  supportsOnline: true,
  ...overrides,
});

const offers = [offer("anna"), offer("jan", { supportsOnline: false })];
const catalog = {
  services: [
    {
      id: "id-konsultacja",
      name: "Konsultacja",
      slug: "konsultacja",
      shortDescription: null,
      description: null,
      category: "consultation" as const,
      defaultDurationMinutes: 50,
    },
  ],
  offers,
  locations: [],
};

const empty: BookingParams = {
  usluga: null,
  forma: null,
  lokalizacja: null,
  specjalista: null,
  tydzien: null,
  termin: null,
  uwaga: null,
};

// Wednesday 9 January 2030, 10:00 and 11:00 in Warsaw.
const slots = toFreeSlots(
  [
    { starts_at: "2030-01-09T09:00:00Z", ends_at: "2030-01-09T09:50:00Z" },
    { starts_at: "2030-01-09T10:00:00Z", ends_at: "2030-01-09T10:50:00Z" },
  ],
  "Europe/Warsaw",
);

function renderWizard(values: Partial<BookingParams>) {
  const params = { ...empty, ...values };
  const view = buildWizardView({
    params,
    selection: resolveBookingSelection(params, catalog),
    offers,
    photos: new Map(),
    today: "2030-01-09",
    horizonDays: 30,
    slots,
  });
  render(
    <BookingWizard params={params} turnstileSiteKey="test-key" view={view} />,
  );
}

const timeStep: Partial<BookingParams> = {
  usluga: "konsultacja",
  forma: "online",
  specjalista: "anna",
  tydzien: "2030-01-07",
};

describe("a time chosen before the meeting form", () => {
  it("keeps the fourth step checked and offers continuing instead of choosing the time again", () => {
    renderWizard({ ...timeStep, termin: "2030-01-09T10:00" });
    expect(
      screen.getByRole("heading", { name: "Termin wybrany" }),
    ).toBeVisible();
    expect(
      screen.getByRole("link", { name: "Krok 4: Termin (ukończony)" }),
    ).toHaveAttribute("aria-current", "step");
    expect(
      screen.queryByRole("heading", { name: "Wybierz termin" }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Przejdź dalej" })).toBeVisible();
    expect(screen.getByRole("link", { name: "Zmień: Termin" })).toBeVisible();
  });
});

describe("a time taken before the client chose it (card 28)", () => {
  it("says so and shows the week's free times again, none chosen", () => {
    renderWizard({ ...timeStep, uwaga: "termin-zajety" });
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Ten termin został właśnie zajęty. Wybierz, proszę, inny wolny termin.",
    );
    expect(
      screen.getByRole("heading", { name: "Wybierz termin" }),
    ).toBeVisible();
    for (const time of [/10:00/, /11:00/]) {
      expect(screen.getAllByRole("link", { name: time })[0]).toBeVisible();
    }
    // Nothing to hold until a time is chosen again.
    expect(screen.queryByRole("button", { name: "Przejdź dalej" })).toBeNull();
  });
});

describe("back after the hold expired (card 14)", () => {
  it("the choices are kept, the time is chosen anew", () => {
    renderWizard({ ...timeStep, uwaga: "rezerwacja-wygasla" });
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Czas na dokończenie rezerwacji minął i termin został zwolniony. Wybierz termin ponownie.",
    );
    const summary = screen.getByRole("region", { name: "Twoja rezerwacja" });
    expect(within(summary).getByText("Konsultacja")).toBeVisible();
    expect(within(summary).getByText("Imię anna")).toBeVisible();
    expect(within(summary).getByText("Wybierz termin")).toBeVisible();
  });
});

describe("a form the new specialist does not give (card 13)", () => {
  it("tells why it was dropped and asks for the form again", () => {
    renderWizard({
      usluga: "konsultacja",
      forma: "online",
      specjalista: "jan",
    });
    expect(screen.getByRole("status")).toHaveTextContent(
      "Imię jan nie prowadzi usługi „Konsultacja” online. Wybierz, proszę, formę spotkania ponownie.",
    );
    expect(
      screen.getByRole("heading", { name: "Wybierz formę spotkania" }),
    ).toBeVisible();
    expect(screen.queryByRole("link", { name: /Online/ })).toBeNull();
  });
});

describe("the times are Polish time (card 27)", () => {
  it("the time step says so", () => {
    renderWizard(timeStep);
    expect(
      screen.getByText(/Godziny podajemy w czasie polskim\./),
    ).toBeVisible();
  });
});

describe("Zacznij od nowa (card 15)", () => {
  it("is offered once something is chosen", () => {
    renderWizard(timeStep);
    expect(
      screen.getByRole("button", { name: "Zacznij od nowa" }),
    ).toHaveAttribute("type", "submit");
  });

  it("not on an empty wizard", () => {
    renderWizard({});
    expect(
      screen.queryByRole("button", { name: "Zacznij od nowa" }),
    ).toBeNull();
  });
});
