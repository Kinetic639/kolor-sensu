import type { PublicLocation } from "@repo/contracts";
import { toFreeSlots } from "@repo/scheduling";
import type { BookableOffer } from "@repo/supabase";
import { describe, expect, it } from "vitest";
import type { BookingParams } from "./search-params";
import { changeBookingHref, loadBookingParams } from "./search-params";
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
      changeHref: "/umow-wizyte?usluga=konsultacja&krok=usluga",
    });
    expect(steps[0]!.href).toBe("/umow-wizyte?usluga=konsultacja&krok=usluga");
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

describe("one service, two prices (card 4)", () => {
  it("each specialist with their own price; the chosen one's in the summary", () => {
    const list = view({ usluga: "konsultacja", forma: "stacjonarnie" });
    if (list.panel.kind !== "choices") throw new Error(list.panel.kind);
    expect(list.panel.cards.map((card) => [card.title, card.facts[0]])).toEqual(
      [
        ["Imię anna", zl(250)],
        ["Imię jan", zl(200)],
      ],
    );
    expect(list.summary[0]!.detail).toBeUndefined();

    for (const [specjalista, price] of [
      ["anna", 250],
      ["jan", 200],
    ] as const) {
      const { summary } = view({
        usluga: "konsultacja",
        forma: "stacjonarnie",
        specjalista,
      });
      expect(summary[0]).toMatchObject({
        value: "Konsultacja",
        detail: `${zl(price)} · 50 min`,
      });
    }
  });
});

describe("a form the new specialist does not give (card 13)", () => {
  it("is dropped with a word on why and what to choose again", () => {
    const { stepIndex, notice, panel } = view({
      usluga: "konsultacja",
      forma: "online",
      specjalista: "jan",
    });
    expect(stepIndex).toBe(1);
    expect(notice).toBe(
      "Imię jan nie prowadzi usługi „Konsultacja” online. Wybierz, proszę, formę spotkania ponownie.",
    );
    if (panel.kind !== "choices") throw new Error(panel.kind);
    expect(panel.cards.map((card) => card.title)).toEqual(["Stacjonarnie"]);
  });

  it("names the service when no specialist is chosen", () => {
    expect(view({ usluga: "terapia", forma: "stacjonarnie" }).notice).toBe(
      "Usługa „Terapia par” nie odbywa się stacjonarnie, w gabinecie. Wybierz, proszę, formę spotkania ponownie.",
    );
  });

  it("says nothing while the choices fit", () => {
    expect(
      view({ usluga: "konsultacja", forma: "online" }).notice,
    ).toBeUndefined();
    expect(view({}).notice).toBeUndefined();
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

describe("a preselected visit and editing individual steps", () => {
  it("does not confirm an old hour when the new specialist has no availability at that time", () => {
    const result = view(
      {
        usluga: "konsultacja",
        forma: "stacjonarnie",
        specjalista: "jan",
        termin: "2030-01-10T13:00",
        dalej: "auto",
      },
      { slots: [] },
    );
    expect(result.summary[2]!.value).toBe("Imię jan");
    expect(result.summary[0]!.detail).toContain(zl(200));
    expect(result.panel.kind === "slots" && result.panel.chosen).toBeNull();
    expect(result.steps[3]!.completed).toBe(false);
    expect(result.notice).toContain("nie jest już dostępny");
  });

  it("asks for a compatible form when the new specialist does not support the retained form", () => {
    const result = view({
      usluga: "konsultacja",
      forma: "online",
      specjalista: "jan",
      termin: "2030-01-10T13:00",
      dalej: "auto",
    });
    expect(result.panel.kind).toBe("choices");
    expect(result.panel.title).toBe("Wybierz formę spotkania");
    if (result.panel.kind !== "choices")
      throw new Error("Missing compatible forms");
    expect(result.panel.cards.map((card) => card.key)).toEqual([
      "stacjonarnie",
    ]);
    expect(result.summary[2]!.value).toBe("Imię jan");
    expect(result.notice).toContain("nie prowadzi");
  });

  it("rejects a specialist/service combination that is no longer bookable", () => {
    const result = view({
      usluga: "terapia",
      forma: "online",
      specjalista: "jan",
      termin: "2030-01-10T13:00",
      dalej: "auto",
    });
    expect(result.panel.kind).toBe("choices");
    expect(result.panel.title).toBe("Wybierz specjalistę");
    expect(result.summary[2]!.value).toBeUndefined();
    if (result.panel.kind !== "choices")
      throw new Error("Missing compatible specialists");
    expect(result.panel.cards.map((card) => card.key)).toEqual(["anna"]);
  });

  it("shows the specialist and requested time while asking only for the missing form", () => {
    const input = {
      usluga: "konsultacja",
      specjalista: "anna",
      termin: "2030-01-10T13:00",
    };
    const first = view(input);
    expect(first.panel.kind).toBe("choices");
    expect(first.panel.title).toBe("Wybierz formę spotkania");
    expect(first.summary[2]!.value).toBe("Imię anna");
    expect(first.steps[2]!.completed).toBe(true);
    expect(first.steps[3]!.completed).toBe(true);
    expect(first.summary[3]!.value).toContain("13:00");
    if (first.panel.kind !== "choices") throw new Error("Missing form choices");
    const url = new URL(
      first.panel.cards.find((card) => card.key === "online")!.href,
      "http://booking.local",
    );
    expect(url.searchParams.get("termin")).toBe(input.termin);
    const complete = view(loadBookingParams(url.searchParams), { slots });
    expect(
      complete.panel.kind === "slots" && complete.panel.chosen?.startsAt,
    ).toBe("2030-01-10T12:00:00.000Z");
  });

  it("can edit every selection while retaining the others, including the requested time", () => {
    const complete = { ...empty, ...chosen, termin: "2030-01-10T13:00" };
    for (const key of ["usluga", "forma", "specjalista", "termin"] as const) {
      const url = new URL(
        changeBookingHref(complete, key),
        "http://booking.local",
      );
      const params = loadBookingParams(url.searchParams);
      const edited = view(params, { slots });
      expect(params.usluga).toBe(complete.usluga);
      expect(params.specjalista).toBe(complete.specjalista);
      expect(params.termin).toBe(key === "termin" ? null : complete.termin);
      expect(edited.panel.title).toBe(
        {
          usluga: "Wybierz usługę",
          forma: "Wybierz formę spotkania",
          specjalista: "Wybierz specjalistę",
          termin: "Wybierz termin",
        }[key],
      );
      if (edited.panel.kind === "choices") {
        const card = edited.panel.cards.find((card) => card.selected)!;
        expect(card).toBeDefined();
        const next = loadBookingParams(
          new URL(card.href, "http://booking.local").searchParams,
        );
        expect(next.krok).toBeNull();
        expect(next.termin).toBe(complete.termin);
      }
    }
  });

  it("rechecks the requested time after a change and never allows holding an unavailable hour", () => {
    const result = view({ ...chosen, termin: "2030-01-10T15:00" }, { slots });
    expect(result.panel.kind === "slots" && result.panel.chosen).toBeNull();
    expect(result.notice).toContain("nie jest już dostępny");
    expect(result.steps[3]!.completed).toBe(false);
  });
});

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

  it("says the times are Polish time (card 27)", () => {
    const { panel } = view(chosen, { slots });
    if (panel.kind !== "slots") throw new Error(panel.kind);
    expect(panel.lead).toContain("Godziny podajemy w czasie polskim.");
    // 09:00 UTC in January is 10:00 in Warsaw, whatever the visitor's zone.
    expect(panel.picker.days[2]!.slots[0]!.time).toBe("10:00");
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
