import { describe, expect, it } from "vitest";
import {
  combineDateTimeToIso,
  formatWorkshopDate,
  formatWorkshopTimeRange,
  isWorkshopUpcoming,
  splitIsoToDateTime,
  workshopCreateSchema,
  workshopDurationMinutes,
  workshopSlugSchema,
} from "./workshops";

const baseInput = {
  title: "Jak radzić sobie ze stresem",
  slug: "jak-radzic-sobie-ze-stresem",
  specialistId: "11111111-1111-4111-8111-111111111111",
  locationId: "22222222-2222-4222-8222-222222222222",
  roomId: null,
  modality: "in_person" as const,
  startsAt: "2026-10-15T15:00:00Z",
  endsAt: "2026-10-15T17:00:00Z",
  priceMinor: 15000,
  capacity: 12,
};

describe("workshopCreateSchema", () => {
  it("accepts a valid in-person workshop", () => {
    const result = workshopCreateSchema.parse(baseInput);
    expect(result.title).toBe(baseInput.title);
    expect(result.currencyCode).toBe("PLN");
    expect(result.registrationEnabled).toBe(false);
  });

  it("rejects an in-person workshop with no location", () => {
    expect(() =>
      workshopCreateSchema.parse({ ...baseInput, locationId: null }),
    ).toThrow();
  });

  it("accepts an online workshop with no location or room", () => {
    const result = workshopCreateSchema.parse({
      ...baseInput,
      modality: "online",
      locationId: null,
      roomId: null,
    });
    expect(result.modality).toBe("online");
  });

  it("rejects an online workshop with a location", () => {
    expect(() =>
      workshopCreateSchema.parse({ ...baseInput, modality: "online" }),
    ).toThrow();
  });

  it("rejects an online workshop with a room", () => {
    expect(() =>
      workshopCreateSchema.parse({
        ...baseInput,
        modality: "online",
        locationId: null,
        roomId: "33333333-3333-4333-8333-333333333333",
      }),
    ).toThrow();
  });

  it("rejects starts_at after ends_at", () => {
    expect(() =>
      workshopCreateSchema.parse({
        ...baseInput,
        startsAt: "2026-10-15T18:00:00Z",
        endsAt: "2026-10-15T17:00:00Z",
      }),
    ).toThrow();
  });

  it("rejects capacity out of range", () => {
    expect(() =>
      workshopCreateSchema.parse({ ...baseInput, capacity: 0 }),
    ).toThrow();
    expect(() =>
      workshopCreateSchema.parse({ ...baseInput, capacity: 501 }),
    ).toThrow();
  });

  it("rejects negative price", () => {
    expect(() =>
      workshopCreateSchema.parse({ ...baseInput, priceMinor: -1 }),
    ).toThrow();
  });

  it("allows a free workshop (price 0)", () => {
    const result = workshopCreateSchema.parse({ ...baseInput, priceMinor: 0 });
    expect(result.priceMinor).toBe(0);
  });
});

describe("workshopSlugSchema", () => {
  it("accepts a url-safe slug", () => {
    expect(workshopSlugSchema.parse("jak-radzic-sobie-ze-stresem")).toBe(
      "jak-radzic-sobie-ze-stresem",
    );
  });

  it("rejects uppercase or spaces", () => {
    expect(() => workshopSlugSchema.parse("Jak Radzic")).toThrow();
  });
});

describe("workshopDurationMinutes", () => {
  it("computes whole minutes between start and end", () => {
    expect(
      workshopDurationMinutes("2026-10-15T15:00:00Z", "2026-10-15T17:00:00Z"),
    ).toBe(120);
  });
});

describe("isWorkshopUpcoming", () => {
  const now = new Date("2026-10-01T00:00:00Z");

  it("is true for a published future workshop", () => {
    expect(
      isWorkshopUpcoming(
        { status: "published", startsAt: "2026-10-15T15:00:00Z" },
        now,
      ),
    ).toBe(true);
  });

  it("is false for a draft workshop even if in the future", () => {
    expect(
      isWorkshopUpcoming(
        { status: "draft", startsAt: "2026-10-15T15:00:00Z" },
        now,
      ),
    ).toBe(false);
  });

  it("is false for a published workshop already in the past", () => {
    expect(
      isWorkshopUpcoming(
        { status: "published", startsAt: "2026-09-01T15:00:00Z" },
        now,
      ),
    ).toBe(false);
  });

  it("is false for a cancelled future workshop", () => {
    expect(
      isWorkshopUpcoming(
        { status: "cancelled", startsAt: "2026-10-15T15:00:00Z" },
        now,
      ),
    ).toBe(false);
  });
});

describe("combineDateTimeToIso / splitIsoToDateTime", () => {
  it("combines a wall-clock date and time (CEST, UTC+2) into a UTC instant", () => {
    const iso = combineDateTimeToIso("2026-10-15", "17:00");
    expect(new Date(iso).toISOString()).toBe("2026-10-15T15:00:00.000Z");
  });

  it("combines a wall-clock date and time in winter (CET, UTC+1) into a UTC instant", () => {
    const iso = combineDateTimeToIso("2026-01-15", "17:00");
    expect(new Date(iso).toISOString()).toBe("2026-01-15T16:00:00.000Z");
  });

  it("round-trips through splitIsoToDateTime", () => {
    const iso = combineDateTimeToIso("2026-10-15", "17:00");
    expect(splitIsoToDateTime(iso)).toEqual({
      date: "2026-10-15",
      time: "17:00",
    });
  });
});

describe("date/time formatting", () => {
  it("formats a date in Polish, in the configured timezone", () => {
    expect(formatWorkshopDate("2026-10-15T15:00:00Z")).toBe(
      "15 października 2026",
    );
  });

  it("formats a time range in Polish, in the configured timezone", () => {
    expect(
      formatWorkshopTimeRange("2026-10-15T15:00:00Z", "2026-10-15T17:00:00Z"),
    ).toBe("17:00–19:00");
  });
});
