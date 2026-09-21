import {
  buildPublicOfferSummary,
  durationMinutesSchema,
  formatPriceMinor,
  formatSpecialistCountLabel,
  priceMinorSchema,
  resolveEffectiveDurationMinutes,
  serviceCategorySchema,
  serviceCreateSchema,
  serviceSlugSchema,
  specialistServiceUpsertSchema,
  type PublicService,
  type PublicSpecialistOffer,
} from "@repo/contracts";
import { describe, expect, it } from "vitest";
import { serviceMappers } from "./services";

describe("service domain schemas", () => {
  it("accepts known categories and rejects unknown ones", () => {
    expect(serviceCategorySchema.safeParse("psychotherapy").success).toBe(true);
    expect(serviceCategorySchema.safeParse("massage").success).toBe(false);
  });

  it("accepts stable URL-safe service slugs and rejects unsafe values", () => {
    expect(
      serviceSlugSchema.safeParse("psychoterapia-indywidualna").success,
    ).toBe(true);
    expect(
      serviceSlugSchema.safeParse("Psychoterapia Indywidualna").success,
    ).toBe(false);
  });

  it("keeps duration within the sane 15-300 minute range", () => {
    expect(durationMinutesSchema.safeParse(50).success).toBe(true);
    expect(durationMinutesSchema.safeParse(10).success).toBe(false);
    expect(durationMinutesSchema.safeParse(301).success).toBe(false);
  });

  it("keeps price as a non-negative integer minor-unit amount", () => {
    expect(priceMinorSchema.safeParse(25000).success).toBe(true);
    expect(priceMinorSchema.safeParse(-1).success).toBe(false);
    expect(priceMinorSchema.safeParse(25.5).success).toBe(false);
  });

  it("applies service defaults for optional fields", () => {
    const result = serviceCreateSchema.parse({
      name: "Psychoterapia indywidualna",
      slug: "psychoterapia-indywidualna",
      defaultDurationMinutes: 50,
    });
    expect(result.category).toBe("other");
    expect(result.active).toBe(true);
    expect(result.bookingEnabled).toBe(false);
  });

  it("requires at least one modality for an active offering", () => {
    expect(
      specialistServiceUpsertSchema.safeParse({
        serviceId: "20000000-0000-4000-8000-000000000001",
        priceMinor: 25000,
        active: true,
        supportsInPerson: false,
        supportsOnline: false,
      }).success,
    ).toBe(false);

    expect(
      specialistServiceUpsertSchema.safeParse({
        serviceId: "20000000-0000-4000-8000-000000000001",
        priceMinor: 25000,
        active: false,
        supportsInPerson: false,
        supportsOnline: false,
      }).success,
    ).toBe(true);
  });
});

describe("effective duration resolution", () => {
  it("falls back to the service default when no override is set", () => {
    expect(
      resolveEffectiveDurationMinutes(
        { defaultDurationMinutes: 50 },
        { durationMinutes: null },
      ),
    ).toBe(50);
  });

  it("prefers the specialist's own duration override when present", () => {
    expect(
      resolveEffectiveDurationMinutes(
        { defaultDurationMinutes: 50 },
        { durationMinutes: 45 },
      ),
    ).toBe(45);
  });
});

describe("public offer summary derivation", () => {
  const service: PublicService = {
    id: "service-1",
    name: "Terapia dla par",
    slug: "terapia-dla-par",
    shortDescription: "Pomoc w związku.",
    description: null,
    category: "couples_therapy",
    defaultDurationMinutes: 50,
  };

  function offer(
    overrides: Partial<PublicSpecialistOffer>,
  ): PublicSpecialistOffer {
    return {
      serviceId: "service-1",
      serviceSlug: "terapia-dla-par",
      serviceName: "Terapia dla par",
      specialistPublicSlug: "anna",
      specialistDisplayName: "Anna Kowalska",
      specialistProfilePhotoUrl: null,
      specialistProfessionalTitle: null,
      priceMinor: 20000,
      currencyCode: "PLN",
      effectiveDurationMinutes: 50,
      supportsInPerson: true,
      supportsOnline: false,
      acceptingNewClients: true,
      ...overrides,
    };
  }

  it("invents nothing when a public service has zero public offers", () => {
    expect(buildPublicOfferSummary(service, [])).toMatchObject({
      specialistCount: 0,
      supportsOnline: false,
      supportsInPerson: false,
      minPriceMinor: null,
      minPriceCurrencyCode: null,
    });
  });

  it("ignores offers that belong to a different service", () => {
    const otherServiceOffer = offer({ serviceId: "service-2", priceMinor: 1 });
    expect(buildPublicOfferSummary(service, [otherServiceOffer])).toMatchObject(
      { specialistCount: 0, minPriceMinor: null },
    );
  });

  it("derives the minimum price as a plain integer, never floating point math", () => {
    const summary = buildPublicOfferSummary(service, [
      offer({ specialistPublicSlug: "anna", priceMinor: 25000 }),
      offer({ specialistPublicSlug: "bartek", priceMinor: 18000 }),
      offer({ specialistPublicSlug: "celina", priceMinor: 30000 }),
    ]);
    expect(summary.minPriceMinor).toBe(18000);
    expect(summary.minPriceCurrencyCode).toBe("PLN");
    expect(Number.isInteger(summary.minPriceMinor)).toBe(true);
  });

  it("aggregates modalities as true if any public offer supports them", () => {
    const summary = buildPublicOfferSummary(service, [
      offer({
        specialistPublicSlug: "anna",
        supportsInPerson: true,
        supportsOnline: false,
      }),
      offer({
        specialistPublicSlug: "bartek",
        supportsInPerson: false,
        supportsOnline: true,
      }),
    ]);
    expect(summary.supportsInPerson).toBe(true);
    expect(summary.supportsOnline).toBe(true);
  });

  it("counts each offer as one specialist, matching the DB's one-offer-per-specialist-per-service constraint", () => {
    const summary = buildPublicOfferSummary(service, [
      offer({ specialistPublicSlug: "anna" }),
      offer({ specialistPublicSlug: "bartek" }),
    ]);
    expect(summary.specialistCount).toBe(2);
  });
});

describe("public offer presentation formatting", () => {
  it("formats an integer minor-unit price as a localized currency string", () => {
    expect(formatPriceMinor(18000, "PLN")).toContain("180");
    expect(formatPriceMinor(18000, "PLN")).toMatch(/zł/);
  });

  it("uses the singular Polish form only for exactly one specialist", () => {
    expect(formatSpecialistCountLabel(0)).toBe("0 specjalistów");
    expect(formatSpecialistCountLabel(1)).toBe("1 specjalista");
    expect(formatSpecialistCountLabel(2)).toBe("2 specjalistów");
    expect(formatSpecialistCountLabel(5)).toBe("5 specjalistów");
  });
});

describe("service domain mapping", () => {
  it("maps service database naming into client-agnostic domain naming", () => {
    expect(
      serviceMappers.service({
        id: "service-id",
        name: "Psychoterapia indywidualna",
        slug: "psychoterapia-indywidualna",
        short_description: null,
        description: null,
        category: "psychotherapy",
        default_duration_minutes: 50,
        active: true,
        publicly_visible: true,
        booking_enabled: false,
        sort_order: 0,
        created_at: "2026-09-20T00:00:00Z",
        updated_at: "2026-09-20T00:00:00Z",
      }),
    ).toMatchObject({
      id: "service-id",
      slug: "psychoterapia-indywidualna",
      category: "psychotherapy",
      defaultDurationMinutes: 50,
    });
  });

  it("maps specialist_services database naming into client-agnostic domain naming", () => {
    expect(
      serviceMappers.specialistService({
        id: "offer-id",
        specialist_id: "specialist-id",
        service_id: "service-id",
        active: true,
        accepting_new_clients: true,
        price_minor: 25000,
        currency_code: "PLN",
        duration_minutes: null,
        supports_in_person: true,
        supports_online: true,
        created_at: "2026-09-20T00:00:00Z",
        updated_at: "2026-09-20T00:00:00Z",
      }),
    ).toMatchObject({
      id: "offer-id",
      priceMinor: 25000,
      durationMinutes: null,
    });
  });

  it("maps a public specialist offer with the effective duration resolved", () => {
    expect(
      serviceMappers.publicSpecialistOffer({
        service_id: "service-id",
        price_minor: 25000,
        currency_code: "PLN",
        duration_minutes: null,
        supports_in_person: true,
        supports_online: true,
        accepting_new_clients: true,
        specialists: {
          public_slug: "anna-maria",
          professional_title: null,
          specialist_public_profiles: {
            display_name: "Anna Maria",
            profile_photo_url: null,
          },
        },
        services: {
          slug: "psychoterapia-indywidualna",
          name: "Psychoterapia indywidualna",
          default_duration_minutes: 50,
        },
      }),
    ).toMatchObject({
      serviceSlug: "psychoterapia-indywidualna",
      serviceName: "Psychoterapia indywidualna",
      specialistPublicSlug: "anna-maria",
      specialistDisplayName: "Anna Maria",
      effectiveDurationMinutes: 50,
    });
  });
});
