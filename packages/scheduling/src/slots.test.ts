import { describe, expect, it } from "vitest";
import { groupSlotsByDay, toFreeSlots } from "./slots";

const TZ = "Europe/Warsaw";

describe("toFreeSlots", () => {
  it("reads the database's free times as local dates and times", () => {
    // 09:00 in winter (UTC+1), 09:00 in summer (UTC+2).
    const slots = toFreeSlots(
      [
        {
          starts_at: "2030-01-07T08:00:00+00:00",
          ends_at: "2030-01-07T08:50:00+00:00",
        },
        {
          starts_at: "2030-07-01T07:00:00+00:00",
          ends_at: "2030-07-01T07:50:00+00:00",
        },
      ],
      TZ,
    );
    expect(slots.map((slot) => [slot.date, slot.localTime])).toEqual([
      ["2030-01-07", "09:00"],
      ["2030-07-01", "09:00"],
    ]);
    expect(slots[0]!.end).toEqual(new Date("2030-01-07T08:50:00Z"));
  });

  it("puts a time just after midnight on its local day", () => {
    const [slot] = toFreeSlots(
      [{ starts_at: "2030-01-06T23:30:00Z", ends_at: "2030-01-07T00:20:00Z" }],
      TZ,
    );
    expect([slot!.date, slot!.localTime]).toEqual(["2030-01-07", "00:30"]);
  });
});

describe("groupSlotsByDay", () => {
  it("lists every day of the range, with or without free times", () => {
    const slots = toFreeSlots(
      [
        { starts_at: "2030-01-07T08:00:00Z", ends_at: "2030-01-07T08:50:00Z" },
        { starts_at: "2030-01-07T09:00:00Z", ends_at: "2030-01-07T09:50:00Z" },
        { starts_at: "2030-01-09T12:00:00Z", ends_at: "2030-01-09T12:50:00Z" },
      ],
      TZ,
    );
    const days = groupSlotsByDay(slots, "2030-01-07", "2030-01-09");
    expect(
      days.map((day) => [day.date, day.slots.map((slot) => slot.localTime)]),
    ).toEqual([
      ["2030-01-07", ["09:00", "10:00"]],
      ["2030-01-08", []],
      ["2030-01-09", ["13:00"]],
    ]);
  });
});
