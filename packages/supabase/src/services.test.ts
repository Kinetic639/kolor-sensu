import {
  durationMinutesSchema,
  priceMinorSchema,
  resolveEffectiveDurationMinutes,
  serviceCategorySchema,
  serviceCreateSchema,
  serviceSlugSchema,
  specialistServiceUpsertSchema,
} from "@repo/contracts";
import { describe, expect, it, vi } from "vitest";
import {
  listPublicOffersForSpecialist,
  saveServiceArrangement,
  serviceMappers,
} from "./services";

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

  it("the time is the service's: a specialist's own is not taken", () => {
    expect(
      resolveEffectiveDurationMinutes(
        { defaultDurationMinutes: 50 },
        { durationMinutes: 45 },
      ),
    ).toBe(50);
    expect(
      specialistServiceUpsertSchema.safeParse({
        serviceId: "4f1e9a65-3b8e-4c3c-9d7f-2b8b1a3c4d5e",
        priceMinor: 20000,
        durationMinutes: 45,
      }).success,
    ).toBe(false);
  });

  it("a service's time after its visit: 0 to 120 minutes, 10 by default", () => {
    const service = {
      name: "Konsultacja",
      slug: "konsultacja",
      defaultDurationMinutes: 50,
    };
    expect(serviceCreateSchema.parse(service).afterMinutes).toBe(10);
    expect(
      serviceCreateSchema.safeParse({ ...service, afterMinutes: 0 }).success,
    ).toBe(true);
    expect(
      serviceCreateSchema.safeParse({ ...service, afterMinutes: 121 }).success,
    ).toBe(false);
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
        after_minutes: 10,
        active: true,
        publicly_visible: true,
        booking_enabled: false,
        sort_order: 0,
        catalog_id: "catalog-id",
        created_at: "2026-09-20T00:00:00Z",
        updated_at: "2026-09-20T00:00:00Z",
      }),
    ).toMatchObject({
      id: "service-id",
      slug: "psychoterapia-indywidualna",
      category: "psychotherapy",
      defaultDurationMinutes: 50,
      afterMinutes: 10,
    });
  });

  it("maps specialist_services database naming into client-agnostic domain naming", () => {
    expect(
      serviceMappers.specialistService({
        id: "offer-id",
        specialist_id: "specialist-id",
        service_id: "service-id",
        active: true,
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
        specialists: { public_slug: "anna-maria", professional_title: null },
        services: {
          name: "Psychoterapia indywidualna",
          slug: "psychoterapia-indywidualna",
          default_duration_minutes: 50,
        },
      }),
    ).toMatchObject({
      specialistPublicSlug: "anna-maria",
      serviceName: "Psychoterapia indywidualna",
      serviceSlug: "psychoterapia-indywidualna",
      effectiveDurationMinutes: 50,
    });
  });
});

describe("a specialist's public offers", () => {
  it("lists the active offers of one specialist, cheapest service first", async () => {
    const row = (name: string, price: number) => ({
      service_id: `${name}-id`,
      price_minor: price,
      currency_code: "PLN",
      duration_minutes: null,
      supports_in_person: true,
      supports_online: false,
      specialists: { public_slug: "anna", professional_title: null },
      services: { name, slug: name, default_duration_minutes: 50 },
    });
    const eq = vi.fn();
    const chain = {
      select: vi.fn(() => chain),
      eq: eq.mockImplementation(() => chain),
      then: (resolve: (value: unknown) => void) =>
        resolve({
          data: [row("terapia", 22000), row("konsultacja", 15000)],
          error: null,
        }),
    };
    const client = { from: vi.fn(() => chain) } as never;

    const offers = await listPublicOffersForSpecialist(client, "anna");

    expect(eq).toHaveBeenCalledWith("active", true);
    expect(eq).toHaveBeenCalledWith("specialists.public_slug", "anna");
    expect(offers.map((offer) => offer.serviceName)).toEqual([
      "konsultacja",
      "terapia",
    ]);
  });
});

describe("saveServiceArrangement", () => {
  const uuid = (n: number) => `00000000-0000-4000-8000-00000000000${n}`;

  it("makes new catalogues, renames, arranges at once and removes the rest", async () => {
    const calls: { table?: string; op: string; args: unknown }[] = [];
    const table = (name: string) => ({
      insert: (rows: unknown) => {
        calls.push({ table: name, op: "insert", args: rows });
        return {
          select: () =>
            Promise.resolve({ data: [{ id: uuid(9) }], error: null }),
        };
      },
      update: (patch: unknown) => ({
        eq: (_: string, id: string) => {
          calls.push({ table: name, op: "update", args: [id, patch] });
          return Promise.resolve({ error: null });
        },
      }),
      delete: () => ({
        in: (_: string, ids: string[]) => {
          calls.push({ table: name, op: "delete", args: ids });
          return Promise.resolve({ error: null });
        },
      }),
    });
    const rpc = vi.fn().mockResolvedValue({ error: null });
    const client = { from: table, rpc } as never;

    await saveServiceArrangement(
      client,
      {
        catalogs: [
          { key: "terapie", id: uuid(1), name: "Terapie" },
          { key: "nowy", id: null, name: "Dzieci" },
        ],
        order: [uuid(5), "terapie", "nowy"],
        services: [
          { id: uuid(5), catalogKey: null },
          { id: uuid(6), catalogKey: "terapie" },
          { id: uuid(7), catalogKey: "terapie" },
          { id: uuid(8), catalogKey: "nowy" },
        ],
      },
      [
        { id: uuid(1), name: "Terapia", sortOrder: 1 },
        { id: uuid(2), name: "Stary", sortOrder: 2 },
      ],
    );

    expect(calls).toEqual([
      { table: "service_catalogs", op: "insert", args: [{ name: "Dzieci" }] },
      {
        table: "service_catalogs",
        op: "update",
        args: [uuid(1), { name: "Terapie" }],
      },
      { table: "service_catalogs", op: "delete", args: [uuid(2)] },
    ]);
    expect(rpc).toHaveBeenCalledWith("arrange_services", {
      p_catalogs: [
        { id: uuid(1), sort_order: 2 },
        { id: uuid(9), sort_order: 3 },
      ],
      p_services: [
        { id: uuid(5), catalog_id: null, sort_order: 1 },
        { id: uuid(6), catalog_id: uuid(1), sort_order: 1 },
        { id: uuid(7), catalog_id: uuid(1), sort_order: 2 },
        { id: uuid(8), catalog_id: uuid(9), sort_order: 1 },
      ],
    });
  });
});
