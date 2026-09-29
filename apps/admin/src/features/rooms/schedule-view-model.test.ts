import type { RoomAvailabilityRule, SpecialistTimeOff } from "@repo/contracts";
import { describe, expect, it } from "vitest";
import { mapRoomScheduleViewModel } from "./schedule-view-model";

const TZ = "Europe/Warsaw";
const ROOM = "room-1";

function rule(overrides: Partial<RoomAvailabilityRule>): RoomAvailabilityRule {
  return {
    id: "rule",
    specialistId: "anna",
    specialistName: "Anna Nowak",
    specialistColor: null,
    specialistInitials: "AN",
    specialistAvatarUrl: null,
    specialistPhotoPath: null,
    recurrence: "weekly",
    weekdays: [1],
    intervalWeeks: 1,
    occurrenceCount: null,
    exceptions: [],
    startsAt: "09:00",
    endsAt: "12:00",
    validFrom: "2030-01-07",
    validUntil: null,
    mode: "in_person",
    roomId: ROOM,
    note: null,
    ...overrides,
  };
}

const anna = rule({ id: "anna-mon-wed", weekdays: [1, 3] });
const jan = rule({
  id: "jan-tue",
  specialistId: "jan",
  specialistName: "Jan Kowalski",
  specialistColor: "#2f5fa7",
  specialistInitials: "JK",
  recurrence: "once",
  weekdays: [2],
  startsAt: "17:00",
  endsAt: "19:00",
  validFrom: "2030-01-08",
  validUntil: "2030-01-08",
  mode: "hybrid",
});
const annaOff: SpecialistTimeOff = {
  id: "off",
  specialistId: "anna",
  // Monday 10:00–11:00 in Warsaw.
  startsAt: "2030-01-07T09:00:00.000Z",
  endsAt: "2030-01-07T10:00:00.000Z",
  reason: null,
};
const workdays = [1, 2, 3, 4, 5].map((weekday) => ({
  weekday,
  startsAt: "08:00",
  endsAt: "18:00",
}));

function model(
  overrides: Partial<Parameters<typeof mapRoomScheduleViewModel>[0]> = {},
) {
  return mapRoomScheduleViewModel({
    rules: [anna, jan],
    timeOff: [annaOff],
    hours: workdays,
    exceptions: [
      {
        date: "2030-01-09",
        type: "closed_all_day",
        startsAt: null,
        endsAt: null,
        reason: "Remont",
      },
    ],
    week: "2030-01-07",
    now: new Date("2030-01-07T07:00:00Z"),
    timeZone: TZ,
    ...overrides,
  });
}

describe("mapRoomScheduleViewModel", () => {
  it("shows the week of the room with each specialist's windows", () => {
    const { days, title } = model();
    expect(title).toBe("7–13 stycznia 2030");
    expect(model().lastDay).toBe("2030-01-13");
    expect(model().shortTitle).toBe("7–13 sty 2030");
    expect(days).toHaveLength(7);
    expect(days[0]).toMatchObject({
      date: "2030-01-07",
      label: "Pon",
      isToday: true,
      openLabel: "08:00–18:00",
    });
    // Anna's time off cuts her window; Jan is not affected.
    expect(days[0]!.windows.map((one) => one.timeLabel)).toEqual([
      "09:00 – 10:00",
      "11:00 – 12:00",
    ]);
    expect(days[1]!.windows[0]).toMatchObject({
      specialistName: "Jan Kowalski",
      initials: "JK",
      mode: "hybrid",
    });
  });

  it("gives each specialist their own colour", () => {
    const { days, specialists } = model();
    // Jan's colour is set; Anna's is automatic.
    expect(days[1]!.windows[0]).toMatchObject({
      accent: "#2f5fa7",
      tint: "color-mix(in srgb, #2f5fa7 8%, var(--surface))",
    });
    expect(days[0]!.windows[0]!.accent).toMatch(/^var\(--resource-[1-6]\)$/);
    expect(specialists.map((one) => one.name)).toEqual([
      "Anna Nowak",
      "Jan Kowalski",
    ]);
    expect(specialists[0]).toMatchObject({
      hoursLabel: "5 godz.",
      accent: days[0]!.windows[0]!.accent,
    });
  });

  it("shades the hours the room is closed and flags windows outside them", () => {
    const { days, range } = model();
    expect(range).toEqual({ start: 480, end: 1200 });
    expect(days[0]!.closed).toEqual([
      { start: 1080, end: 1200, label: "Gabinet zamknięty" },
    ]);
    expect(days[1]!.windows[0]!.outsideHours).toBe(true);
    expect(days[0]!.windows[0]!.outsideHours).toBe(false);
    // A closed day: the whole column, with the reason.
    expect(days[2]).toMatchObject({
      openLabel: "Zamknięte",
      closed: [{ start: 480, end: 1200, label: "Zamknięte: Remont" }],
    });
    expect(days[2]!.windows[0]!.outsideHours).toBe(true);
    expect(days[5]!.openLabel).toBe("Zamknięte");
  });

  it("hides the days the room is always closed, unless someone is in", () => {
    const { days } = model();
    expect(days.map((day) => day.hidden)).toEqual([
      false,
      false,
      // Closed that date only (an exception): shown, with the reason.
      false,
      false,
      false,
      true,
      true,
    ]);

    // A window on a closed weekday keeps the day, to show it.
    const saturday = rule({
      id: "anna-sat",
      recurrence: "once",
      weekdays: [6],
      validFrom: "2030-01-12",
      validUntil: "2030-01-12",
    });
    const withSaturday = model({ rules: [anna, jan, saturday] });
    expect(withSaturday.days[5]!.hidden).toBe(false);
  });

  it("sums up the week against the opening hours", () => {
    expect(model().summary).toEqual({
      hasHours: true,
      openLabel: "40 godz.",
      reservedLabel: "7 godz.",
      freeLabel: "37 godz.",
      percent: 8,
      windowCount: 4,
      outsideCount: 2,
    });
  });

  it("without opening hours the room is not limited", () => {
    const { days, summary } = model({ hours: [], exceptions: [] });
    expect(days[0]!.closed).toEqual([]);
    expect(days[0]!.openLabel).toBeNull();
    expect(days[1]!.windows[0]!.outsideHours).toBe(false);
    expect(days.some((day) => day.hidden)).toBe(false);
    expect(summary).toMatchObject({
      hasHours: false,
      openLabel: null,
      percent: null,
      outsideCount: 0,
    });
  });

  it("lists the next windows from now", () => {
    const { upcoming } = model({ now: new Date("2030-01-07T10:30:00Z") });
    expect(upcoming.map((one) => one.label)).toEqual([
      "Pon, 11:00 – 12:00",
      "Wt, 17:00 – 19:00",
      "Śr, 09:00 – 12:00",
    ]);
    expect(upcoming[0]!.specialistName).toBe("Anna Nowak");
  });
});
