import { defaultHomeStory } from "@repo/contracts";
import { describe, expect, it } from "vitest";
import { linesToList, listToLines, toStoryContent } from "./home-texts-editor";

describe("the thoughts, one per line", () => {
  it("keeps each line's words, dropping blank lines and spaces around", () => {
    expect(linesToList("  lęk \n\nwstyd\n  \nnie dam rady  ")).toEqual([
      "lęk",
      "wstyd",
      "nie dam rady",
    ]);
  });

  it("writes a list back one per line", () => {
    expect(listToLines(["lęk", "wstyd"])).toBe("lęk\nwstyd");
  });
});

describe("toStoryContent", () => {
  const row = { ...defaultHomeStory.steps[0]!, imageUrl: "https://x" };

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
