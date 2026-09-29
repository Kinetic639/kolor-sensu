import { describe, expect, it } from "vitest";
import { formatDateRange, formatDateRangeShort } from "./labels";

describe("formatDateRange", () => {
  it("names a week in full", () => {
    expect(formatDateRange("2026-09-28", "2026-10-04")).toBe(
      "28 września – 4 października 2026",
    );
  });
});

describe("formatDateRangeShort", () => {
  it("names a week briefly, for tight places", () => {
    expect(formatDateRangeShort("2026-09-28", "2026-10-04")).toBe(
      "28 wrz – 4 paź 2026",
    );
    expect(formatDateRangeShort("2030-01-07", "2030-01-13")).toBe(
      "7–13 sty 2030",
    );
    expect(formatDateRangeShort("2029-12-31", "2030-01-06")).toBe(
      "31 gru 2029 – 6 sty 2030",
    );
  });
});
