import { describe, expect, it } from "vitest";
import {
  defaultWorkshopsPage,
  WORKSHOP_RULES_MAX,
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

describe("Warsztaty's shared rules (#231)", () => {
  it("are none until the centre writes them, also for words saved before", () => {
    expect(defaultWorkshopsPage.rules).toEqual([]);
    const { rules: _rules, ...saved } = defaultWorkshopsPage;
    expect(workshopsPageContentSchema.parse(saved).rules).toEqual([]);
  });

  it("are lines of their own, a few at most", () => {
    expect(
      workshopsPageContentSchema.parse({
        ...defaultWorkshopsPage,
        rules: [" Prosimy o punktualność. "],
      }).rules,
    ).toEqual(["Prosimy o punktualność."]);
    for (const rules of [[" "], Array(WORKSHOP_RULES_MAX + 1).fill("Zasada")]) {
      expect(
        workshopsPageContentSchema.safeParse({ ...defaultWorkshopsPage, rules })
          .success,
      ).toBe(false);
    }
  });
});
