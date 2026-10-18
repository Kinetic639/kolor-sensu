import { describe, expect, it } from "vitest";
import {
  defaultHeroPoints,
  defaultHomeStory,
  defaultHomeThoughts,
  HERO_POINTS_MAX,
  homePageContentSchema,
  homeStoryContentSchema,
  homeThoughtsContentSchema,
} from "./cms";

describe("the hero", () => {
  const stored = {
    heading: "Więcej zrozumienia.",
    body: "Psychoterapia i wsparcie.",
    buttonLabel: null,
  };

  it("reads a hero saved before its new fields, with the site's defaults", () => {
    const hero = homePageContentSchema.parse(stored);
    expect(hero.eyebrow).toBe("Centrum psychoterapii i rozwoju");
    expect(hero.accent).toBe("Więcej sensu.");
    expect(hero.secondaryLabel).toBeNull();
    expect(hero.points).toEqual(defaultHeroPoints);
    expect(hero.imagePath).toBeNull();
  });

  it("takes up to four points, each a label and an icon from the list", () => {
    const point = { label: "Przytulne gabinety", icon: "house" } as const;
    expect(
      homePageContentSchema.safeParse({ ...stored, points: [] }).success,
    ).toBe(true);
    expect(
      homePageContentSchema.safeParse({
        ...stored,
        points: Array(HERO_POINTS_MAX + 1).fill(point),
      }).success,
    ).toBe(false);
    expect(
      homePageContentSchema.safeParse({
        ...stored,
        points: [{ label: "Kot", icon: "cat" }],
      }).success,
    ).toBe(false);
  });

  it("lets the eyebrow and the accent be empty, so they do not show", () => {
    const hero = homePageContentSchema.parse({
      ...stored,
      eyebrow: "",
      accent: "",
    });
    expect([hero.eyebrow, hero.accent]).toEqual(["", ""]);
  });
});

describe("the thoughts band", () => {
  it("starts from the site's thoughts", () => {
    expect(homeThoughtsContentSchema.parse(defaultHomeThoughts)).toEqual(
      defaultHomeThoughts,
    );
  });

  it("needs enough difficult thoughts for the crowd and some kinder ones", () => {
    const { label } = defaultHomeThoughts;
    expect(
      homeThoughtsContentSchema.safeParse({
        label,
        negative: ["lęk", "wstyd"],
        positive: defaultHomeThoughts.positive,
      }).success,
    ).toBe(false);
    expect(
      homeThoughtsContentSchema.safeParse({
        label,
        negative: defaultHomeThoughts.negative,
        positive: [],
      }).success,
    ).toBe(false);
    expect(
      homeThoughtsContentSchema.safeParse({
        label,
        negative: [...defaultHomeThoughts.negative.slice(0, 7), " "],
        positive: defaultHomeThoughts.positive,
      }).success,
    ).toBe(false);
  });
});

describe("the story", () => {
  const step = defaultHomeStory.steps[0]!;

  it("starts from the site's three steps, without photos of its own", () => {
    expect(defaultHomeStory.steps).toHaveLength(3);
    expect(defaultHomeStory.steps.every((one) => one.imagePath === null)).toBe(
      true,
    );
    expect(homeStoryContentSchema.parse(defaultHomeStory)).toEqual(
      defaultHomeStory,
    );
  });

  it("has one to four steps, each leading to a page of the site", () => {
    expect(homeStoryContentSchema.safeParse({ steps: [] }).success).toBe(false);
    expect(
      homeStoryContentSchema.safeParse({ steps: Array(5).fill(step) }).success,
    ).toBe(false);
    expect(
      homeStoryContentSchema.safeParse({
        steps: [{ ...step, cta: { label: "Dalej", href: "https://x.pl" } }],
      }).success,
    ).toBe(false);
    expect(
      homeStoryContentSchema.safeParse({ steps: [{ ...step, cta: null }] })
        .success,
    ).toBe(true);
  });
});
