import { describe, expect, it } from "vitest";
import type {
  AvailabilitySlot,
  CalendarColumn,
  CalendarPlace,
  PersonalWeekView,
  VisitSlot,
} from "./calendar-view";
import { specialistNow, upcomingVisits, weekDays } from "./specialist-week";

const green: CalendarPlace = {
  id: "green",
  name: "Gabinet Zielony",
  short: "GZ",
  color: "#1e9e57",
  online: false,
};
const online: CalendarPlace = {
  id: "online",
  name: "Online",
  short: "ONL",
  color: null,
  online: true,
};

const slot = (place: CalendarPlace): AvailabilitySlot => ({
  key: `${place.id}-slot`,
  start: 480,
  end: 960,
  time: "08:00–16:00",
  place,
  adjacentToPrevious: false,
  label: "",
});

/** A day of the week (2030-09-30 is a Monday), with its availability. */
const day = (index: number, places: CalendarPlace[]): CalendarColumn =>
  ({
    key: `day-${index}`,
    date: `2030-10-0${index}`,
    availability: places.map(slot),
  }) as CalendarColumn;

const summary: PersonalWeekView["summary"] = {
  visitCount: 3,
  occupancy: {
    visitCount: 3,
    bookedMinutes: 150,
    availableMinutes: 600,
    bookedHours: 2.5,
    availableHours: 10,
    freeHours: 7.5,
    percent: 25,
    overbooked: false,
    overMinutes: 0,
  },
  upcoming: [],
};

const at = (time: string) => {
  const [hours, minutes] = time.split(":").map(Number);
  return hours! * 60 + minutes!;
};

const visit = (
  from: string,
  to: string,
  client: string,
  place: CalendarPlace = green,
): VisitSlot =>
  ({
    key: `${client}-${from}`,
    visitId: `${client}-${from}`,
    start: at(from),
    end: at(to),
    startTime: from,
    client,
    place,
  }) as VisitSlot;

/** Thursday 3.10.2030, a shift 08:00–12:00 in the green room. */
const thursday = (visits: VisitSlot[], slots = [slot(green)]) =>
  ({
    key: "day-3",
    date: "2030-10-03",
    isToday: true,
    availability: slots.map((one) => ({
      ...one,
      start: at("08:00"),
      end: at("12:00"),
    })),
    visits,
  }) as CalendarColumn;

const viewAt = (
  time: string | null,
  column: CalendarColumn,
  upcoming: PersonalWeekView["summary"]["upcoming"] = [],
) =>
  ({
    from: "2030-09-30",
    now: time ? { minute: at(time), label: time } : null,
    columns: [column],
    summary: { ...summary, upcoming },
  }) as unknown as PersonalWeekView;

describe("weekDays", () => {
  it("all seven days, those not shown empty; shifts, hours and today", () => {
    const days = weekDays({
      from: "2030-09-30",
      columns: [
        {
          ...day(1, [green, online]),
          isToday: true,
          occupancy: {
            ...summary.occupancy,
            availableHours: 8,
            bookedHours: 6,
            percent: 75,
          },
        } as CalendarColumn,
      ],
    });
    expect(days.map((one) => [one.weekday, one.dateLabel])).toEqual([
      ["Pn", "30.9"],
      ["Wt", "1.10"],
      ["Śr", "2.10"],
      ["Czw", "3.10"],
      ["Pt", "4.10"],
      ["Sob", "5.10"],
      ["Nd", "6.10"],
    ]);
    expect(days[1]).toMatchObject({
      isToday: true,
      shifts: [
        { time: "08:00–16:00", place: green },
        { time: "08:00–16:00", place: online },
      ],
      availableHours: 8,
      bookedHours: 6,
      percent: 75,
      overbooked: false,
    });
    expect(days[0]).toMatchObject({
      isToday: false,
      shifts: [],
      availableHours: 0,
      percent: 0,
    });
  });
});

describe("specialistNow", () => {
  it("in a visit: until when and where; then what comes", () => {
    const column = thursday([
      visit("10:00", "10:50", "Ewa Nowak"),
      visit("11:00", "11:50", "Jan Lis"),
    ]);
    expect(specialistNow(viewAt("10:20", column), { active: true })).toEqual({
      tone: "busy",
      title: "Wizyta do 10:50 · Gabinet Zielony",
      detail: "Ewa Nowak · potem 11:00",
    });
    expect(
      specialistNow(
        viewAt(
          "10:20",
          thursday([visit("10:00", "10:50", "Ewa Nowak", online)]),
        ),
        { active: true },
      ),
    ).toEqual({
      tone: "busy",
      title: "Wizyta online do 10:50",
      detail: "Ewa Nowak",
    });
  });

  it("on duty and free: the next visit, or free until the shift ends", () => {
    const column = thursday([visit("11:00", "11:50", "Jan Lis")]);
    expect(specialistNow(viewAt("09:30", column), { active: true })).toEqual({
      tone: "free",
      title: "Dyżur · Gabinet Zielony · wolny",
      detail: "Następna 11:00 · Jan Lis",
    });
    expect(
      specialistNow(viewAt("09:30", thursday([])), { active: true })?.detail,
    ).toBe("Bez wizyt do 12:00");
  });

  it("later today: from when and where, and how many visits", () => {
    const column = thursday([
      visit("09:00", "09:50", "Ewa Nowak"),
      visit("11:00", "11:50", "Jan Lis"),
    ]);
    expect(specialistNow(viewAt("07:00", column), { active: true })).toEqual({
      tone: "later",
      title: "Dziś od 08:00 · Gabinet Zielony",
      detail: "2 wizyty dziś",
    });
  });

  it("done or off today: the next visit ahead", () => {
    const next = {
      visitId: "v9",
      day: "Pt, 4 paź",
      startTime: "10:00",
      client: "Jan Lis",
    } as PersonalWeekView["summary"]["upcoming"][number];
    expect(
      specialistNow(viewAt("13:00", thursday([]), [next]), { active: true }),
    ).toEqual({
      tone: "off",
      title: "Dziś już po dyżurze",
      detail: "Następna Pt, 4 paź, 10:00 · Jan Lis",
    });
    expect(
      specialistNow(viewAt("13:00", thursday([], [])), { active: true }),
    ).toEqual({
      tone: "off",
      title: "Dziś wolne",
      detail: "Brak zaplanowanych wizyt",
    });
  });

  it("not working with the centre; another week: nothing to say", () => {
    expect(
      specialistNow(viewAt("10:00", thursday([])), { active: false }),
    ).toEqual({ tone: "off", title: "Nieaktywny", detail: null });
    expect(
      specialistNow(viewAt(null, thursday([])), { active: true }),
    ).toBeNull();
  });
});

describe("upcomingVisits", () => {
  it("each with its day, time, who, what, where and payment", () => {
    const [row] = upcomingVisits({
      summary: {
        ...summary,
        upcoming: [
          {
            ...visit("13:00", "13:50", "Piotr Zieliński"),
            date: "2030-10-03",
            day: "Czw, 3 paź",
            time: "13:00 – 13:50",
            service: "Terapia dla par",
            pending: true,
          },
        ] as PersonalWeekView["summary"]["upcoming"],
      },
    });
    expect(row).toEqual({
      visitId: "Piotr Zieliński-13:00",
      date: "2030-10-03",
      dateLabel: "Czw 3.10",
      time: "13:00 – 13:50",
      startTime: "13:00",
      client: "Piotr Zieliński",
      service: "Terapia dla par",
      place: green,
      pending: true,
    });
  });
});
