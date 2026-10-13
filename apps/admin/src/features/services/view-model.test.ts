import type { Service, SpecialistService } from "@repo/contracts";
import type { ServiceWeek } from "@repo/scheduling";
import { describe, expect, it } from "vitest";
import {
  formatOfferPrice,
  scheduleTime,
  siteTeam,
  toServiceRows,
} from "./view-model";

const service = (
  id: string,
  sortOrder: number,
  more: Partial<Service> = {},
): Service => ({
  id,
  name: `Usługa ${id}`,
  slug: `usluga-${id}`,
  shortDescription: null,
  description: null,
  category: "psychotherapy",
  defaultDurationMinutes: 50,
  afterMinutes: 10,
  active: true,
  publiclyVisible: true,
  bookingEnabled: true,
  requiresIntake: false,
  sortOrder,
  catalogId: null,
  createdAt: "2030-01-01T00:00:00Z",
  updatedAt: "2030-01-01T00:00:00Z",
  ...more,
});

const offer = (
  id: string,
  serviceId: string,
  specialistId: string,
  more: Partial<SpecialistService> = {},
): SpecialistService => ({
  id,
  specialistId,
  serviceId,
  active: true,
  priceMinor: 22000,
  currencyCode: "PLN",
  durationMinutes: null,
  supportsInPerson: true,
  supportsOnline: false,
  createdAt: "2030-01-01T00:00:00Z",
  updatedAt: "2030-01-01T00:00:00Z",
  ...more,
});

const person = (id: string, displayName: string) => ({
  id,
  displayName,
  initials: displayName
    .split(" ")
    .map((word) => word[0])
    .join(""),
  avatarUrl: null,
  color: null,
  professionalTitle: "Psycholog",
});

/** Intl puts a no-break space before the currency. */
const plain = (text: string) => text.replace(/\s/g, " ");

const people = [
  person("ms", "Michał Stępień"),
  person("ak", "Anna Kłobuchowska"),
];

const input = {
  week: "2030-09-30",
  today: "2030-10-03",
  webUrl: "https://kolorsensu.pl",
  people,
  catalogs: [],
};

describe("toServiceRows", () => {
  it("each service with its offers (by name), its own times and prices", () => {
    const [row] = toServiceRows({
      ...input,
      services: [service("a", 1)],
      offers: [
        offer("o1", "a", "ms"),
        offer("o2", "a", "ak", { durationMinutes: 60, priceMinor: 24050 }),
        offer("o3", "b", "ms"),
      ],
      weeks: new Map(),
    });
    expect(row).toMatchObject({
      id: "a",
      href: "/oferta/a",
      publicUrl: "https://kolorsensu.pl/oferta/usluga-a",
      categoryLabel: "Psychoterapia",
      durationMinutes: 50,
    });
    expect(
      row!.offers.map((one) => [
        one.specialist.name,
        one.durationMinutes,
        plain(one.price),
      ]),
    ).toEqual([
      ["Anna Kłobuchowska", 60, "240,50 zł"],
      ["Michał Stępień", 50, "220 zł"],
    ]);
    expect(row!.offers[1]!.specialist).toMatchObject({
      initials: "MS",
      href: "/specjalisci/ms",
    });
  });

  it("its place and watercolor in the site's offer: active and shown only", () => {
    const rows = toServiceRows({
      ...input,
      services: [
        service("a", 1),
        service("hidden", 2, { publiclyVisible: false }),
        service("b", 3),
        service("off", 4, { active: false }),
      ],
      offers: [],
      weeks: new Map(),
    });
    expect(rows.map((row) => [row.id, row.position, row.paint])).toEqual([
      ["a", 1, "sage-1"],
      ["hidden", null, "sage-1"],
      ["b", 2, "pink-1"],
      ["off", null, "sage-1"],
    ]);
  });

  it("in the offer's layout: a catalogue's services in its place, with it", () => {
    const rows = toServiceRows({
      ...input,
      catalogs: [{ id: "terapie", name: "Terapie", sortOrder: 2 }],
      services: [
        service("dzieci", 3),
        service("pary", 2, { catalogId: "terapie" }),
        service("konsultacja", 1),
        service("indywidualna", 1, { catalogId: "terapie" }),
      ],
      offers: [],
      weeks: new Map(),
    });
    expect(
      rows.map((row) => [row.id, row.order, row.catalog?.name ?? null]),
    ).toEqual([
      ["konsultacja", 1, null],
      ["indywidualna", 2, "Terapie"],
      ["pary", 3, "Terapie"],
      ["dzieci", 4, null],
    ]);
    // The site's places follow the same layout.
    expect(rows.map((row) => row.position)).toEqual([1, 2, 3, 4]);
  });

  it("the week read for it, else seven empty days with today marked", () => {
    const week: ServiceWeek = {
      days: [],
      visitCount: 4,
      upcoming: [],
    };
    const [busy, quiet] = toServiceRows({
      ...input,
      services: [service("a", 1), service("b", 2)],
      offers: [],
      weeks: new Map([["a", week]]),
    });
    expect(busy!.visitCount).toBe(4);
    expect(quiet!.visitCount).toBe(0);
    expect(quiet!.days.map((day) => day.count)).toEqual([0, 0, 0, 0, 0, 0, 0]);
    expect(quiet!.days[3]).toMatchObject({
      date: "2030-10-03",
      weekday: "Czw",
      isToday: true,
    });
  });
});

describe("formatOfferPrice", () => {
  it("whole złoty without grosze, else with", () => {
    expect(
      plain(formatOfferPrice({ priceMinor: 22000, currencyCode: "PLN" })),
    ).toBe("220 zł");
    expect(
      plain(formatOfferPrice({ priceMinor: 24050, currencyCode: "PLN" })),
    ).toBe("240,50 zł");
  });
});

describe("siteTeam", () => {
  it("the active offers as the site's page lists them", () => {
    const [row] = toServiceRows({
      ...input,
      services: [service("a", 1)],
      offers: [
        offer("o1", "a", "ms", { supportsOnline: true }),
        offer("o2", "a", "ak", {
          durationMinutes: 60,
        }),
        offer("o3", "a", "ak", { active: false }),
      ],
      weeks: new Map(),
    });
    expect(
      siteTeam(row!.offers).map((one) => [one.name, plain(one.meta)]),
    ).toEqual([
      ["Anna Kłobuchowska", "220 zł · 60 min · w gabinecie"],
      ["Michał Stępień", "220 zł · 50 min · w gabinecie lub online"],
    ]);
  });
});

describe("scheduleTime", () => {
  it("the visit and the time after it: the service's time in the schedule", () => {
    expect(scheduleTime(50, 10, 60)).toEqual({
      total: 60,
      label: "60 min w grafiku",
      warning: null,
    });
  });

  it("more than the grid's step: the next visit waits for the next mark", () => {
    expect(scheduleTime(60, 10, 60)).toEqual({
      total: 70,
      label: "70 min w grafiku",
      warning:
        "Terminy są co 60 min: przy 70 min następna wizyta zacznie się dopiero po 120 min. Ustaw łącznie 60 lub 120 min.",
    });
  });

  it("less than a step: the rest of it stays free, not a problem", () => {
    expect(scheduleTime(30, 0, 60).warning).toBeNull();
  });
});
