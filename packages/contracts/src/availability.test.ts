import { describe, expect, it } from "vitest";
import {
  availabilityRuleInputSchema,
  timeOffInputSchema,
} from "./availability";

const ROOM = "20000000-0000-4000-8000-000000000001";

const weekly = {
  recurrence: "weekly",
  weekday: 1,
  startsAt: "09:00",
  endsAt: "13:00",
  validFrom: "2030-01-07",
  validUntil: null,
  mode: "in_person",
  roomId: ROOM,
  note: null,
};

const issues = (value: unknown) => {
  const result = availabilityRuleInputSchema.safeParse(value);
  return result.success
    ? []
    : result.error.issues.map((issue) => issue.path.join("."));
};

describe("availabilityRuleInputSchema", () => {
  it("accepts a weekly window in a room", () => {
    expect(issues(weekly)).toEqual([]);
  });

  it("drops the room of an online window", () => {
    expect(
      availabilityRuleInputSchema.parse({ ...weekly, mode: "online" }).roomId,
    ).toBeNull();
  });

  it("needs a room for in-person and hybrid windows", () => {
    expect(issues({ ...weekly, roomId: null })).toEqual(["roomId"]);
    expect(issues({ ...weekly, mode: "hybrid", roomId: null })).toEqual([
      "roomId",
    ]);
  });

  it("takes quarter hours, ending after the start", () => {
    expect(issues({ ...weekly, startsAt: "09:10" })).toEqual(["startsAt"]);
    expect(issues({ ...weekly, endsAt: "09:00" })).toEqual(["endsAt"]);
  });

  it("ends validity on or after its start", () => {
    expect(issues({ ...weekly, validUntil: "2030-01-06" })).toEqual([
      "validUntil",
    ]);
  });

  it("rejects impossible dates", () => {
    expect(issues({ ...weekly, validFrom: "2030-02-30" })).toEqual([
      "validFrom",
    ]);
  });

  it("gives a one-day window the weekday of its date", () => {
    const once = availabilityRuleInputSchema.parse({
      ...weekly,
      recurrence: "once",
      weekday: 7,
      validFrom: "2030-01-09",
      validUntil: null,
    });
    expect(once).toMatchObject({ weekday: 3, validUntil: "2030-01-09" });
  });

  it("trims the note and keeps it short", () => {
    expect(
      availabilityRuleInputSchema.parse({ ...weekly, note: "  " }).note,
    ).toBeNull();
    expect(issues({ ...weekly, note: "x".repeat(501) })).toEqual(["note"]);
  });
});

describe("timeOffInputSchema", () => {
  it("accepts whole days", () => {
    expect(
      timeOffInputSchema.safeParse({
        fromDate: "2030-01-07",
        toDate: "2030-01-13",
        fromTime: null,
        toTime: null,
        reason: "Urlop",
      }).success,
    ).toBe(true);
  });

  it("needs both times or neither, and an end after the start", () => {
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
    expect(paths({ fromTime: "12:00" })).toEqual(["toTime"]);
    expect(paths({ fromTime: "12:00", toTime: "12:00" })).toEqual(["toTime"]);
    expect(paths({ toDate: "2030-01-06" })).toEqual(["toDate"]);
    expect(paths({ fromTime: "12:00", toTime: "14:30" })).toEqual([]);
  });
});
