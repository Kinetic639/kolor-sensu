import type { SpecialistAvailabilityRule } from "@repo/contracts";
import { describe, expect, it } from "vitest";
import { quickCreateDefaults, ruleFormValues } from "./form-values";

const ROOM = "20000000-0000-4000-8000-000000000001";

const workdays: SpecialistAvailabilityRule = {
  id: "rule",
  specialistId: "specialist",
  recurrence: "weekly",
  weekdays: [1, 2, 3, 4, 5],
  intervalWeeks: 1,
  occurrenceCount: null,
  exceptions: [],
  startsAt: "09:00",
  endsAt: "13:00",
  validFrom: "2030-01-07",
  validUntil: null,
  mode: "in_person",
  roomId: ROOM,
  note: null,
};

describe("ruleFormValues", () => {
  it("starts a new window as a one-off on the chosen day", () => {
    expect(
      ruleFormValues(null, {
        today: "2030-01-07",
        prefill: { validFrom: "2030-01-10" },
      }),
    ).toMatchObject({
      recurrence: "once",
      weekdays: [4],
      intervalWeeks: 1,
      validFrom: "2030-01-10",
      ends: "never",
      startsAt: "09:00",
      endsAt: "17:00",
    });
  });

  it("edits a whole rule from its start", () => {
    expect(ruleFormValues(workdays, { today: "2030-01-07" })).toMatchObject({
      recurrence: "weekly",
      weekdays: [1, 2, 3, 4, 5],
      validFrom: "2030-01-07",
    });
  });

  it("edits an occurrence from its date", () => {
    expect(
      ruleFormValues(workdays, {
        today: "2030-01-07",
        occurrenceDate: "2030-01-16",
      }),
    ).toMatchObject({ recurrence: "weekly", validFrom: "2030-01-16" });
  });
});

describe("quickCreateDefaults", () => {
  const selection = { date: "2030-01-08", startsAt: "09:00", endsAt: "11:00" };

  it("proposes those hours on that day only, in the first room", () => {
    expect(quickCreateDefaults(selection, [{ id: ROOM }])).toMatchObject({
      recurrence: "once",
      weekdays: [2],
      validFrom: "2030-01-08",
      startsAt: "09:00",
      endsAt: "11:00",
      mode: "in_person",
      roomId: ROOM,
      ends: "never",
    });
  });

  it("is online when the centre has no rooms", () => {
    expect(quickCreateDefaults(selection, [])).toMatchObject({
      mode: "online",
      roomId: null,
    });
  });
});
