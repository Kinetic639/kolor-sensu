import type { PublicLocation, PublicSpecialistOffer } from "@repo/contracts";
import { describe, expect, it } from "vitest";
import type { BookingParams } from "./search-params";
import { resolveBookingSelection, type BookingCatalog } from "./selection";

const service = (slug: string) => ({
  id: `id-${slug}`,
  name: slug,
  slug,
  shortDescription: null,
  description: null,
  category: "consultation" as const,
  defaultDurationMinutes: 50,
});

const offer = (
  serviceSlug: string,
  specialist: string,
  overrides: Partial<PublicSpecialistOffer> = {},
): PublicSpecialistOffer => ({
  serviceId: `id-${serviceSlug}`,
  serviceName: serviceSlug,
  serviceSlug,
  specialistPublicSlug: specialist,
  specialistProfessionalTitle: null,
  priceMinor: 20000,
  currencyCode: "PLN",
  effectiveDurationMinutes: 50,
  supportsInPerson: true,
  supportsOnline: false,
  ...overrides,
});

const location = (slug: string): PublicLocation => ({
  id: `id-${slug}`,
  name: slug,
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

const catalog: BookingCatalog = {
  services: [service("konsultacja"), service("terapia-par")],
  offers: [
    offer("konsultacja", "anna", { supportsOnline: true }),
    offer("konsultacja", "jan"),
    offer("terapia-par", "jan"),
  ],
  locations: [location("centrum")],
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

describe("resolveBookingSelection", () => {
  it("starts at the service step", () => {
    const selection = resolveBookingSelection(empty, catalog);
    expect(selection.step).toBe("usluga");
    expect(selection.services.map((one) => one.slug)).toEqual([
      "konsultacja",
      "terapia-par",
    ]);
  });

  it("offers only the services of a specialist chosen on their profile", () => {
    const selection = resolveBookingSelection(
      { ...empty, specjalista: "anna" },
      catalog,
    );
    expect(selection.specialist).toBe("anna");
    expect(selection.services.map((one) => one.slug)).toEqual(["konsultacja"]);
  });

  it("offers only the modes some specialist supports for the service", () => {
    const selection = resolveBookingSelection(
      { ...empty, usluga: "terapia-par" },
      catalog,
    );
    expect(selection.step).toBe("forma");
    expect(selection.modes).toEqual(["stacjonarnie"]);
  });

  it("picks the only location and moves on to the specialist", () => {
    const selection = resolveBookingSelection(
      { ...empty, usluga: "konsultacja", forma: "stacjonarnie" },
      catalog,
    );
    expect(selection.location?.slug).toBe("centrum");
    expect(selection.step).toBe("specjalista");
    expect(selection.offers.map((one) => one.specialistPublicSlug)).toEqual([
      "anna",
      "jan",
    ]);
  });

  it("asks for a location when there are several", () => {
    const selection = resolveBookingSelection(
      { ...empty, usluga: "konsultacja", forma: "stacjonarnie" },
      { ...catalog, locations: [location("centrum"), location("praga")] },
    );
    expect(selection.location).toBeNull();
    expect(selection.step).toBe("lokalizacja");
  });

  it("leaves out specialists who do not take new clients", () => {
    const selection = resolveBookingSelection(
      { ...empty, usluga: "terapia-par", forma: "stacjonarnie" },
      catalog,
    );
    expect(selection.offers.map((one) => one.specialistPublicSlug)).toEqual([
      "jan",
    ]);
  });

  it("reaches the time step with a consistent choice", () => {
    const selection = resolveBookingSelection(
      {
        ...empty,
        usluga: "konsultacja",
        forma: "online",
        specjalista: "anna",
      },
      catalog,
    );
    expect(selection.step).toBe("termin");
    expect(selection.offer?.priceMinor).toBe(20000);
    expect(selection.location).toBeNull();
  });

  it("keeps the chosen specialist and drops a mode they do not offer", () => {
    const selection = resolveBookingSelection(
      {
        ...empty,
        usluga: "konsultacja",
        forma: "online",
        specjalista: "jan",
      },
      catalog,
    );
    // Jan does not work online: back to choosing the mode, with Jan's modes.
    expect(selection.specialist).toBe("jan");
    expect(selection.mode).toBeNull();
    expect(selection.step).toBe("forma");
    expect(selection.modes).toEqual(["stacjonarnie"]);
  });

  it("drops a specialist who does not offer the chosen service", () => {
    const selection = resolveBookingSelection(
      { ...empty, usluga: "terapia-par", specjalista: "anna" },
      catalog,
    );
    expect(selection.service?.slug).toBe("terapia-par");
    expect(selection.specialist).toBeNull();
    expect(selection.step).toBe("forma");
  });

  it("drops a form the specialist does not give, and says which (card 13)", () => {
    // Jan sees clients only in person.
    const selection = resolveBookingSelection(
      { ...empty, usluga: "konsultacja", forma: "online", specjalista: "jan" },
      catalog,
    );
    expect(selection.specialist).toBe("jan");
    expect(selection.mode).toBeNull();
    expect(selection.droppedMode).toBe("online");
    expect(selection.modes).toEqual(["stacjonarnie"]);
    expect(selection.step).toBe("forma");
  });

  it("drops nothing when the form fits, or no service is chosen yet", () => {
    for (const params of [
      {
        ...empty,
        usluga: "konsultacja",
        forma: "online" as const,
        specjalista: "anna",
      },
      { ...empty, forma: "online" as const, specjalista: "jan" },
    ]) {
      expect(resolveBookingSelection(params, catalog).droppedMode).toBeNull();
    }
  });

  it("ignores unknown services and specialists", () => {
    const selection = resolveBookingSelection(
      { ...empty, usluga: "nie-ma", specjalista: "nikt" },
      catalog,
    );
    expect(selection.service).toBeNull();
    expect(selection.specialist).toBeNull();
    expect(selection.step).toBe("usluga");
  });
});
