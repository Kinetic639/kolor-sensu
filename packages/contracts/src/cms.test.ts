import { describe, expect, it } from "vitest";
import {
  defaultFirstSteps,
  defaultHomeHeaders,
  HOME_HEADER_SECTIONS,
  homeHeadersContentSchema,
  defaultHomeSections,
  firstStepsContentSchema,
  homeSectionsContentSchema,
  SUPPORT_AREAS_MAX,
  supportAreasContentSchema,
} from "./cms";
import { headerTitleText } from "./section-header";

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

describe("home sections", () => {
  const spotlight = {
    visible: true,
    specialistId: "6f1c2b9a-3c41-4e2b-9a55-0d3f2a7b8c10",
    imagePath: "spotlight/a.webp",
    imageAlt: "Anna w gabinecie",
  };

  it("switches the team and the spotlight, the spotlight with its own photo", () => {
    expect(
      homeSectionsContentSchema.parse({ showSpecialists: false, spotlight }),
    ).toEqual({ showSpecialists: false, spotlight });
  });

  it("starts with the team shown and the spotlight hidden", () => {
    expect(homeSectionsContentSchema.parse(defaultHomeSections)).toEqual(
      defaultHomeSections,
    );
    expect(defaultHomeSections.showSpecialists).toBe(true);
    expect(defaultHomeSections.spotlight.visible).toBe(false);
  });

  it("shows the spotlight only with a specialist chosen", () => {
    const result = homeSectionsContentSchema.safeParse({
      showSpecialists: true,
      spotlight: { ...spotlight, specialistId: null },
    });
    expect(result.success).toBe(false);
    expect(
      homeSectionsContentSchema.safeParse({
        showSpecialists: true,
        spotlight: { ...spotlight, visible: false, specialistId: null },
      }).success,
    ).toBe(true);
  });

  it("keeps the specialist an id, and the header out (it is among the headers)", () => {
    for (const change of [
      { specialistId: "anna" },
      { heading: "Z kim porozmawiasz" },
    ]) {
      expect(
        homeSectionsContentSchema.safeParse({
          showSpecialists: true,
          spotlight: { ...spotlight, ...change },
        }).success,
        JSON.stringify(change),
      ).toBe(false);
    }
  });

  it("rejects unknown fields", () => {
    expect(
      homeSectionsContentSchema.safeParse({
        showSpecialists: true,
        spotlight,
        showFaq: true,
      }).success,
    ).toBe(false);
  });
});

describe("first steps", () => {
  it("starts shown, with four steps and the usual words", () => {
    expect(firstStepsContentSchema.parse(defaultFirstSteps)).toEqual(
      defaultFirstSteps,
    );
    expect(defaultFirstSteps.visible).toBe(true);
    expect(defaultFirstSteps.steps.map((step) => step.title)).toEqual([
      "Kontakt",
      "Pierwsze spotkanie",
      "Wspólny plan",
      "Rozpoczęcie pracy",
    ]);
  });

  it("has exactly four steps, each with a title and a sentence", () => {
    const three = {
      ...defaultFirstSteps,
      steps: defaultFirstSteps.steps.slice(0, 3),
    };
    expect(firstStepsContentSchema.safeParse(three).success).toBe(false);
    const empty = {
      ...defaultFirstSteps,
      steps: defaultFirstSteps.steps.map((step, index) =>
        index === 1 ? { ...step, title: " " } : step,
      ),
    };
    expect(firstStepsContentSchema.safeParse(empty).success).toBe(false);
  });

  it("rejects unknown fields, the header among them (it is among the headers)", () => {
    expect(
      firstStepsContentSchema.safeParse({
        ...defaultFirstSteps,
        heading: "Pierwszy krok",
      }).success,
    ).toBe(false);
    expect(
      firstStepsContentSchema.safeParse({ ...defaultFirstSteps, color: "red" })
        .success,
    ).toBe(false);
  });
});

describe("home headers", () => {
  it("adds the workshop header when reading older published headers", () => {
    const { workshops: _workshops, ...older } = defaultHomeHeaders;
    expect(homeHeadersContentSchema.parse(older).workshops).toEqual(
      defaultHomeHeaders.workshops,
    );
  });
  it("holds one header per homepage section, in the page's order", () => {
    expect(Object.keys(defaultHomeHeaders)).toEqual(
      HOME_HEADER_SECTIONS.map((section) => section.key),
    );
    expect(homeHeadersContentSchema.parse(defaultHomeHeaders)).toEqual(
      defaultHomeHeaders,
    );
  });

  it("starts with the site's own words, plain", () => {
    expect(headerTitleText(defaultHomeHeaders.firstSteps)).toBe(
      "Od pierwszego kontaktu do wsparcia na dłużej",
    );
    expect(defaultHomeHeaders.rooms.cta).toEqual({
      label: "Zobacz nasze gabinety",
      href: "/gabinety",
      style: "arrow",
    });
  });

  it("needs every section's header, and no others", () => {
    const { story: _story, ...withoutStory } = defaultHomeHeaders;
    expect(homeHeadersContentSchema.safeParse(withoutStory).success).toBe(
      false,
    );
    expect(
      homeHeadersContentSchema.safeParse({
        ...defaultHomeHeaders,
        faq: defaultHomeHeaders.story,
      }).success,
    ).toBe(false);
  });
});
