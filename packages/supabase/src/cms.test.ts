import { homePageContentSchema } from "@repo/contracts";
import { describe, expect, it } from "vitest";

describe("home page content schema", () => {
  it("accepts a well-formed payload", () => {
    expect(
      homePageContentSchema.safeParse({
        heading: "Kolor Sensu",
        body: "Centrum Psychoterapii.",
        buttonLabel: null,
      }).success,
    ).toBe(true);
  });

  it("applies a null default when buttonLabel is omitted", () => {
    const result = homePageContentSchema.parse({
      heading: "Kolor Sensu",
      body: "Centrum Psychoterapii.",
    });
    expect(result.buttonLabel).toBeNull();
  });

  it("rejects an empty heading or body", () => {
    expect(
      homePageContentSchema.safeParse({ heading: "", body: "Treść." }).success,
    ).toBe(false);
    expect(
      homePageContentSchema.safeParse({ heading: "Nagłówek", body: "" })
        .success,
    ).toBe(false);
  });

  it("rejects a malformed payload missing required fields", () => {
    expect(
      homePageContentSchema.safeParse({ heading: "Only heading" }).success,
    ).toBe(false);
    expect(homePageContentSchema.safeParse({}).success).toBe(false);
  });

  it("rejects unknown fields instead of silently stripping them", () => {
    expect(
      homePageContentSchema.safeParse({
        heading: "Kolor Sensu",
        body: "Centrum Psychoterapii.",
        sections: [{ type: "hero" }],
      }).success,
    ).toBe(false);
  });
});
