import type { CenterPublicProfile, Location } from "@repo/contracts";
import { describe, expect, it } from "vitest";
import {
  bookingSettingsFormSchema,
  centerProfileFormSchema,
  locationFormSchema,
  toCenterProfileFormValues,
  toCenterProfileUpdate,
  toLocationFormValues,
  toLocationInput,
  toBookingSettingsFormValues,
  toBookingSettingsUpdate,
} from "./forms";

const profile: CenterPublicProfile = {
  displayName: "Kolor Sensu",
  shortDescription: null,
  logoPath: null,
  publicEmail: "kontakt@kolorsensu.pl",
  publicPhone: null,
  websiteUrl: null,
  instagramUrl: "https://instagram.com/kolorsensu",
  facebookUrl: null,
  published: true,
  createdAt: "2026-09-01T00:00:00Z",
  updatedAt: "2026-09-01T00:00:00Z",
};

describe("centre profile form", () => {
  it("fills empty inputs for missing values", () => {
    expect(toCenterProfileFormValues(profile)).toMatchObject({
      displayName: "Kolor Sensu",
      shortDescription: "",
      publicPhone: "",
      publicEmail: "kontakt@kolorsensu.pl",
      published: true,
    });
    expect(toCenterProfileFormValues(null)).toMatchObject({
      displayName: "Kolor Sensu",
      published: false,
    });
  });

  it("stores empty inputs as null and trims the rest", () => {
    const values = {
      ...toCenterProfileFormValues(profile),
      publicPhone: " +48 600 700 800 ",
      websiteUrl: "",
    };
    expect(toCenterProfileUpdate(values)).toMatchObject({
      publicPhone: "+48 600 700 800",
      websiteUrl: null,
      shortDescription: null,
      instagramUrl: "https://instagram.com/kolorsensu",
    });
  });

  it("rejects an invalid e-mail or link with a readable message", () => {
    const result = centerProfileFormSchema.safeParse({
      ...toCenterProfileFormValues(profile),
      displayName: "",
      publicEmail: "kontakt@",
      facebookUrl: "facebook.com/kolorsensu",
    });
    expect(
      Object.fromEntries(
        result.error!.issues.map((issue) => [issue.path[0], issue.message]),
      ),
    ).toEqual({
      displayName: "Podaj nazwę centrum.",
      publicEmail: "Podaj poprawny adres e-mail.",
      facebookUrl: "Podaj pełny adres, np. https://…",
    });
  });
});

describe("location form", () => {
  const location: Location = {
    id: "l",
    name: "Mokotów",
    slug: "mokotow",
    addressLine1: "ul. Puławska 1",
    addressLine2: null,
    postalCode: "02-515",
    city: "Warszawa",
    countryCode: "PL",
    active: true,
    publiclyVisible: true,
    sortOrder: 0,
    publicDescription: null,
    amenities: ["Winda", "Parking"],
    accessibilityNotes: "Wejście bez progów.",
    createdAt: "",
    updatedAt: "",
  };

  it("round-trips an existing location", () => {
    const values = toLocationFormValues(location);
    expect(values.addressLine2).toBe("");
    expect(values.publicDescription).toBe("");
    expect(values.amenities).toEqual(["Winda", "Parking"]);
    expect(toLocationInput(values)).toMatchObject({
      name: "Mokotów",
      slug: "mokotow",
      addressLine2: null,
      city: "Warszawa",
      publiclyVisible: true,
      publicDescription: null,
      amenities: ["Winda", "Parking"],
      accessibilityNotes: "Wejście bez progów.",
    });
  });

  it("requires a name and a URL-safe slug", () => {
    const result = locationFormSchema.safeParse({
      ...toLocationFormValues(null),
      name: "",
      slug: "Zły Slug",
    });
    expect(result.error!.issues.map((issue) => issue.path[0])).toEqual([
      "name",
      "slug",
    ]);
  });
});

describe("booking settings", () => {
  const settings = {
    businessName: "Kolor Sensu",
    timezone: "Europe/Warsaw",
    defaultLocale: "pl-PL",
    defaultCurrency: "PLN",
    bookingEnabled: true,
    defaultVisitBufferMinutes: 10,
    slotStepMinutes: 60,
    holdMinutes: 10,
    minBookingLeadMinutes: 120,
    maxBookingHorizonDays: 60,
    cancellationWindowHours: 48,
    rescheduleWindowHours: 48,
    maxSelfReschedules: 1,
    phone: null,
    email: null,
    createdAt: "2026-09-19T00:00:00Z",
    updatedAt: "2026-09-19T00:00:00Z",
  };

  it("shows the notice in hours and saves it in minutes", () => {
    const values = toBookingSettingsFormValues(settings);
    expect(values).toEqual({
      bookingEnabled: true,
      slotStepMinutes: "60",
      defaultVisitBufferMinutes: 10,
      minBookingLeadHours: 2,
      maxBookingHorizonDays: 60,
      holdMinutes: 10,
      cancellationWindowHours: 48,
      rescheduleWindowHours: 48,
      maxSelfReschedules: 1,
    });
    expect(toBookingSettingsUpdate(values)).toEqual({
      bookingEnabled: true,
      slotStepMinutes: 60,
      defaultVisitBufferMinutes: 10,
      minBookingLeadMinutes: 120,
      maxBookingHorizonDays: 60,
      holdMinutes: 10,
      cancellationWindowHours: 48,
      rescheduleWindowHours: 48,
      maxSelfReschedules: 1,
    });
  });

  it("keeps each setting within what the booking can work with", () => {
    const valid = toBookingSettingsFormValues(settings);
    const error = (change: object) =>
      bookingSettingsFormSchema.safeParse({ ...valid, ...change }).error
        ?.issues[0]?.message;
    expect(error({ slotStepMinutes: "45" })).toBe("Wybierz siatkę godzin.");
    expect(error({ holdMinutes: 60 })).toBe(
      "Blokada terminu trwa od 5 do 30 minut.",
    );
    expect(error({ maxBookingHorizonDays: 0 })).toBe("Podaj od 1 do 730 dni.");
    expect(error({ maxSelfReschedules: 6 })).toBe("Podaj od 0 do 5.");
    expect(error({ cancellationWindowHours: -1 })).toBe(
      "Podaj od 0 do 720 godzin.",
    );
  });
});
