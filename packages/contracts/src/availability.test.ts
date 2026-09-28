import { describe, expect, it } from "vitest";
import {
  availabilityRuleInputSchema,
  occurrenceScopeSchema,
  timeOffInputSchema,
} from "./availability";

const ROOM = "20000000-0000-4000-8000-000000000001";

const oneOff = {
  recurrence: "once",
  weekdays: [1],
  intervalWeeks: 1,
  startsAt: "09:00",
  endsAt: "13:00",
  validFrom: "2030-01-09",
  ends: "never",
  validUntil: null,
  occurrenceCount: null,
  mode: "in_person",
  roomId: ROOM,
  note: null,
};

const weekly = { ...oneOff, recurrence: "weekly", weekdays: [5, 1, 3] };

const issues = (value: unknown) => {
  const result = availabilityRuleInputSchema.safeParse(value);
  return result.success
    ? []
    : result.error.issues.map((issue) => issue.path.join("."));
};

describe("availabilityRuleInputSchema", () => {
  it("makes a one-off a single day on the weekday of its date", () => {
    expect(availabilityRuleInputSchema.parse(oneOff)).toMatchObject({
      recurrence: "once",
      weekdays: [3],
      intervalWeeks: 1,
      validUntil: "2030-01-09",
      occurrenceCount: null,
    });
  });

  it("keeps a rule's weekdays sorted and without repeats", () => {
    expect(
      availabilityRuleInputSchema.parse({ ...weekly, weekdays: [5, 1, 3, 1] })
        .weekdays,
    ).toEqual([1, 3, 5]);
  });

  it("needs at least one weekday and an interval of 1–4 weeks", () => {
    expect(issues({ ...weekly, weekdays: [] })).toEqual(["weekdays"]);
    expect(issues({ ...weekly, weekdays: [8] })).toEqual(["weekdays.0"]);
    expect(issues({ ...weekly, intervalWeeks: 5 })).toEqual(["intervalWeeks"]);
  });

  it("ends never, on a date or after a number of times", () => {
    expect(
      availabilityRuleInputSchema.parse({
        ...weekly,
        validUntil: "2030-06-30",
      }),
    ).toMatchObject({ ends: "never", validUntil: null, occurrenceCount: null });
    expect(
      availabilityRuleInputSchema.parse({
        ...weekly,
        ends: "until",
        validUntil: "2030-06-30",
        occurrenceCount: 4,
      }),
    ).toMatchObject({ validUntil: "2030-06-30", occurrenceCount: null });
    expect(
      availabilityRuleInputSchema.parse({
        ...weekly,
        ends: "count",
        validUntil: "2030-06-30",
        occurrenceCount: 10,
      }),
    ).toMatchObject({ validUntil: null, occurrenceCount: 10 });
  });

  it("needs the end date or the count it ends by", () => {
    expect(issues({ ...weekly, ends: "until" })).toEqual(["validUntil"]);
    expect(
      issues({ ...weekly, ends: "until", validUntil: "2030-01-08" }),
    ).toEqual(["validUntil"]);
    expect(issues({ ...weekly, ends: "count" })).toEqual(["occurrenceCount"]);
    expect(issues({ ...weekly, ends: "count", occurrenceCount: 201 })).toEqual([
      "occurrenceCount",
    ]);
  });

  it("needs a room for in-person and hybrid windows, not for online", () => {
    expect(issues({ ...oneOff, roomId: null })).toEqual(["roomId"]);
    expect(issues({ ...oneOff, mode: "hybrid", roomId: null })).toEqual([
      "roomId",
    ]);
    expect(
      availabilityRuleInputSchema.parse({ ...oneOff, mode: "online" }).roomId,
    ).toBeNull();
  });

  it("takes quarter hours, ending after the start", () => {
    expect(issues({ ...oneOff, startsAt: "09:10" })).toEqual(["startsAt"]);
    expect(issues({ ...oneOff, endsAt: "09:00" })).toEqual(["endsAt"]);
  });

  it("rejects impossible dates and trims the note", () => {
    expect(issues({ ...oneOff, validFrom: "2030-02-30" })).toEqual([
      "validFrom",
    ]);
    expect(
      availabilityRuleInputSchema.parse({ ...oneOff, note: "  " }).note,
    ).toBeNull();
    expect(issues({ ...oneOff, note: "x".repeat(501) })).toEqual(["note"]);
  });
});

describe("occurrenceScopeSchema", () => {
  it("is this occurrence, this and following, or all", () => {
    expect(occurrenceScopeSchema.options).toEqual(["this", "following", "all"]);
  });
});

describe("timeOffInputSchema", () => {
  const paths = (value: object) => {
    const result = timeOffInputSchema.safeParse({
      fromDate: "2030-01-07",
      toDate: "2030-01-07",
      fromTime: null,
      toTime: null,
      reason: null,
      ...value,
    });
    return result.success
      ? []
      : result.error.issues.map((issue) => issue.path.join("."));
  };

  it("accepts whole days or both times", () => {
    expect(paths({ toDate: "2030-01-13" })).toEqual([]);
    expect(paths({ fromTime: "12:00", toTime: "14:30" })).toEqual([]);
  });

  it("needs both times or neither, and an end after the start", () => {
    expect(paths({ fromTime: "12:00" })).toEqual(["toTime"]);
    expect(paths({ fromTime: "12:00", toTime: "12:00" })).toEqual(["toTime"]);
    expect(paths({ toDate: "2030-01-06" })).toEqual(["toDate"]);
  });
});
