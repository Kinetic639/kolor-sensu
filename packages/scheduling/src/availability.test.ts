import { describe, expect, it } from "vitest";
import {
  expandAvailability,
  localSpanToInterval,
  occursOn,
  type AvailabilityRule,
} from "./availability";

const TZ = "Europe/Warsaw";

// 2030-01-07 is a Monday; summer time starts on Sunday 2030-03-31.
function rule(overrides: Partial<AvailabilityRule> = {}): AvailabilityRule {
  return {
    id: "rule",
    recurrence: "weekly",
    weekday: 1,
    startsAt: "09:00",
    endsAt: "13:00",
    validFrom: "2030-01-07",
    validUntil: null,
    mode: "in_person",
    roomId: "room-1",
    ...overrides,
  };
}

const iso = (date: Date) => date.toISOString();

describe("occursOn", () => {
  it("repeats weekly on its weekday while valid", () => {
    const weekly = rule({ validUntil: "2030-01-21" });
    expect(occursOn(weekly, "2030-01-07")).toBe(true);
    expect(occursOn(weekly, "2030-01-08")).toBe(false);
    expect(occursOn(weekly, "2030-01-21")).toBe(true);
    expect(occursOn(weekly, "2030-01-28")).toBe(false);
    expect(occursOn(weekly, "2029-12-31")).toBe(false);
  });

  it("repeats fortnightly from the week it starts in", () => {
    // Starts on a Wednesday: its week (from Monday 2030-01-07) counts.
    const fortnightly = rule({
      recurrence: "biweekly",
      validFrom: "2030-01-09",
    });
    expect(occursOn(fortnightly, "2030-01-07")).toBe(false); // before it starts
    expect(occursOn(fortnightly, "2030-01-14")).toBe(false);
    expect(occursOn(fortnightly, "2030-01-21")).toBe(true);
    expect(occursOn(fortnightly, "2030-01-28")).toBe(false);
  });

  it("happens once on its date", () => {
    const once = rule({
      recurrence: "once",
      weekday: 3,
      validFrom: "2030-01-09",
      validUntil: "2030-01-09",
    });
    expect(occursOn(once, "2030-01-09")).toBe(true);
    expect(occursOn(once, "2030-01-16")).toBe(false);
  });
});

describe("expandAvailability", () => {
  it("turns a week's rules into windows in the centre's time zone", () => {
    const windows = expandAvailability({
      rules: [
        rule(),
        rule({ id: "wed", weekday: 3, mode: "online", roomId: null }),
      ],
      timeOff: [],
      from: "2030-01-07",
      to: "2030-01-13",
      timeZone: TZ,
    });
    expect(
      windows.map((one) => [
        one.ruleId,
        one.date,
        iso(one.start),
        iso(one.end),
        one.mode,
      ]),
    ).toEqual([
      [
        "rule",
        "2030-01-07",
        "2030-01-07T08:00:00.000Z",
        "2030-01-07T12:00:00.000Z",
        "in_person",
      ],
      [
        "wed",
        "2030-01-09",
        "2030-01-09T08:00:00.000Z",
        "2030-01-09T12:00:00.000Z",
        "online",
      ],
    ]);
  });

  it("keeps the local hours across the change to summer time", () => {
    const [before, after] = expandAvailability({
      rules: [rule()],
      timeOff: [],
      from: "2030-03-25",
      to: "2030-04-07",
      timeZone: TZ,
    });
    expect(iso(before!.start)).toBe("2030-03-25T08:00:00.000Z");
    expect(iso(after!.start)).toBe("2030-04-01T07:00:00.000Z");
  });

  it("cuts time off out of the windows", () => {
    const windows = expandAvailability({
      rules: [rule()],
      timeOff: [
        // 10:00–11:00 local on the first Monday, and the whole next week.
        {
          start: new Date("2030-01-07T09:00:00Z"),
          end: new Date("2030-01-07T10:00:00Z"),
        },
        {
          start: new Date("2030-01-13T23:00:00Z"),
          end: new Date("2030-01-20T23:00:00Z"),
        },
      ],
      from: "2030-01-07",
      to: "2030-01-20",
      timeZone: TZ,
    });
    expect(windows.map((one) => [iso(one.start), iso(one.end)])).toEqual([
      ["2030-01-07T08:00:00.000Z", "2030-01-07T09:00:00.000Z"],
      ["2030-01-07T10:00:00.000Z", "2030-01-07T12:00:00.000Z"],
    ]);
  });
});

describe("localSpanToInterval", () => {
  it("covers whole local days, midnight to midnight", () => {
    const span = localSpanToInterval(
      {
        fromDate: "2030-01-07",
        toDate: "2030-01-13",
        fromTime: null,
        toTime: null,
      },
      TZ,
    );
    expect([iso(span.start), iso(span.end)]).toEqual([
      "2030-01-06T23:00:00.000Z",
      "2030-01-13T23:00:00.000Z",
    ]);
  });

  it("runs from a time on the first day to a time on the last", () => {
    const span = localSpanToInterval(
      {
        fromDate: "2030-03-30",
        toDate: "2030-04-01",
        fromTime: "12:00",
        toTime: "14:30",
      },
      TZ,
    );
    expect([iso(span.start), iso(span.end)]).toEqual([
      "2030-03-30T11:00:00.000Z",
      "2030-04-01T12:30:00.000Z",
    ]);
  });
});
