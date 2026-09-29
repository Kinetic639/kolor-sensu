import {
  centerSettingsUpdateSchema,
  countryCodeSchema,
  currencyCodeSchema,
  localeSchema,
  locationCreateSchema,
  locationSlugSchema,
  locationUpdateSchema,
  roomUpdateSchema,
  serviceUpdateSchema,
  timezoneSchema,
} from "@repo/contracts";
import { describe, expect, it } from "vitest";
import { centerMappers } from "./center";

describe("center domain schemas", () => {
  it("accepts valid IANA timezones and rejects unknown ones", () => {
    expect(timezoneSchema.safeParse("Europe/Warsaw").success).toBe(true);
    expect(timezoneSchema.safeParse("Mars/Olympus_Mons").success).toBe(false);
  });

  it("accepts BCP 47 locales and rejects malformed ones", () => {
    expect(localeSchema.safeParse("pl-PL").success).toBe(true);
    expect(localeSchema.safeParse("pl").success).toBe(true);
    expect(localeSchema.safeParse("Polish").success).toBe(false);
  });

  it("accepts 3-letter currency codes and rejects others", () => {
    expect(currencyCodeSchema.safeParse("PLN").success).toBe(true);
    expect(currencyCodeSchema.safeParse("zl").success).toBe(false);
  });

  it("accepts 2-letter country codes and rejects others", () => {
    expect(countryCodeSchema.safeParse("PL").success).toBe(true);
    expect(countryCodeSchema.safeParse("POL").success).toBe(false);
  });

  it("accepts stable URL-safe location slugs and rejects unsafe values", () => {
    expect(locationSlugSchema.safeParse("kolor-sensu-main").success).toBe(true);
    expect(locationSlugSchema.safeParse("Kolor Sensu").success).toBe(false);
  });

  it("keeps center settings booking ranges within sane bounds", () => {
    expect(
      centerSettingsUpdateSchema.safeParse({
        maxBookingHorizonDays: 0,
      }).success,
    ).toBe(false);
    expect(
      centerSettingsUpdateSchema.safeParse({
        cancellationWindowHours: 48,
      }).success,
    ).toBe(true);
  });

  it("applies location defaults for optional fields", () => {
    const result = locationCreateSchema.parse({
      name: "Kolor Sensu",
      slug: "kolor-sensu-main",
    });
    expect(result.countryCode).toBe("PL");
    expect(result.active).toBe(true);
    expect(result.publiclyVisible).toBe(true);
    expect(result.sortOrder).toBe(0);
    expect(result.publicDescription).toBeNull();
    expect(result.amenities).toEqual([]);
    expect(result.accessibilityNotes).toBeNull();
  });

  it("limits a location's amenities to short, non-empty labels", () => {
    const base = { name: "Kolor Sensu", slug: "kolor-sensu-main" };
    expect(
      locationCreateSchema.safeParse({
        ...base,
        amenities: ["Winda", "Parking"],
      }).success,
    ).toBe(true);
    expect(
      locationCreateSchema.safeParse({ ...base, amenities: [""] }).success,
    ).toBe(false);
    expect(
      locationCreateSchema.safeParse({
        ...base,
        amenities: Array.from({ length: 31 }, (_, i) => `u${i}`),
      }).success,
    ).toBe(false);
  });
});

describe("center domain mapping", () => {
  it("maps center settings database naming into client-agnostic domain naming", () => {
    expect(
      centerMappers.centerSettings({
        id: 1,
        business_name: "Kolor Sensu",
        timezone: "Europe/Warsaw",
        default_locale: "pl-PL",
        default_currency: "PLN",
        booking_enabled: false,
        default_visit_buffer_minutes: 10,
        slot_step_minutes: 60,
        hold_minutes: 10,
        min_booking_lead_minutes: 60,
        max_booking_horizon_days: 60,
        cancellation_window_hours: 24,
        phone: null,
        email: null,
        created_at: "2026-09-19T00:00:00Z",
        updated_at: "2026-09-19T00:00:00Z",
      }),
    ).toMatchObject({
      businessName: "Kolor Sensu",
      timezone: "Europe/Warsaw",
      bookingEnabled: false,
      defaultVisitBufferMinutes: 10,
      slotStepMinutes: 60,
      holdMinutes: 10,
    });
  });

  it("maps public location database naming into client-agnostic domain naming", () => {
    expect(
      centerMappers.publicLocation({
        id: "location-id",
        name: "Kolor Sensu",
        slug: "kolor-sensu-main",
        address_line1: null,
        address_line2: null,
        postal_code: null,
        city: null,
        country_code: "PL",
        sort_order: 0,
        public_description: "Kamienica w centrum.",
        amenities: ["Winda"],
        accessibility_notes: "Wejście bez progów.",
      }),
    ).toMatchObject({
      id: "location-id",
      slug: "kolor-sensu-main",
      countryCode: "PL",
      publicDescription: "Kamienica w centrum.",
      amenities: ["Winda"],
      accessibilityNotes: "Wejście bez progów.",
    });
  });
});

describe("partial update schemas", () => {
  it("leave out what the caller did not send (no defaults)", () => {
    expect(locationUpdateSchema.parse({ active: false })).toEqual({
      active: false,
    });
    expect(roomUpdateSchema.parse({ name: "Gabinet" })).toEqual({
      name: "Gabinet",
    });
    expect(serviceUpdateSchema.parse({ active: false })).toEqual({
      active: false,
    });
  });

  it("still validate the fields that are sent", () => {
    expect(locationUpdateSchema.safeParse({ slug: "Zły Slug" }).success).toBe(
      false,
    );
    expect(roomUpdateSchema.safeParse({ capacity: 0 }).success).toBe(false);
  });
});
