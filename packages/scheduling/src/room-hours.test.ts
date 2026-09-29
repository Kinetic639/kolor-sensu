import { describe, expect, it } from "vitest";
import {
  closedIntervals,
  mergeIntervals,
  openIntervalsOn,
  overlapMinutes,
  summarizeOpeningHours,
  weekdaysLabel,
  type OpeningHoursInterval,
} from "./room-hours";

const workdays: OpeningHoursInterval[] = [1, 2, 3, 4, 5].map((weekday) => ({
  weekday,
  startsAt: "08:00",
  endsAt: "18:00",
}));

describe("mergeIntervals", () => {
  it("sorts and joins overlapping or touching intervals", () => {
    expect(
      mergeIntervals([
        { start: 600, end: 700 },
        { start: 480, end: 600 },
        { start: 800, end: 900 },
        { start: 850, end: 1000 },
      ]),
    ).toEqual([
      { start: 480, end: 700 },
      { start: 800, end: 1000 },
    ]);
  });
});

describe("openIntervalsOn", () => {
  it("is the weekday's hours; nothing on a closed weekday", () => {
    // 2030-01-07 is a Monday, 2030-01-12 a Saturday.
    expect(openIntervalsOn("2030-01-07", workdays, [])).toEqual([
      { start: 480, end: 1080 },
    ]);
    expect(openIntervalsOn("2030-01-12", workdays, [])).toEqual([]);
  });

  it("applies that date's exceptions", () => {
    expect(
      openIntervalsOn("2030-01-07", workdays, [
        {
          date: "2030-01-07",
          type: "closed_all_day",
          startsAt: null,
          endsAt: null,
        },
      ]),
    ).toEqual([]);
    expect(
      openIntervalsOn("2030-01-07", workdays, [
        {
          date: "2030-01-07",
          type: "blocked_interval",
          startsAt: "12:00",
          endsAt: "13:00",
        },
        {
          date: "2030-01-08",
          type: "closed_all_day",
          startsAt: null,
          endsAt: null,
        },
      ]),
    ).toEqual([
      { start: 480, end: 720 },
      { start: 780, end: 1080 },
    ]);
    expect(
      openIntervalsOn("2030-01-12", workdays, [
        {
          date: "2030-01-12",
          type: "extra_available_interval",
          startsAt: "09:00",
          endsAt: "13:00",
        },
      ]),
    ).toEqual([{ start: 540, end: 780 }]);
  });
});

describe("closedIntervals", () => {
  it("is the rest of the visible range", () => {
    expect(
      closedIntervals(
        [
          { start: 540, end: 720 },
          { start: 780, end: 1020 },
        ],
        {
          start: 480,
          end: 1200,
        },
      ),
    ).toEqual([
      { start: 480, end: 540 },
      { start: 720, end: 780 },
      { start: 1020, end: 1200 },
    ]);
    expect(closedIntervals([], { start: 480, end: 1200 })).toEqual([
      { start: 480, end: 1200 },
    ]);
  });
});

describe("overlapMinutes", () => {
  it("counts the minutes of blocks inside the open hours", () => {
    expect(
      overlapMinutes(
        [
          { start: 420, end: 540 },
          { start: 600, end: 660 },
        ],
        [{ start: 480, end: 1080 }],
      ),
    ).toBe(120);
  });
});

describe("summarizeOpeningHours", () => {
  it("groups consecutive days with the same hours", () => {
    expect(summarizeOpeningHours(workdays)).toBe("Pn–Pt 08:00–18:00");
    expect(
      summarizeOpeningHours([
        ...workdays,
        { weekday: 6, startsAt: "09:00", endsAt: "13:00" },
      ]),
    ).toBe("Pn–Pt 08:00–18:00 · Sob 09:00–13:00");
    expect(
      summarizeOpeningHours([
        { weekday: 1, startsAt: "14:00", endsAt: "18:00" },
        { weekday: 1, startsAt: "08:00", endsAt: "12:00" },
        { weekday: 3, startsAt: "08:00", endsAt: "12:00" },
        { weekday: 3, startsAt: "14:00", endsAt: "18:00" },
      ]),
    ).toBe("Pn, Śr 08:00–12:00, 14:00–18:00");
  });

  it("is null without hours", () => {
    expect(summarizeOpeningHours([])).toBeNull();
  });
});

describe("weekdaysLabel", () => {
  it("joins three or more days in a row into a range", () => {
    expect(weekdaysLabel([1, 2, 3, 4, 5])).toBe("Pn–Pt");
    expect(weekdaysLabel([1, 2, 5, 6, 7])).toBe("Pn, Wt, Pt–Nd");
    expect(weekdaysLabel([])).toBe("");
  });
});
