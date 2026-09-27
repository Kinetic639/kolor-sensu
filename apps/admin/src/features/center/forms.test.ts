import type { CenterPublicProfile, Location } from "@repo/contracts";
import { describe, expect, it } from "vitest";
import {
  centerProfileFormSchema,
  locationFormSchema,
  slugify,
  toCenterProfileFormValues,
  toCenterProfileUpdate,
  toLocationFormValues,
  toLocationInput,
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

describe("slugify", () => {
  it("makes URL-safe slugs from Polish names", () => {
    expect(slugify("Gabinet Mokotów – ul. Żółkiewskiego")).toBe(
      "gabinet-mokotow-ul-zolkiewskiego",
    );
    expect(slugify("  Łódź  Centrum ")).toBe("lodz-centrum");
  });
});

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
    createdAt: "",
    updatedAt: "",
  };

  it("round-trips an existing location", () => {
    const values = toLocationFormValues(location);
    expect(values.addressLine2).toBe("");
    expect(toLocationInput(values)).toMatchObject({
      name: "Mokotów",
      slug: "mokotow",
      addressLine2: null,
      city: "Warszawa",
      publiclyVisible: true,
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
