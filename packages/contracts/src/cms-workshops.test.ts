import { describe, expect, it } from "vitest";
import {
  defaultWorkshopsPage,
  workshopsPageContentSchema,
} from "./cms-workshops";

describe("Warsztaty's words", () => {
  it("start from the site's own words, valid", () => {
    expect(workshopsPageContentSchema.parse(defaultWorkshopsPage)).toEqual(
      defaultWorkshopsPage,
    );
    expect(defaultWorkshopsPage.emptyText).toMatch(/nie mamy zaplanowanych/);
  });

  it("need a line for an empty list", () => {
    expect(
      workshopsPageContentSchema.safeParse({
        ...defaultWorkshopsPage,
        emptyText: " ",
      }).success,
    ).toBe(false);
  });
});
