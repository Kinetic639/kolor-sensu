import { describe, expect, it } from "vitest";
import { specialistSplashAt } from "./specialist-artwork";

describe("specialistSplashAt", () => {
  it("the splashes in turn, by the specialist's place on the site", () => {
    expect([0, 1, 2, 3, 4, 5].map(specialistSplashAt)).toEqual([
      "pink-1",
      "sage-1",
      "pink-2",
      "sage-2",
      "pink-1",
      "sage-1",
    ]);
  });

  it("no place (not published yet): the first", () => {
    expect(specialistSplashAt(-1)).toBe("pink-1");
  });
});
