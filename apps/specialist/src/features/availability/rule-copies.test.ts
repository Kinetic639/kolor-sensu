import type { SpecialistAvailabilityRule } from "@repo/contracts";
import { describe, expect, it } from "vitest";
import {
  nextDayCopy,
  toRuleInput,
  weekTemplate,
  withWorkdays,
} from "./rule-copies";

function rule(
  overrides: Partial<SpecialistAvailabilityRule> = {},
): SpecialistAvailabilityRule {
  return {
    id: "rule",
    specialistId: "specialist",
    recurrence: "weekly",
    weekdays: [1],
    intervalWeeks: 1,
    occurrenceCount: null,
    exceptions: [],
    startsAt: "09:00",
    endsAt: "13:00",
    validFrom: "2030-01-07",
    validUntil: null,
    mode: "in_person",
    roomId: "room-1",
    note: "Notatka",
    ...overrides,
  };
}

describe("toRuleInput", () => {
  it("tells how the rule ends", () => {
    expect(toRuleInput(rule()).ends).toBe("never");
    expect(toRuleInput(rule({ validUntil: "2030-06-30" }))).toMatchObject({
      ends: "until",
      validUntil: "2030-06-30",
    });
    expect(
      toRuleInput(rule({ validUntil: "2030-01-21", occurrenceCount: 3 })),
    ).toMatchObject({ ends: "count", occurrenceCount: 3 });
  });
});

describe("nextDayCopy", () => {
  it("moves a rule's days one day on, Sunday to Monday", () => {
    expect(nextDayCopy(rule({ weekdays: [1, 7] })).weekdays).toEqual([1, 2]);
  });

  it("moves a one-off to the next date", () => {
    expect(
      nextDayCopy(
        rule({
          recurrence: "once",
          weekdays: [3],
          validFrom: "2030-01-09",
          validUntil: "2030-01-09",
        }),
      ),
    ).toMatchObject({ recurrence: "once", validFrom: "2030-01-10" });
  });

  it("keeps the hours, place and note", () => {
    expect(nextDayCopy(rule())).toMatchObject({
      startsAt: "09:00",
      endsAt: "13:00",
      mode: "in_person",
      roomId: "room-1",
      note: "Notatka",
    });
  });
});

describe("withWorkdays", () => {
  it("makes the rule Monday to Friday", () => {
    expect(
      withWorkdays(rule({ weekdays: [3], intervalWeeks: 2 })),
    ).toMatchObject({
      weekdays: [1, 2, 3, 4, 5],
      intervalWeeks: 2,
    });
  });
});

describe("weekTemplate", () => {
  it("is one rule, Monday to Friday 9:00–17:00, in a room or online", () => {
    expect(
      weekTemplate({ validFrom: "2030-01-07", roomId: "room-1" }),
    ).toMatchObject({
      recurrence: "weekly",
      weekdays: [1, 2, 3, 4, 5],
      startsAt: "09:00",
      endsAt: "17:00",
      mode: "in_person",
      roomId: "room-1",
      validFrom: "2030-01-07",
      ends: "never",
    });
    expect(
      weekTemplate({ validFrom: "2030-01-07", roomId: null }),
    ).toMatchObject({
      mode: "online",
      roomId: null,
    });
  });
});
