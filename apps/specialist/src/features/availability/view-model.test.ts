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
    weekday: 1,
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
  rooms: [{ id: "room-1", name: "Gabinet 1" }],
  timeOff: [],
  // Monday 2030-01-07, 08:00 local.
  now: new Date("2030-01-07T07:00:00Z"),
  week: "2030-01-07",
  timeZone: TZ,
};

describe("mapAvailabilityViewModel", () => {
  it("groups recurring windows by weekday, all seven days listed", () => {
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
          id: "thu",
          recurrence: "biweekly",
          weekday: 4,
          validFrom: "2030-01-09",
          mode: "hybrid",
          note: "Tylko dorośli",
        }),
      ],
    });

    expect(model.weekly.map((day) => day.label)).toEqual([
      "Poniedziałek",
      "Wtorek",
      "Środa",
      "Czwartek",
      "Piątek",
      "Sobota",
      "Niedziela",
    ]);
    expect(model.weekly[0]!.windows).toMatchObject([
      {
        id: "rule",
        timeLabel: "09:00–13:00",
        placeLabel: "Gabinet 1",
        recurrenceLabel: "Co tydzień",
      },
      { id: "online", placeLabel: "Online", mode: "online" },
    ]);
    expect(model.weekly[3]!.windows[0]).toMatchObject({
      recurrenceLabel: "Co 2 tygodnie, od 9 stycznia 2030",
      note: "Tylko dorośli",
    });
  });

  it("says when a window starts later or ends, and hides ended ones", () => {
    const model = mapAvailabilityViewModel({
      ...base,
      rules: [
        rule({ id: "later", validFrom: "2030-02-04" }),
        rule({ id: "ends", weekday: 2, validUntil: "2030-06-30" }),
        rule({ id: "ended", weekday: 3, validUntil: "2030-01-06" }),
      ],
    });
    expect(model.weekly[0]!.windows[0]!.recurrenceLabel).toBe(
      "Co tydzień, od 4 lutego 2030",
    );
    expect(model.weekly[1]!.windows[0]!.recurrenceLabel).toBe(
      "Co tydzień, do 30 czerwca 2030",
    );
    expect(model.weekly[2]!.windows).toEqual([]);
  });

  it("lists upcoming one-day windows by date", () => {
    const model = mapAvailabilityViewModel({
      ...base,
      rules: [
        rule({
          id: "past",
          recurrence: "once",
          weekday: 5,
          validFrom: "2030-01-04",
          validUntil: "2030-01-04",
        }),
        rule({
          id: "soon",
          recurrence: "once",
          weekday: 4,
          validFrom: "2030-01-10",
          validUntil: "2030-01-10",
          mode: "online",
          roomId: null,
        }),
      ],
    });
    expect(model.oneOff).toMatchObject([
      {
        id: "soon",
        label: "czwartek, 10 stycznia 2030",
        timeLabel: "09:00–13:00",
        placeLabel: "Online",
      },
    ]);
    expect(model.weekly.flatMap((day) => day.windows)).toEqual([]);
  });

  it("previews the chosen week with time off cut out", () => {
    const model = mapAvailabilityViewModel({
      ...base,
      rules: [rule(), rule({ id: "tue", weekday: 2 })],
      timeOff: [
        // Monday 10:00–11:00 local, and all of Tuesday.
        timeOff("2030-01-07T09:00:00.000Z", "2030-01-07T10:00:00.000Z"),
        timeOff(
          "2030-01-07T23:00:00.000Z",
          "2030-01-08T23:00:00.000Z",
          "Urlop",
        ),
      ],
    });

    expect(model.preview.title).toBe("Tydzień 7–13 stycznia 2030");
    expect(model.preview.previousWeek).toBe("2029-12-31");
    expect(model.preview.nextWeek).toBe("2030-01-14");
    const [monday, tuesday] = model.preview.days;
    expect(monday).toMatchObject({ label: "pon. 7.01", isToday: true });
    expect(monday!.windows.map((one) => one.timeLabel)).toEqual([
      "09:00–10:00",
      "11:00–13:00",
    ]);
    expect(monday!.timeOff).toMatchObject([{ label: "10:00–11:00" }]);
    expect(tuesday!.windows).toEqual([]);
    expect(tuesday!.timeOff).toMatchObject([
      { label: "Cały dzień", reason: "Urlop" },
    ]);
    expect(model.preview.hoursLabel).toBe("3 h");
  });

  it("lists time off that has not ended yet", () => {
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
    expect(
      formatTimeOff(
        timeOff("2030-03-30T11:00:00.000Z", "2030-04-01T12:00:00.000Z"),
        TZ,
      ),
    ).toBe("30 marca 2030, 12:00 – 1 kwietnia 2030, 14:00");
  });
});
