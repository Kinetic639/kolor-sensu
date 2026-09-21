import { describe, expect, it } from "vitest";
import { workshopMappers } from "./workshops";

const baseRow = {
  id: "10000000-0000-4000-8000-000000000001",
  slug: "jak-radzic-sobie-ze-stresem",
  title: "Jak radzić sobie ze stresem",
  short_description: "Warsztat dla początkujących.",
  long_description: "Pełny opis warsztatu.",
  specialist_id: "20000000-0000-4000-8000-000000000001",
  location_id: "30000000-0000-4000-8000-000000000001",
  room_id: null,
  modality: "in_person" as const,
  starts_at: "2026-10-15T15:00:00+00:00",
  ends_at: "2026-10-15T17:00:00+00:00",
  price_minor: 15000,
  currency_code: "PLN",
  capacity: 12,
  registration_enabled: false,
  status: "published" as const,
  cover_image_path: null,
  created_at: "2026-01-01T00:00:00+00:00",
  updated_at: "2026-01-01T00:00:00+00:00",
};

describe("workshop mapper", () => {
  it("maps a raw row to the domain Workshop shape", () => {
    const result = workshopMappers.workshop(baseRow);
    expect(result).toEqual({
      id: baseRow.id,
      slug: baseRow.slug,
      title: baseRow.title,
      shortDescription: baseRow.short_description,
      longDescription: baseRow.long_description,
      specialistId: baseRow.specialist_id,
      locationId: baseRow.location_id,
      roomId: null,
      modality: "in_person",
      startsAt: baseRow.starts_at,
      endsAt: baseRow.ends_at,
      priceMinor: 15000,
      currencyCode: "PLN",
      capacity: 12,
      registrationEnabled: false,
      status: "published",
      coverImagePath: null,
      createdAt: baseRow.created_at,
      updatedAt: baseRow.updated_at,
    });
  });
});

describe("admin workshop summary mapper", () => {
  it("resolves specialist display name from the public profile when present", () => {
    const result = workshopMappers.adminWorkshopSummary({
      ...baseRow,
      specialists: {
        public_slug: "specialist-1",
        professional_title: "Psycholog",
        specialist_public_profiles: { display_name: "Anna Kowalska" },
      },
      locations: { name: "Siedziba Główna" },
      rooms: { name: "Gabinet grupowy" },
    });
    expect(result.specialistPublicSlug).toBe("specialist-1");
    expect(result.specialistDisplayName).toBe("Anna Kowalska");
    expect(result.locationName).toBe("Siedziba Główna");
    expect(result.roomName).toBe("Gabinet grupowy");
  });

  it("falls back to the public slug when there is no published display name", () => {
    const result = workshopMappers.adminWorkshopSummary({
      ...baseRow,
      specialists: {
        public_slug: "specialist-1",
        professional_title: null,
        specialist_public_profiles: null,
      },
      locations: null,
      rooms: null,
    });
    expect(result.specialistDisplayName).toBe("specialist-1");
    expect(result.locationName).toBeNull();
    expect(result.roomName).toBeNull();
  });
});

describe("public workshop summary mapper", () => {
  it("resolves specialist and location when both are currently public", () => {
    const result = workshopMappers.publicWorkshopSummary({
      ...baseRow,
      specialists: {
        public_slug: "specialist-1",
        professional_title: "Psycholog",
        specialist_public_profiles: { display_name: "Anna Kowalska" },
      },
      locations: {
        name: "Siedziba Główna",
        slug: "siedziba-glowna",
        address_line1: "ul. Kwiatowa 1",
        address_line2: null,
        postal_code: "00-001",
        city: "Warszawa",
      },
    });
    expect(result.specialist).toEqual({
      publicSlug: "specialist-1",
      displayName: "Anna Kowalska",
      professionalTitle: "Psycholog",
    });
    expect(result.location).toEqual({
      name: "Siedziba Główna",
      slug: "siedziba-glowna",
      addressLine1: "ul. Kwiatowa 1",
      addressLine2: null,
      postalCode: "00-001",
      city: "Warszawa",
    });
  });

  it("gracefully omits the specialist and location when neither is currently public", () => {
    const result = workshopMappers.publicWorkshopSummary({
      ...baseRow,
      specialists: null,
      locations: null,
    });
    expect(result.specialist).toBeNull();
    expect(result.location).toBeNull();
  });
});
