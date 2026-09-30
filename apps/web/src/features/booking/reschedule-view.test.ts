import { toFreeSlots } from "@repo/scheduling";
import { describe, expect, it } from "vitest";
import {
  buildRescheduleView,
  loadRescheduleParams,
  rescheduleHref,
} from "./reschedule-view";

const token = "a".repeat(43);
const slots = toFreeSlots(
  [
    // Thursday 3 October 2030, 11:00 and 12:00 in Warsaw.
    { starts_at: "2030-10-03T09:00:00Z", ends_at: "2030-10-03T09:50:00Z" },
    { starts_at: "2030-10-03T10:00:00Z", ends_at: "2030-10-03T10:50:00Z" },
  ],
  "Europe/Warsaw",
);

describe("rescheduleHref", () => {
  it("keeps the week and the chosen time in the visit's address", () => {
    expect(rescheduleHref(token, { tydzien: "2030-09-30" })).toBe(
      `/wizyta/${token}/przeloz?tydzien=2030-09-30`,
    );
    expect(rescheduleHref(token, {})).toBe(`/wizyta/${token}/przeloz`);
  });

  it("reads only well-formed values from the address", () => {
    const params = loadRescheduleParams(
      new URLSearchParams("tydzien=2030-02-31&termin=2030-10-03T11:00"),
    );
    expect(params).toEqual({ tydzien: null, termin: "2030-10-03T11:00" });
  });
});

describe("buildRescheduleView", () => {
  const input = {
    token,
    today: "2030-09-30",
    horizonDays: 60,
    slots,
  };

  it("shows this week's free times, each a link choosing it", () => {
    const view = buildRescheduleView({
      ...input,
      params: { tydzien: null, termin: null },
    });
    expect(view.picker.weekLabel).toBe("30 września – 6 października 2030");
    expect(view.picker.previousHref).toBeNull();
    expect(view.picker.nextHref).toBe(
      `/wizyta/${token}/przeloz?tydzien=2030-10-07`,
    );
    const thursday = view.picker.days[3]!;
    expect(thursday.slots.map((slot) => slot.time)).toEqual(["11:00", "12:00"]);
    expect(thursday.slots[0]!.href).toBe(
      `/wizyta/${token}/przeloz?tydzien=2030-09-30&termin=2030-10-03T11:00`,
    );
    expect(view.chosen).toBeNull();
  });

  it("finds the chosen time among the free ones, or drops it", () => {
    const chosen = buildRescheduleView({
      ...input,
      params: { tydzien: null, termin: "2030-10-03T12:00" },
    });
    expect(chosen.chosen).toEqual({
      value: "2030-10-03T12:00",
      label: "czwartek, 3 października 2030, godz. 12:00",
    });
    expect(chosen.picker.days[3]!.slots[1]!.selected).toBe(true);
    const gone = buildRescheduleView({
      ...input,
      params: { tydzien: null, termin: "2030-10-03T15:00" },
    });
    expect(gone.chosen).toBeNull();
  });

  it("goes no further than the booking horizon", () => {
    const view = buildRescheduleView({
      ...input,
      horizonDays: 5,
      params: { tydzien: null, termin: null },
    });
    expect(view.picker.nextHref).toBeNull();
  });
});
