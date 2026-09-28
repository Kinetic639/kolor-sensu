import { describe, expect, it } from "vitest";
import {
  copyDayTo,
  openingHoursFormSchema,
  toOpeningHoursFormValues,
  toOpeningHoursIntervals,
  type OpeningHoursFormValues,
} from "./opening-hours-form";

const hours = [
  { weekday: 1, startsAt: "08:00", endsAt: "12:00" },
  { weekday: 1, startsAt: "13:00", endsAt: "18:00" },
  { weekday: 3, startsAt: "09:00", endsAt: "17:00" },
];

describe("toOpeningHoursFormValues", () => {
  it("is the week, Monday first, closed days with a default interval", () => {
    const values = toOpeningHoursFormValues(hours);
    expect(values.days).toHaveLength(7);
    expect(values.days[0]).toEqual({
      weekday: 1,
      open: true,
      intervals: [
        { startsAt: "08:00", endsAt: "12:00" },
        { startsAt: "13:00", endsAt: "18:00" },
      ],
    });
    expect(values.days[1]).toEqual({
      weekday: 2,
      open: false,
      intervals: [{ startsAt: "08:00", endsAt: "18:00" }],
    });
  });
});

describe("toOpeningHoursIntervals", () => {
  it("keeps only the open days' intervals", () => {
    expect(toOpeningHoursIntervals(toOpeningHoursFormValues(hours))).toEqual(
      hours,
    );
  });
});

describe("openingHoursFormSchema", () => {
  function withMonday(
    intervals: OpeningHoursFormValues["days"][number]["intervals"],
  ) {
    const values = toOpeningHoursFormValues([]);
    values.days[0] = { weekday: 1, open: true, intervals };
    return values;
  }

  it("accepts a valid week", () => {
    expect(
      openingHoursFormSchema.safeParse(toOpeningHoursFormValues(hours)).success,
    ).toBe(true);
  });

  it("wants the end after the start", () => {
    const result = openingHoursFormSchema.safeParse(
      withMonday([{ startsAt: "12:00", endsAt: "08:00" }]),
    );
    expect(result.error?.issues[0]).toMatchObject({
      path: ["days", 0, "intervals", 0, "endsAt"],
      message: "Koniec musi być po początku.",
    });
  });

  it("refuses overlapping intervals on one day", () => {
    const result = openingHoursFormSchema.safeParse(
      withMonday([
        { startsAt: "08:00", endsAt: "12:00" },
        { startsAt: "11:00", endsAt: "14:00" },
      ]),
    );
    expect(result.error?.issues[0]).toMatchObject({
      path: ["days", 0, "intervals", 1, "startsAt"],
      message: "Przedziały tego dnia nakładają się.",
    });
  });

  it("ignores the hours of a closed day", () => {
    const values = toOpeningHoursFormValues([]);
    values.days[0] = {
      weekday: 1,
      open: false,
      intervals: [{ startsAt: "12:00", endsAt: "08:00" }],
    };
    expect(openingHoursFormSchema.safeParse(values).success).toBe(true);
  });

  it("wants 15-minute steps", () => {
    expect(
      openingHoursFormSchema.safeParse(
        withMonday([{ startsAt: "08:10", endsAt: "12:00" }]),
      ).success,
    ).toBe(false);
  });
});

describe("copyDayTo", () => {
  it("copies a day's hours to the given days", () => {
    const values = toOpeningHoursFormValues(hours);
    const copied = copyDayTo(values.days, 1, [2, 3, 4, 5]);
    expect(copied.slice(0, 5).map((day) => day.open)).toEqual([
      true,
      true,
      true,
      true,
      true,
    ]);
    expect(copied[4]!.intervals).toEqual(values.days[0]!.intervals);
    expect(copied[5]).toEqual(values.days[5]);
  });
});
