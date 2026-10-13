import { describe, expect, it } from "vitest";
import { SUPPORT_AREAS_MAX, supportAreasContentSchema } from "./cms";

const area = (overrides: Record<string, unknown> = {}) => ({
  id: "indywidualna",
  title: "Terapia indywidualna",
  lead: "Przestrzeń na Ciebie i Twoje potrzeby.",
  imagePath: null,
  imageAlt: "",
  link: null,
  ...overrides,
});

describe("support areas content", () => {
  it("accepts a list of areas, the image and link optional", () => {
    const parsed = supportAreasContentSchema.parse({
      areas: [
        area(),
        area({
          id: "pary",
          title: "Terapia dla par",
          imagePath: "support-areas/pary.webp",
          imageAlt: "Dwie osoby w gabinecie",
          link: { href: "/oferta#pary", label: "Zobacz ofertę" },
        }),
      ],
    });
    expect(parsed.areas).toHaveLength(2);
    expect(parsed.areas[1]?.link?.href).toBe("/oferta#pary");
  });

  it("fills the optional fields in when they are left out", () => {
    const parsed = supportAreasContentSchema.parse({
      areas: [{ id: "a", title: "Warsztaty", lead: "Rozwój w grupie." }],
    });
    expect(parsed.areas[0]).toMatchObject({
      imagePath: null,
      imageAlt: "",
      link: null,
    });
  });

  it("needs at least one area and at most the limit", () => {
    expect(supportAreasContentSchema.safeParse({ areas: [] }).success).toBe(
      false,
    );
    const many = Array.from({ length: SUPPORT_AREAS_MAX + 1 }, (_, index) =>
      area({ id: `a${index}` }),
    );
    expect(supportAreasContentSchema.safeParse({ areas: many }).success).toBe(
      false,
    );
  });

  it("needs a title and a lead", () => {
    expect(
      supportAreasContentSchema.safeParse({ areas: [area({ title: " " })] })
        .success,
    ).toBe(false);
    expect(
      supportAreasContentSchema.safeParse({ areas: [area({ lead: "" })] })
        .success,
    ).toBe(false);
  });

  it("links only within the site", () => {
    for (const href of [
      "https://example.com",
      "//example.com",
      "javascript:alert(1)",
      "oferta",
      "/ oferta",
    ]) {
      expect(
        supportAreasContentSchema.safeParse({
          areas: [area({ link: { href, label: "Zobacz" } })],
        }).success,
        href,
      ).toBe(false);
    }
    expect(
      supportAreasContentSchema.safeParse({
        areas: [area({ link: { href: "/umow-wizyte", label: "Umów" } })],
      }).success,
    ).toBe(true);
  });

  it("tells areas apart by id", () => {
    expect(
      supportAreasContentSchema.safeParse({ areas: [area(), area()] }).success,
    ).toBe(false);
  });

  it("rejects unknown fields instead of silently stripping them", () => {
    expect(
      supportAreasContentSchema.safeParse({
        areas: [area({ color: "red" })],
      }).success,
    ).toBe(false);
    expect(
      supportAreasContentSchema.safeParse({ areas: [area()], heading: "x" })
        .success,
    ).toBe(false);
  });
});
