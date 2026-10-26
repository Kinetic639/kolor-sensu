import { defaultHomeStory, defaultHomeThoughts } from "@repo/contracts";
import { describe, expect, it } from "vitest";
import { thoughtsProblemsOf, toStoryContent } from "./home-texts-editor";

describe("thoughtsProblemsOf", () => {
  const pairs = defaultHomeThoughts.pairs.slice(0, 8);

  it("finds nothing wrong with the site's thoughts", () => {
    expect(thoughtsProblemsOf(defaultHomeThoughts)).toEqual({});
  });

  it("names each side of a pair left empty, in Polish", () => {
    const problems = thoughtsProblemsOf({
      label: " ",
      pairs: pairs.map((pair, index) =>
        index === 2
          ? { negative: "", positive: "  " }
          : index === 5
            ? { ...pair, positive: "" }
            : pair,
      ),
    });
    expect(problems).toEqual({
      label: "Wpisz nazwę pasa (do 120 znaków).",
      "2.negative": "Wpisz trudną myśl (do 40 znaków).",
      "2.positive": "Wpisz myśl, w którą się zamienia (do 60 znaków).",
      "5.positive": "Wpisz myśl, w którą się zamienia (do 60 znaków).",
    });
  });

  it("says how many pairs the band needs", () => {
    expect(
      thoughtsProblemsOf({ label: "Myśli", pairs: pairs.slice(0, 3) }),
    ).toEqual({ list: "Potrzeba od 8 do 40 par, żeby wypełnić pas." });
  });
});

describe("toStoryContent", () => {
  const row = { ...defaultHomeStory.steps[0]!, imageUrl: "https://x" };
  it("keeps the selected media and its order, without copying catalogue data", () => {
    const media = {
      type: "articles",
      source: "manual",
      ids: [
        "22222222-2222-4222-8222-222222222222",
        "11111111-1111-4111-8111-111111111111",
      ],
    } as const;
    expect(
      toStoryContent([{ ...row, media: { ...media, ids: [...media.ids] } }])
        .steps[0]?.media,
    ).toEqual(media);
  });

  it("drops the photo's address and a button left empty", () => {
    const content = toStoryContent([{ ...row, cta: { label: "", href: "" } }]);
    expect(content.steps[0]).not.toHaveProperty("imageUrl");
    expect(content.steps[0]?.cta).toBeNull();
  });

  it("keeps a button with its words and address", () => {
    expect(toStoryContent([row]).steps[0]?.cta).toEqual({
      label: "Umów wizytę",
      href: "/umow-wizyte",
    });
  });
});
