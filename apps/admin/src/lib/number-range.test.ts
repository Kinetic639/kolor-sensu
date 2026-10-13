import { z } from "zod";
import { describe, expect, it } from "vitest";
import { numberRange } from "./number-range";

describe("numberRange", () => {
  it("gives a number field the bounds its check has (#32)", () => {
    expect(numberRange(z.number().int().min(0).max(168))).toEqual({
      min: 0,
      max: 168,
    });
    expect(numberRange(z.number().min(15).max(300).default(50))).toEqual({
      min: 15,
      max: 300,
    });
  });

  it("gives none where the check has none, or is not a number", () => {
    expect(numberRange(z.number())).toEqual({});
    expect(numberRange(z.string().min(3))).toEqual({});
  });
});
