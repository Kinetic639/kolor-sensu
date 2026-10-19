import { describe, expect, it } from "vitest";
import {
  defaultHeroPoints,
  defaultHomeStory,
  defaultHomeThoughts,
  HERO_POINTS_MAX,
  HOME_THOUGHT_PAIRS_MAX,
  HOME_THOUGHT_PAIRS_MIN,
  homePageContentSchema,
  homeStoryContentSchema,
  homeThoughtsContentSchema,
  pairLegacyThoughts,
  storedHomeThoughtsContentSchema,
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
  const pair = { negative: "lęk", positive: "To minie" };

  it("starts from the site's thoughts, each difficult one with its own", () => {
    expect(homeThoughtsContentSchema.parse(defaultHomeThoughts)).toEqual(
      defaultHomeThoughts,
    );
    expect(defaultHomeThoughts.pairs).toHaveLength(28);
    expect(defaultHomeThoughts.pairs.slice(0, 3)).toEqual([
      { negative: "nie dam rady", positive: "Mam prawo tak czuć" },
      { negative: "znowu to samo", positive: "Mam prawo tak czuć" },
      { negative: "co jeśli", positive: "Krok po kroku" },
    ]);
  });

  it("needs enough pairs for the crowd, and not too many", () => {
    const { label } = defaultHomeThoughts;
    const pairs = (count: number) => Array(count).fill(pair);
    expect(
      homeThoughtsContentSchema.safeParse({
        label,
        pairs: pairs(HOME_THOUGHT_PAIRS_MIN - 1),
      }).success,
    ).toBe(false);
    expect(
      homeThoughtsContentSchema.safeParse({
        label,
        pairs: pairs(HOME_THOUGHT_PAIRS_MIN),
      }).success,
    ).toBe(true);
    expect(
      homeThoughtsContentSchema.safeParse({
        label,
        pairs: pairs(HOME_THOUGHT_PAIRS_MAX + 1),
      }).success,
    ).toBe(false);
  });

  it("needs both sides of every pair, trimmed and short", () => {
    const { label } = defaultHomeThoughts;
    const withPair = (one: object) => ({
      label,
      pairs: [...Array(7).fill(pair), one],
    });
    for (const one of [
      { negative: " ", positive: "To minie" },
      { negative: "lęk", positive: "" },
      { negative: "lęk" },
      { negative: "x".repeat(41), positive: "To minie" },
      { negative: "lęk", positive: "x".repeat(61) },
    ]) {
      expect(homeThoughtsContentSchema.safeParse(withPair(one)).success).toBe(
        false,
      );
    }
    expect(
      homeThoughtsContentSchema.parse(
        withPair({ negative: "  lęk ", positive: " To minie " }),
      ).pairs[7],
    ).toEqual(pair);
  });
});

describe("thoughts saved as two lists, before the pairs", () => {
  it("pairs them as the site showed them: two rows, each three times over", () => {
    // Rows: a c e | b d; shown a c e a c e a c e b d b d b d, in turn under
    // A B C D: a→A, c→B, e→C, b→(9 % 4) B, d→(10 % 4) C.
    expect(
      pairLegacyThoughts(["a", "b", "c", "d", "e"], ["A", "B", "C", "D"]),
    ).toEqual([
      { negative: "a", positive: "A" },
      { negative: "b", positive: "B" },
      { negative: "c", positive: "B" },
      { negative: "d", positive: "C" },
      { negative: "e", positive: "C" },
    ]);
  });

  it("reads an old draft as pairs, the label kept", () => {
    const negative = defaultHomeThoughts.pairs.map((one) => one.negative);
    const positive = [
      ...new Set(defaultHomeThoughts.pairs.map((one) => one.positive)),
    ];
    expect(
      storedHomeThoughtsContentSchema.parse({
        label: defaultHomeThoughts.label,
        negative,
        positive,
      }),
    ).toEqual(defaultHomeThoughts);
  });

  it("reads the pairs as they are, and still refuses too few thoughts", () => {
    expect(storedHomeThoughtsContentSchema.parse(defaultHomeThoughts)).toEqual(
      defaultHomeThoughts,
    );
    expect(
      storedHomeThoughtsContentSchema.safeParse({
        label: "Myśli",
        negative: ["lęk", "wstyd"],
        positive: ["To minie"],
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
