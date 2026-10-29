import { describe, expect, it } from "vitest";
import {
  monthCells,
  monthWeeks,
  shiftDay,
  shiftMonth,
  workdayMonthCells,
} from "./availability-calendar-dates";

describe("monthly availability dates", () => {
  it("keeps weekdays aligned when a month starts on Sunday", () => {
    const cells = workdayMonthCells("2026-11-01");
    expect(cells.slice(0, 5)).toEqual([
      "2026-11-02",
      "2026-11-03",
      "2026-11-04",
      "2026-11-05",
      "2026-11-06",
    ]);
    expect(cells.length % 5).toBe(0);
    expect(cells.filter(Boolean)).toHaveLength(21);
    expect(
      cells.every(
        (day) =>
          !day || ![0, 6].includes(new Date(`${day}T12:00:00Z`).getUTCDay()),
      ),
    ).toBe(true);
  });
  it("lays out leap February Monday-first with complete rows", () => {
    const cells = monthCells("2028-02-01");
    expect(cells.length % 7).toBe(0);
    expect(cells[0]).toBe(null);
    expect(cells[1]).toBe("2028-02-01");
    expect(cells.filter(Boolean)).toHaveLength(29);
  });
  it("crosses daylight-saving changes and year boundaries without skipped days", () => {
    expect(shiftDay("2026-10-25", 1)).toBe("2026-10-26");
    expect(shiftDay("2026-03-29", 1)).toBe("2026-03-30");
    expect(shiftMonth("2026-12-31", 1)).toBe("2027-01-01");
    expect(shiftMonth("2026-01-31", -1)).toBe("2025-12-01");
  });
  it("only requests weeks intersecting today and the booking horizon", () => {
    expect(monthWeeks("2026-10-01", "2026-10-29", "2026-11-03")).toEqual([
      "2026-10-26",
    ]);
    expect(monthWeeks("2026-11-01", "2026-10-29", "2026-11-03")).toEqual([
      "2026-10-26",
      "2026-11-02",
    ]);
    expect(monthWeeks("2026-12-01", "2026-10-29", "2026-11-03")).toEqual([]);
  });
});
