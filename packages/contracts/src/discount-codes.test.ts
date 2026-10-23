import { describe, expect, it } from "vitest";
import {
  discountCodeInputSchema,
  discountCodeState,
  discountLabel,
  discountOn,
  parseZloty,
} from "./discount-codes";

const input = {
  code: " jesien20 ",
  kind: "percent" as const,
  value: 20,
  startsOn: null,
  endsOn: null,
  active: true,
  note: "",
};

describe("a discount code's form", () => {
  it("keeps the code in capitals", () => {
    expect(discountCodeInputSchema.parse(input).code).toBe("JESIEN20");
  });

  it("refuses what the database would", () => {
    const fails = (patch: object) =>
      discountCodeInputSchema.safeParse({ ...input, ...patch }).success;
    expect(fails({ code: "ZŁY KOD" })).toBe(false);
    expect(fails({ code: "AB" })).toBe(false);
    expect(fails({ value: 100 })).toBe(false);
    expect(fails({ value: 99 })).toBe(true);
    expect(fails({ value: 0 })).toBe(false);
    expect(fails({ kind: "amount", value: 101 })).toBe(true);
    expect(fails({ startsOn: "2026-11-02", endsOn: "2026-11-01" })).toBe(false);
  });

  it("is for consultations unless said, and one workshop only as workshops", () => {
    expect(discountCodeInputSchema.parse(input).scope).toBe("consultations");
    const workshopId = "4f9b6d2e-8c1a-4e3b-9f7d-2a6c5b8e1d40";
    const parse = (patch: object) =>
      discountCodeInputSchema.safeParse({ ...input, ...patch }).success;
    expect(parse({ scope: "workshops", workshopId })).toBe(true);
    expect(parse({ scope: "all", workshopId })).toBe(false);
  });

  it("has no limit of uses unless one is set, of at least 1", () => {
    expect(discountCodeInputSchema.parse(input).maxUses).toBeNull();
    const parse = (maxUses: number | null) =>
      discountCodeInputSchema.safeParse({ ...input, maxUses }).success;
    expect(parse(20)).toBe(true);
    expect(parse(null)).toBe(true);
    expect(parse(0)).toBe(false);
    expect(parse(1.5)).toBe(false);
  });
});

describe("a discount", () => {
  it("is a share or an amount, always leaving 2 zł to pay", () => {
    expect(discountOn("percent", 20, 20000)).toBe(4000);
    expect(discountOn("percent", 15, 333)).toBe(50);
    expect(discountOn("amount", 5000, 20000)).toBe(5000);
    expect(discountOn("amount", 50000, 20000)).toBe(19800);
    expect(discountOn("percent", 99, 20000)).toBe(19800);
    expect(discountOn("amount", 100, 200)).toBe(0);
  });

  it("reads as the admin and the guest see it", () => {
    expect(discountLabel({ kind: "percent", value: 20 })).toBe("−20 %");
    expect(discountLabel({ kind: "amount", value: 5000 })).toBe("−50,00 zł");
  });

  it("works between its dates while switched on", () => {
    const code = { active: true, startsOn: "2026-11-01", endsOn: "2026-11-30" };
    expect(discountCodeState(code, "2026-10-31")).toBe("planned");
    expect(discountCodeState(code, "2026-11-01")).toBe("active");
    expect(discountCodeState(code, "2026-11-30")).toBe("active");
    expect(discountCodeState(code, "2026-12-01")).toBe("ended");
    expect(discountCodeState({ ...code, active: false }, "2026-11-10")).toBe(
      "off",
    );
  });

  it("reads złote as typed", () => {
    expect(parseZloty("50")).toBe(5000);
    expect(parseZloty("49,99")).toBe(4999);
    expect(parseZloty("12.5 zł")).toBe(1250);
    expect(parseZloty("abc")).toBeNull();
  });
});
