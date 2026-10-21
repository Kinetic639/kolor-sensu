import { describe, expect, it } from "vitest";
import { discountProblem, priceWithDiscount } from "./discount";

describe("a booking's price with a code", () => {
  const discount = {
    code: "JESIEN20",
    listPriceMinor: 20000,
    discountMinor: 4000,
  };

  it("is the plain price without a code", () => {
    expect(priceWithDiscount(20000, null)).toBe("200,00 zł");
  });

  it("names the list price and the code", () => {
    expect(priceWithDiscount(16000, discount)).toBe(
      "160,00 zł (zamiast 200,00 zł, kod JESIEN20)",
    );
  });

  it("says when the code covers it all", () => {
    expect(priceWithDiscount(0, { ...discount, discountMinor: 20000 })).toBe(
      "0,00 zł (kod JESIEN20 pokrywa 200,00 zł)",
    );
  });
});

describe("a refused code", () => {
  it("is said in plain words", () => {
    expect(discountProblem("code_expired")).toBe("Ten kod już wygasł.");
    expect(discountProblem(null)).toMatch(/Spróbuj ponownie/);
  });
});
