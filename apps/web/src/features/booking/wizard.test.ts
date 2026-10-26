import type { PublicLocation } from "@repo/contracts";
import { toFreeSlots } from "@repo/scheduling";
import type { BookableOffer } from "@repo/supabase";
import { describe, expect, it } from "vitest";
import type { BookingParams } from "./search-params";
import { resolveBookingSelection, type BookingCatalog } from "./selection";
import { bookingWeek, buildWizardView, type WizardInput } from "./wizard";

const service = (slug: string, name: string) => ({
  id: `id-${slug}`,
  name,
  slug,
  shortDescription: `O ${name}`,
  description: null,
  category: "consultation" as const,
  defaultDurationMinutes: 50,
});

const offer = (
  serviceSlug: string,
  specialist: string,
  overrides: Partial<BookableOffer> = {},
): BookableOffer => ({
  serviceId: `id-${serviceSlug}`,
  serviceName: serviceSlug,
  serviceSlug,
  specialistPublicSlug: specialist,
  specialistName: `Imię ${specialist}`,
  specialistProfessionalTitle: "Psycholog",
  specialistPhotoPath: null,
  priceMinor: 25000,
  currencyCode: "PLN",
  effectiveDurationMinutes: 50,
  supportsInPerson: true,
  supportsOnline: true,
  ...overrides,
});

const location = (slug: string, name: string): PublicLocation => ({
  id: `id-${slug}`,
  name,
  slug,
  addressLine1: null,
  addressLine2: null,
  postalCode: null,
  city: null,
  countryCode: "PL",
  sortOrder: 0,
  publicDescription: null,
  amenities: [],
  accessibilityNotes: null,
  directions: null,
});

const offers = [
  offer("konsultacja", "anna"),
  offer("konsultacja", "jan", { priceMinor: 20000, supportsOnline: false }),
  offer("terapia", "anna", { supportsInPerson: false }),
];
const catalog: BookingCatalog = {
  services: [
    service("konsultacja", "Konsultacja"),
    service("terapia", "Terapia par"),
  ],
  offers,
  locations: [location("centrum", "Centrum")],
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

// Prices as Intl writes them, with a non-breaking space.
const zl = (amount: number) => `${amount} zł`;

function view(
  params: Partial<BookingParams>,
  {
    catalog: other,
    ...extra
  }: Partial<WizardInput> & { catalog?: BookingCatalog } = {},
) {
  const all = { ...empty, ...params };
  return buildWizardView({
    params: all,
    selection: resolveBookingSelection(all, other ?? catalog),
    offers,
    photos: new Map([["anna", "https://photo/anna"]]),
    today: "2030-01-09",
    horizonDays: 20,
    slots: [],
    ...extra,
  });
}

describe("the service step", () => {
  it("offers every service with its length, price and forms", () => {
    const { stepIndex, panel, summary } = view({});
    expect(stepIndex).toBe(0);
    expect(panel.kind).toBe("choices");
    if (panel.kind !== "choices") return;
    expect(panel.title).toBe("Wybierz usługę");
    expect(panel.cards[0]).toMatchObject({
      title: "Konsultacja",
      description: "O Konsultacja",
      facts: ["50 min", `od ${zl(200)}`],
      tags: ["Stacjonarnie", "Online"],
      href: "/umow-wizyte?usluga=konsultacja",
      selected: false,
    });
    expect(panel.cards[1]).toMatchObject({
      facts: ["50 min", zl(250)],
      tags: ["Online"],
    });
    expect(
      summary.map((row) => [row.label, row.value ?? row.placeholder]),
    ).toEqual([
      ["Usługa", "Wybierz usługę"],
      ["Forma", "Wybierz formę spotkania"],
      ["Specjalista", "Wybierz specjalistę"],
      ["Termin", "Wybierz termin"],
    ]);
  });
});

describe("the form step", () => {
  it("offers the forms of the chosen service; the service can be changed", () => {
    const { stepIndex, panel, summary, steps } = view({
      usluga: "konsultacja",
    });
    expect(stepIndex).toBe(1);
    if (panel.kind !== "choices") throw new Error(panel.kind);
    expect(panel.cards.map((card) => [card.title, card.href])).toEqual([
      ["Stacjonarnie", "/umow-wizyte?usluga=konsultacja&forma=stacjonarnie"],
      ["Online", "/umow-wizyte?usluga=konsultacja&forma=online"],
    ]);
    expect(summary[0]).toMatchObject({
      value: "Konsultacja",
      changeHref: "/umow-wizyte",
    });
    expect(steps[0]!.href).toBe("/umow-wizyte");
  });

  it("asks for the place when there are several", () => {
    const { panel } = view(
      { usluga: "konsultacja", forma: "stacjonarnie" },
      {
        catalog: {
          ...catalog,
          locations: [
            location("centrum", "Centrum"),
            location("mokotow", "Mokotów"),
          ],
        },
      },
    );
    if (panel.kind !== "choices") throw new Error(panel.kind);
    expect(panel.title).toBe("Wybierz miejsce");
    expect(panel.cards.map((card) => card.title)).toEqual([
      "Centrum",
      "Mokotów",
    ]);
  });
});

describe("the specialist step", () => {
  it("offers who gives the service in that form, with price and photo", () => {
    const { stepIndex, panel, summary } = view({
      usluga: "konsultacja",
      forma: "stacjonarnie",
    });
    expect(stepIndex).toBe(2);
    if (panel.kind !== "choices") throw new Error(panel.kind);
    expect(panel.cards[0]).toMatchObject({
      title: "Imię anna",
      subtitle: "Psycholog",
      photoUrl: "https://photo/anna",
      facts: [zl(250), "50 min"],
      href: "/umow-wizyte?usluga=konsultacja&forma=stacjonarnie&specjalista=anna",
    });
    expect(panel.cards).toHaveLength(2);
    expect(summary[1]).toMatchObject({ value: "Stacjonarnie · Centrum" });
  });
});

const chosen: Partial<BookingParams> = {
  usluga: "konsultacja",
  forma: "online",
  specjalista: "anna",
};

// 2030-01-09 is a Wednesday; its week starts on Monday 2030-01-07.
const slots = toFreeSlots(
  [
    { starts_at: "2030-01-09T09:00:00Z", ends_at: "2030-01-09T09:50:00Z" },
    { starts_at: "2030-01-10T12:00:00Z", ends_at: "2030-01-10T12:50:00Z" },
  ],
  "Europe/Warsaw",
);

describe("the time step", () => {
  it("shows the week of free times, each a link keeping the choices", () => {
    const { stepIndex, panel } = view(chosen, { slots });
    expect(stepIndex).toBe(3);
    if (panel.kind !== "slots") throw new Error(panel.kind);
    expect(panel.picker.weekLabel).toBe("7–13 stycznia 2030");
    expect(panel.picker.days.map((day) => day.weekday)).toEqual([
      "Pon.",
      "Wt.",
      "Śr.",
      "Czw.",
      "Pt.",
      "Sob.",
      "Niedz.",
    ]);
    const wednesday = panel.picker.days[2]!;
    expect(wednesday).toMatchObject({
      label: "9 stycznia",
      fullLabel: "środa, 9 stycznia",
    });
    expect(wednesday.slots).toEqual([
      {
        time: "10:00",
        href: "/umow-wizyte?usluga=konsultacja&forma=online&specjalista=anna&tydzien=2030-01-07&termin=2030-01-09T10:00",
        selected: false,
      },
    ]);
    expect(panel.chosen).toBeNull();
  });

  it("cannot go back before this week, nor past the horizon", () => {
    const { panel } = view(chosen, { slots });
    if (panel.kind !== "slots") throw new Error(panel.kind);
    expect(panel.picker.previousHref).toBeNull();
    expect(panel.picker.nextHref).toContain("tydzien=2030-01-14");

    const last = view({ ...chosen, tydzien: "2030-01-28" }, { slots: [] });
    if (last.panel.kind !== "slots") throw new Error(last.panel.kind);
    // 2030-01-09 + 20 days = 2030-01-29: the week of the 28th is the last.
    expect(last.panel.picker.nextHref).toBeNull();
    expect(last.panel.picker.previousHref).toContain("tydzien=2030-01-21");
  });

  it("marks the chosen time and gives its instant for the hold", () => {
    const { panel, summary } = view(
      { ...chosen, termin: "2030-01-10T13:00" },
      { slots },
    );
    if (panel.kind !== "slots") throw new Error(panel.kind);
    expect(panel.chosen).toEqual({
      startsAt: "2030-01-10T12:00:00.000Z",
      label: "czwartek, 10 stycznia 2030, godz. 13:00",
    });
    expect(panel.picker.days[3]!.slots[0]!.selected).toBe(true);
    expect(summary[3]).toMatchObject({
      value: "czwartek, 10 stycznia 2030, godz. 13:00",
    });
  });

  it("leads from an empty week to the soonest free time (#203)", () => {
    const [nextFree] = toFreeSlots(
      [{ starts_at: "2030-01-24T09:00:00Z", ends_at: "2030-01-24T09:50:00Z" }],
      "Europe/Warsaw",
    );
    const { panel } = view(chosen, { slots: [], nextFree });
    if (panel.kind !== "slots") throw new Error(panel.kind);
    expect(panel.picker.nothingFree).toEqual({
      kind: "later",
      label: "czwartek, 24 stycznia",
      href: "/umow-wizyte?usluga=konsultacja&forma=online&specjalista=anna&tydzien=2030-01-21",
    });
  });

  it("offers Kontakt, naming the visit, when nothing is free (#203)", () => {
    const { panel } = view(chosen, { slots: [], nextFree: null });
    if (panel.kind !== "slots") throw new Error(panel.kind);
    expect(panel.picker.nothingFree).toEqual({
      kind: "none",
      days: 20,
      contactHref: `/kontakt?wiadomosc=${encodeURIComponent(
        "Dzień dobry, szukam terminu: Konsultacja, Imię anna, online.",
      )}#formularz`,
    });
  });

  it("says nothing more when the week has free times", () => {
    const { panel } = view(chosen, { slots, nextFree: null });
    if (panel.kind !== "slots") throw new Error(panel.kind);
    expect(panel.picker.nothingFree).toBeUndefined();
  });

  it("ignores a time that is not free", () => {
    const { panel } = view(
      { ...chosen, termin: "2030-01-10T15:00" },
      { slots },
    );
    if (panel.kind !== "slots") throw new Error(panel.kind);
    expect(panel.chosen).toBeNull();
  });
});

describe("bookingWeek", () => {
  it("shows the chosen week, the chosen time's, or this one; never a past one", () => {
    expect(bookingWeek({ ...empty }, "2030-01-09")).toBe("2030-01-07");
    expect(bookingWeek({ ...empty, tydzien: "2030-01-16" }, "2030-01-09")).toBe(
      "2030-01-14",
    );
    expect(
      bookingWeek({ ...empty, termin: "2030-01-22T10:00" }, "2030-01-09"),
    ).toBe("2030-01-21");
    expect(bookingWeek({ ...empty, tydzien: "2029-12-31" }, "2030-01-09")).toBe(
      "2030-01-07",
    );
  });
});
