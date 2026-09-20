import {
  durationMinutesSchema,
  priceMinorSchema,
  resolveEffectiveDurationMinutes,
  serviceCategorySchema,
  serviceCreateSchema,
  serviceSlugSchema,
  specialistServiceUpsertSchema,
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
        specialists: { public_slug: "anna-maria", professional_title: null },
        services: { default_duration_minutes: 50 },
      }),
    ).toMatchObject({
      specialistPublicSlug: "anna-maria",
      effectiveDurationMinutes: 50,
    });
  });
});
