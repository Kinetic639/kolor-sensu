import type {
  SpecialistAvailabilityRule,
  SpecialistTimeOff,
} from "@repo/contracts";
import { describe, expect, it } from "vitest";
import {
  formatDateRange,
  formatTimeOff,
  mapAvailabilityViewModel,
} from "./view-model";

const TZ = "Europe/Warsaw";

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
    note: null,
    ...overrides,
  };
}

function timeOff(
  startsAt: string,
  endsAt: string,
  reason: string | null = null,
): SpecialistTimeOff {
  return { id: startsAt, specialistId: "specialist", startsAt, endsAt, reason };
}

const base = {
  rooms: [
    { id: "room-1", name: "Gabinet 1", color: "#16a34a" },
    { id: "room-2", name: "Gabinet 2", color: "#ea580c" },
  ],
  timeOff: [],
  // Monday 2030-01-07, 08:00 local.
  now: new Date("2030-01-07T07:00:00Z"),
  week: "2030-01-07",
  filters: { day: null, mode: null },
  timeZone: TZ,
};

describe("rooms", () => {
  it("shows each room in its colour; online is blue", () => {
    const model = mapAvailabilityViewModel({ ...base, rules: [] });
    expect(model.rooms).toEqual([
      { id: "room-1", name: "Gabinet 1", accent: "#16a34a" },
      { id: "room-2", name: "Gabinet 2", accent: "#ea580c" },
    ]);
  });

  it("gives a room without a colour an automatic one from its id", () => {
    const rooms = [{ id: "room-3", name: "Gabinet 3", color: null }];
    const first = mapAvailabilityViewModel({ ...base, rooms, rules: [] });
    const again = mapAvailabilityViewModel({
      ...base,
      rooms: [{ id: "room-0", name: "Nowy", color: null }, ...rooms],
      rules: [],
    });
    expect(first.rooms[0]!.accent).toMatch(/^var\(--resource-[1-6]\)$/);
    // Another room coming first does not change it.
    expect(again.rooms[1]!.accent).toBe(first.rooms[0]!.accent);
  });
});

describe("calendar week", () => {
  it("places the week's windows by minutes with the room's colours", () => {
    const model = mapAvailabilityViewModel({
      ...base,
      rules: [
        rule(),
        rule({
          id: "online",
          startsAt: "15:00",
          endsAt: "18:00",
          mode: "online",
          roomId: null,
        }),
        rule({
          id: "tue",
          weekdays: [2],
          roomId: "room-2",
          note: "Tylko dorośli",
        }),
      ],
    });
    const { calendar } = model;

    expect(calendar.title).toBe("7–13 stycznia 2030");
    expect(calendar.previousWeek).toBe("2029-12-31");
    expect(calendar.nextWeek).toBe("2030-01-14");
    expect(calendar.range).toEqual({ start: 480, end: 1200 });
    const [monday, tuesday] = calendar.days;
    expect(monday).toMatchObject({
      date: "2030-01-07",
      label: "Pon",
      sublabel: "7 stycznia",
      isToday: true,
      hoursLabel: "7 godz.",
    });
    expect(monday!.windows).toMatchObject([
      {
        ruleId: "rule",
        start: 540,
        end: 780,
        timeLabel: "09:00 – 13:00",
        placeLabel: "Gabinet 1",
        accent: "#16a34a",
        tint: "color-mix(in srgb, #16a34a 8%, var(--surface))",
      },
      {
        ruleId: "online",
        placeLabel: "Online",
        accent: "var(--online)",
        tint: "var(--online-soft)",
      },
    ]);
    expect(tuesday!.windows[0]).toMatchObject({
      placeLabel: "Gabinet 2",
      accent: "#ea580c",
      note: "Tylko dorośli",
    });
    expect(calendar.days[2]!.hoursLabel).toBeNull();
    expect(calendar.stats).toEqual({
      available: "11 godz.",
      booked: "0 godz.",
      free: "11 godz.",
    });
  });

  it("shows time off as blocks and cuts it out of the windows", () => {
    const model = mapAvailabilityViewModel({
      ...base,
      rules: [rule(), rule({ id: "tue", weekdays: [2] })],
      timeOff: [
        timeOff("2030-01-07T09:00:00.000Z", "2030-01-07T10:00:00.000Z"),
        timeOff(
          "2030-01-07T23:00:00.000Z",
          "2030-01-08T23:00:00.000Z",
          "Urlop",
        ),
      ],
    });
    const [monday, tuesday] = model.calendar.days;
    expect(monday!.windows.map((one) => one.timeLabel)).toEqual([
      "09:00 – 10:00",
      "11:00 – 13:00",
    ]);
    expect(monday!.timeOff).toMatchObject([
      { start: 600, end: 660, label: "Nieobecność" },
    ]);
    expect(tuesday!.windows).toEqual([]);
    expect(tuesday!.timeOff).toMatchObject([
      { start: 480, end: 1200, label: "Nieobecność: Urlop" },
    ]);
  });

  it("a day the whole centre is closed is blocked, with why", () => {
    const model = mapAvailabilityViewModel({
      ...base,
      rules: [],
      closures: [
        { startsOn: "2030-01-08", endsOn: "2030-01-08", reason: "Święto" },
      ],
    });
    expect(model.calendar.days[1]!.timeOff).toEqual([
      expect.objectContaining({ label: "Centrum zamknięte · Święto" }),
    ]);
    expect(model.calendar.days[0]!.timeOff).toEqual([]);
  });

  it("widens the hours for early or late windows", () => {
    const model = mapAvailabilityViewModel({
      ...base,
      rules: [rule({ startsAt: "07:30", endsAt: "21:15" })],
    });
    expect(model.calendar.range).toEqual({ start: 420, end: 1320 });
  });
});

describe("rules list", () => {
  const rules = [
    rule(),
    rule({
      id: "online",
      weekdays: [1],
      startsAt: "15:00",
      endsAt: "18:00",
      mode: "online",
      roomId: null,
    }),
    rule({
      id: "thu",
      weekdays: [2, 4],
      intervalWeeks: 2,
      validFrom: "2030-01-09",
      mode: "hybrid",
    }),
    rule({
      id: "once",
      recurrence: "once",
      weekdays: [5],
      validFrom: "2030-01-11",
      validUntil: "2030-01-11",
    }),
    rule({ id: "ended", weekdays: [3], validUntil: "2030-01-06" }),
  ];

  it("describes each current rule, by day and time", () => {
    const model = mapAvailabilityViewModel({ ...base, rules });
    expect(model.rules.items.map((item) => item.id)).toEqual([
      "rule",
      "online",
      "thu",
      "once",
    ]);
    expect(model.rules.items[0]).toMatchObject({
      title: "Poniedziałek",
      recurrenceLabel: "Co tydzień w poniedziałki",
      timeLabel: "09:00 – 13:00",
      durationLabel: "4 godz.",
      placeLabel: "Gabinet 1",
      accent: "#16a34a",
      occupancy: {
        percent: 0,
        bookedLabel: "0 godz. zajęte (0 wizyt)",
        freeLabel: "4 godz. wolne",
      },
    });
    expect(model.rules.items[2]).toMatchObject({
      title: "Wt, Czw",
      subtitle: "od 9 stycznia 2030",
      recurrenceLabel: "Co 2 tygodnie we wtorki i czwartki",
    });
    expect(model.rules.items[3]).toMatchObject({
      title: "11 stycznia 2030",
      subtitle: "piątek",
      recurrenceLabel: "Jednorazowo",
      canCopyToWorkdays: false,
    });
    expect(model.rules.total).toBe(4);
  });

  it("filters by day and by form, with counts per day", () => {
    const byDay = mapAvailabilityViewModel({
      ...base,
      rules,
      filters: { day: 1, mode: null },
    });
    expect(byDay.rules.items.map((item) => item.id)).toEqual([
      "rule",
      "online",
    ]);
    expect(byDay.rules.dayCounts).toEqual({ 1: 2, 2: 1, 4: 1, 5: 1 });

    const online = mapAvailabilityViewModel({
      ...base,
      rules,
      filters: { day: null, mode: "online" },
    });
    expect(online.rules.items.map((item) => item.id)).toEqual([
      "online",
      "thu",
    ]);
    const inPerson = mapAvailabilityViewModel({
      ...base,
      rules,
      filters: { day: null, mode: "stacjonarnie" },
    });
    expect(inPerson.rules.items.map((item) => item.id)).toEqual([
      "rule",
      "thu",
      "once",
    ]);
  });

  it("shows a Monday–Friday rule once, under each of its days", () => {
    const workdays = rule({
      id: "workdays",
      weekdays: [1, 2, 3, 4, 5],
      exceptions: ["2030-01-09", "2030-01-10"],
    });
    const model = mapAvailabilityViewModel({
      ...base,
      rules: [workdays],
      filters: { day: 3, mode: null },
    });
    expect(model.rules.items).toMatchObject([
      {
        id: "workdays",
        title: "Poniedziałek – piątek",
        subtitle: "2 terminy pominięte",
        recurrenceLabel: "Co tydzień w dni robocze (pn–pt)",
        canCopyToWorkdays: false,
      },
    ]);
    expect(model.rules.dayCounts).toEqual({ 1: 1, 2: 1, 3: 1, 4: 1, 5: 1 });
    // The skipped Wednesday and Thursday are not in the calendar.
    expect(model.calendar.days.map((day) => day.windows.length)).toEqual([
      1, 1, 0, 0, 1, 0, 0,
    ]);
    expect(model.calendar.days[0]!.windows[0]).toMatchObject({
      recurring: true,
      recurrenceLabel: "Co tydzień w dni robocze (pn–pt)",
    });
  });

  it("lists time off that has not ended", () => {
    const model = mapAvailabilityViewModel({
      ...base,
      rules: [],
      timeOff: [
        timeOff("2029-12-20T23:00:00.000Z", "2029-12-27T23:00:00.000Z"),
        timeOff(
          "2030-02-02T23:00:00.000Z",
          "2030-02-14T23:00:00.000Z",
          "Urlop",
        ),
      ],
    });
    expect(model.timeOff).toEqual([
      {
        id: "2030-02-02T23:00:00.000Z",
        label: "3–14 lutego 2030",
        reason: "Urlop",
      },
    ]);
  });
});

describe("formatting", () => {
  it("shortens date ranges within a month or a year", () => {
    expect(formatDateRange("2030-01-07", "2030-01-07")).toBe("7 stycznia 2030");
    expect(formatDateRange("2030-01-30", "2030-02-02")).toBe(
      "30 stycznia – 2 lutego 2030",
    );
    expect(formatDateRange("2029-12-30", "2030-01-02")).toBe(
      "30 grudnia 2029 – 2 stycznia 2030",
    );
  });

  it("describes time off in local time", () => {
    expect(
      formatTimeOff(
        timeOff("2030-01-07T11:00:00.000Z", "2030-01-07T13:30:00.000Z"),
        TZ,
      ),
    ).toBe("7 stycznia 2030, 12:00–14:30");
  });
});

describe("room occupancy in the calendar", () => {
  const occupancy = [
    // Anna has room 1 on Monday 10:00–12:00.
    {
      roomId: "room-1",
      date: "2030-01-07",
      startsAt: "10:00",
      endsAt: "12:00",
      specialistId: "anna",
      specialistName: "Anna Nowak",
      specialistInitials: "AN",
      specialistAvatarUrl: "https://signed/anna",
      specialistPhotoPath: "anna/photo.webp",
    },
    // Someone in room 2: another room, not shown.
    {
      roomId: "room-2",
      date: "2030-01-07",
      startsAt: "10:00",
      endsAt: "12:00",
      specialistId: "jan",
      specialistName: "Jan Kowalski",
      specialistInitials: "JK",
      specialistAvatarUrl: null,
      specialistPhotoPath: null,
    },
    // My own hours in room 1 are my windows, not someone else's.
    {
      roomId: "room-1",
      date: "2030-01-08",
      startsAt: "09:00",
      endsAt: "13:00",
      specialistId: "specialist",
      specialistName: "Ja",
      specialistInitials: "J",
      specialistAvatarUrl: null,
      specialistPhotoPath: null,
    },
  ];

  it("shows who else has the chosen room, and when it is closed", () => {
    const model = mapAvailabilityViewModel({
      ...base,
      rules: [],
      specialistId: "specialist",
      occupancy,
      room: {
        id: "room-1",
        hours: [1, 2, 3, 4, 5].map((weekday) => ({
          weekday,
          startsAt: "08:00",
          endsAt: "18:00",
        })),
        exceptions: [],
      },
    });
    const { calendar } = model;

    expect(calendar.roomFocus).toEqual({
      id: "room-1",
      name: "Gabinet 1",
      accent: "#16a34a",
      hoursLabel: "Pn–Pt 08:00–18:00",
      busyLabel: "1 blok innych specjalistów",
    });
    expect(calendar.days[0]!.room.busy).toEqual([
      {
        id: "room-1-2030-01-07-600-anna",
        start: 600,
        end: 720,
        timeLabel: "10:00 – 12:00",
        specialistName: "Anna Nowak",
        initials: "AN",
        avatarUrl: "https://signed/anna",
        label: "Gabinet 1 zajęty: Anna Nowak, 10:00 – 12:00",
      },
    ]);
    expect(calendar.days[1]!.room.busy).toEqual([]);
    expect(calendar.days[0]!.room.closed).toEqual([
      { start: 1080, end: 1200, label: "Gabinet 1 zamknięty" },
    ]);
    expect(calendar.days[5]!.room.closed).toEqual([
      { start: 480, end: 1200, label: "Gabinet 1 zamknięty" },
    ]);
    // Others' hours, any room, for choosing a free room in the forms.
    expect(calendar.othersOccupancy.map((one) => one.specialistId)).toEqual([
      "anna",
      "jan",
    ]);
  });

  it("shows nothing of rooms when none is chosen", () => {
    const model = mapAvailabilityViewModel({
      ...base,
      rules: [],
      specialistId: "specialist",
      occupancy,
      room: null,
    });
    expect(model.calendar.roomFocus).toBeNull();
    expect(model.calendar.days[0]!.room).toEqual({ busy: [], closed: [] });
  });
});
