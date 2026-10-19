import { describe, expect, it } from "vitest";
import {
  defaultSiteAppearance,
  siteAppearanceContentSchema,
} from "./cms-appearance";

describe("the site's shared settings", () => {
  it("reads empty settings as the site's own look", () => {
    expect(siteAppearanceContentSchema.parse({})).toEqual(
      defaultSiteAppearance,
    );
  });

  it("keeps a chosen backdrop and parallax layer", () => {
    expect(
      siteAppearanceContentSchema.parse({
        watercolorBackdropPath: " appearance/a.webp ",
        watercolorParallaxPath: "appearance/b.png",
      }),
    ).toEqual({
      watercolorBackdropPath: "appearance/a.webp",
      watercolorParallaxPath: "appearance/b.png",
    });
  });

  it("refuses empty or too long paths and fields it does not know", () => {
    expect(
      siteAppearanceContentSchema.safeParse({ watercolorBackdropPath: "" })
        .success,
    ).toBe(false);
    expect(
      siteAppearanceContentSchema.safeParse({
        watercolorParallaxPath: "a".repeat(301),
      }).success,
    ).toBe(false);
    expect(
      siteAppearanceContentSchema.safeParse({ color: "pink" }).success,
    ).toBe(false);
  });
});
