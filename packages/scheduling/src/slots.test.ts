import { describe, expect, it } from "vitest";
import type { AvailabilityWindow } from "./availability";
import { freeSlots, groupSlotsByDay, type FreeSlotsOptions } from "./slots";

const TZ = "Europe/Warsaw";

// Local 09:00–13:00 on Monday 2030-01-07 (UTC+1).
function window(
  overrides: Partial<AvailabilityWindow> = {},
): AvailabilityWindow {
  return {
    ruleId: "rule",
    date: "2030-01-07",
    start: new Date("2030-01-07T08:00:00Z"),
    end: new Date("2030-01-07T12:00:00Z"),
    mode: "in_person",
    roomId: "room-1",
    ...overrides,
  };
}

const base: FreeSlotsOptions = {
  windows: [window()],
  busy: [],
  durationMinutes: 50,
  bufferMinutes: 10,
  stepMinutes: 60,
  mode: "in_person",
  now: new Date("2030-01-01T00:00:00Z"),
  leadMinutes: 60,
  horizonDays: 60,
  timeZone: TZ,
};

const times = (options: Partial<FreeSlotsOptions>) =>
  freeSlots({ ...base, ...options }).map((slot) => slot.localTime);

describe("freeSlots", () => {
  it("offers every full hour where the visit fits in the window", () => {
    expect(times({})).toEqual(["09:00", "10:00", "11:00", "12:00"]);
  });

  it("keeps to the clock grid when a window starts off the hour", () => {
    expect(
      times({ windows: [window({ start: new Date("2030-01-07T08:30:00Z") })] }),
    ).toEqual(["10:00", "11:00", "12:00"]);
  });

  it("carries the room, the date and the end of the visit", () => {
    const [slot] = freeSlots(base);
    expect(slot).toMatchObject({
      date: "2030-01-07",
      localTime: "09:00",
      roomId: "room-1",
      ruleId: "rule",
    });
    expect(slot!.end.toISOString()).toBe("2030-01-07T08:50:00.000Z");
  });

  it("leaves the break between visits", () => {
    // Booked 10:00–10:50.
    const busy = [
      {
        start: new Date("2030-01-07T09:00:00Z"),
        end: new Date("2030-01-07T09:50:00Z"),
      },
    ];
    expect(times({ busy })).toEqual(["09:00", "11:00", "12:00"]);
    // With a 15-minute break, 09:00 would end too close and 11:00 start too early.
    expect(times({ busy, bufferMinutes: 15 })).toEqual(["12:00"]);
  });

  it("keeps the lead time before the first bookable visit", () => {
    // Now is 09:30 local; 60 minutes of notice.
    expect(times({ now: new Date("2030-01-07T08:30:00Z") })).toEqual([
      "11:00",
      "12:00",
    ]);
  });

  it("stops at the booking horizon", () => {
    const windows = [
      window(),
      window({
        date: "2030-01-14",
        start: new Date("2030-01-14T08:00:00Z"),
        end: new Date("2030-01-14T12:00:00Z"),
      }),
    ];
    const slots = freeSlots({
      ...base,
      windows,
      now: new Date("2030-01-07T08:30:00Z"),
      horizonDays: 7,
    });
    // Up to a week from now: Monday 2030-01-14 09:30 local.
    expect(slots.map((slot) => `${slot.date} ${slot.localTime}`)).toEqual([
      "2030-01-07 11:00",
      "2030-01-07 12:00",
      "2030-01-14 09:00",
    ]);
  });

  it("matches the format: hybrid windows serve both", () => {
    const windows = [
      window({ mode: "online", roomId: null }),
      window({
        ruleId: "hybrid",
        date: "2030-01-08",
        start: new Date("2030-01-08T08:00:00Z"),
        end: new Date("2030-01-08T10:00:00Z"),
        mode: "hybrid",
      }),
    ];
    expect(
      freeSlots({ ...base, windows, mode: "in_person" }).map(
        (slot) => slot.ruleId,
      ),
    ).toEqual(["hybrid", "hybrid"]);
    expect(freeSlots({ ...base, windows, mode: "online" })).toHaveLength(6);
  });

  it("offers local full hours in summer time too", () => {
    const [slot] = freeSlots({
      ...base,
      now: new Date("2030-03-25T00:00:00Z"),
      windows: [
        window({
          date: "2030-04-01",
          start: new Date("2030-04-01T07:00:00Z"),
          end: new Date("2030-04-01T11:00:00Z"),
        }),
      ],
    });
    expect(slot!.localTime).toBe("09:00");
    expect(slot!.start.toISOString()).toBe("2030-04-01T07:00:00.000Z");
  });
});

describe("groupSlotsByDay", () => {
  it("lists every day of the range, with or without free times", () => {
    const days = groupSlotsByDay(freeSlots(base), "2030-01-07", "2030-01-09");
    expect(
      days.map((day) => [day.date, day.slots.map((slot) => slot.localTime)]),
    ).toEqual([
      ["2030-01-07", ["09:00", "10:00", "11:00", "12:00"]],
      ["2030-01-08", []],
      ["2030-01-09", []],
    ]);
  });
});
