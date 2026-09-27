import type { Service, SpecialistService } from "@repo/contracts";
import { describe, expect, it } from "vitest";
import {
  formatPriceInput,
  mapMyServicesViewModel,
  parsePriceToMinor,
} from "./view-model";

function service(id: string, name: string, minutes = 50): Service {
  return {
    id,
    name,
    slug: id,
    shortDescription: `${name} – opis`,
    description: null,
    category: "psychotherapy",
    defaultDurationMinutes: minutes,
    active: true,
    publiclyVisible: true,
    bookingEnabled: false,
    sortOrder: 0,
    createdAt: "2026-09-01T00:00:00Z",
    updatedAt: "2026-09-01T00:00:00Z",
  };
}

function offer(
  id: string,
  serviceId: string,
  overrides: Partial<SpecialistService> = {},
): SpecialistService {
  return {
    id,
    specialistId: "specialist",
    serviceId,
    active: true,
    acceptingNewClients: true,
    priceMinor: 20000,
    currencyCode: "PLN",
    durationMinutes: null,
    supportsInPerson: true,
    supportsOnline: false,
    createdAt: "2026-09-01T00:00:00Z",
    updatedAt: "2026-09-01T00:00:00Z",
    ...overrides,
  };
}

const services = [
  service("consult", "Konsultacja psychologiczna"),
  service("therapy", "Psychoterapia indywidualna"),
  service("couples", "Terapia par", 80),
];

describe("parsePriceToMinor", () => {
  it("reads złoty amounts with a comma or a dot", () => {
    expect(parsePriceToMinor("180")).toBe(18000);
    expect(parsePriceToMinor("180,5")).toBe(18050);
    expect(parsePriceToMinor(" 1 200.99 ")).toBe(120099);
  });

  it("returns null for anything that is not a price", () => {
    expect(parsePriceToMinor("")).toBeNull();
    expect(parsePriceToMinor("abc")).toBeNull();
    expect(parsePriceToMinor("-5")).toBeNull();
    expect(parsePriceToMinor("1,234")).toBeNull();
  });

  it("round-trips with formatPriceInput", () => {
    expect(formatPriceInput(18050)).toBe("180,50");
    expect(formatPriceInput(18000)).toBe("180");
    expect(parsePriceToMinor(formatPriceInput(12345))).toBe(12345);
  });
});

describe("mapMyServicesViewModel", () => {
  it("joins offers with the catalogue and resolves durations", () => {
    const model = mapMyServicesViewModel(
      [
        offer("o1", "couples", { priceMinor: 22000 }),
        offer("o2", "consult", { durationMinutes: 60, supportsOnline: true }),
      ],
      services,
    );

    expect(model.items.map((item) => item.serviceName)).toEqual([
      "Konsultacja psychologiczna",
      "Terapia par",
    ]);
    const consult = model.items[0]!;
    expect(consult.durationLabel).toBe("60 min");
    expect(consult.description).toBe("Konsultacja psychologiczna – opis");
    expect(consult.priceLabel).toMatch(/200,00\s?zł/);
    expect(model.items[1]!.durationLabel).toBe("80 min");
  });

  it("summarises active offers", () => {
    const model = mapMyServicesViewModel(
      [
        offer("o1", "consult", { priceMinor: 15000 }),
        offer("o2", "therapy", { priceMinor: 21000 }),
        offer("o3", "couples", { priceMinor: 99900, active: false }),
      ],
      services,
    );

    expect(model.activeCount).toBe(2);
    expect(model.totalCount).toBe(3);
    expect(model.averagePriceLabel).toMatch(/180,00\s?zł/);
    expect(model.averageDurationLabel).toBe("50 min");
  });

  it("has no average without active offers", () => {
    const model = mapMyServicesViewModel([], services);
    expect(model.averagePriceLabel).toBeNull();
    expect(model.addableServices).toHaveLength(3);
  });

  it("offers only catalogue services the specialist does not have yet", () => {
    const model = mapMyServicesViewModel([offer("o1", "therapy")], services);
    expect(model.addableServices.map((item) => item.id)).toEqual([
      "consult",
      "couples",
    ]);
  });

  it("keeps an offer whose service left the catalogue", () => {
    const model = mapMyServicesViewModel([offer("o1", "gone")], services);
    expect(model.items[0]!.serviceName).toBe("Usługa niedostępna w katalogu");
    expect(model.items[0]!.durationLabel).toBe("Nieustalony");
  });
});
