import { describe, expect, it } from "vitest";
import type {
  CalendarPerson,
  CalendarRoom,
  CalendarWindow,
} from "./calendar-view";
import { openDaysOnly, roomWeeks } from "./room-week";
import type { VisitLike } from "./visits";

const timeZone = "Europe/Warsaw";
// 2030-09-30 is a Monday; Thursday 3 October, 10:20 in Warsaw.
const at = (day: string, time: string) =>
  new Date(`2030-${day}T${time}:00+02:00`);
const now = at("10-03", "10:20");

const anna: CalendarPerson = {
  id: "anna",
  name: "Anna Nowak",
  title: null,
  avatarUrl: null,
  color: "#c26a12",
};
const jan: CalendarPerson = {
  id: "jan",
  name: "Jan Lis",
  title: null,
  avatarUrl: null,
  color: null,
};

const weekdays = [1, 2, 3, 4, 5].map((weekday) => ({
  weekday,
  startsAt: "08:00",
  endsAt: "20:00",
}));
const green: CalendarRoom = {
  id: "green",
  name: "Gabinet Zielony",
  color: "#1e9e57",
  locationId: "loc",
  hours: weekdays,
  exceptions: [],
};
const blue: CalendarRoom = {
  id: "blue",
  name: "Gabinet Niebieski",
  color: "#2563d9",
  locationId: "loc",
  hours: weekdays,
  exceptions: [
    {
      date: "2030-10-03",
      type: "closed_all_day",
      startsAt: null,
      endsAt: null,
      reason: "Malowanie",
    },
  ],
};

const window = (
  id: string,
  specialistId: string,
  day: string,
  from: string,
  to: string,
): CalendarWindow => ({
  id,
  specialistId,
  placeId: "green",
  start: at(day, from),
  end: at(day, to),
});

const visit = (from: string, to: string, client: string): VisitLike =>
  ({
    id: `v-${from}`,
    reference: "3010-001",
    status: "confirmed",
    mode: "in_person",
    startsAt: at("10-03", from).toISOString(),
    endsAt: at("10-03", to).toISOString(),
    serviceName: "Psychoterapia",
    specialist: { id: "anna", name: "Anna Nowak", color: "#c26a12" },
    room: { id: "green", name: "Gabinet Zielony", color: "#1e9e57" },
    locationName: "Siedziba",
    client: { name: client, email: null, phone: null, notes: null },
    priceMinor: 20000,
    currencyCode: "PLN",
    payment: null,
    cancelledBy: null,
    rescheduleCount: 0,
  }) as VisitLike;

const input = (time: Date, visits: VisitLike[]) => ({
  timeZone,
  now: time,
  people: [anna, jan],
  rooms: [green, blue],
  windows: [
    window("w1", "anna", "09-30", "09:00", "11:00"),
    window("w2", "anna", "10-03", "08:00", "12:00"),
    window("w3", "jan", "10-03", "14:00", "17:00"),
  ],
  timeOff: [],
  visits,
  week: "2030-09-30",
});

describe("roomWeeks", () => {
  it("seven days: open hours, closed days, how booked", () => {
    const weeks = roomWeeks(
      input(now, [visit("10:00", "10:50", "Ewa Kowalska")]),
    );
    const greenWeek = weeks.get("green")!;
    expect(greenWeek.days.map((day) => day.weekday)).toEqual([
      "Pn",
      "Wt",
      "Śr",
      "Czw",
      "Pt",
      "Sob",
      "Nd",
    ]);
    expect(greenWeek.days[3]).toMatchObject({
      isToday: true,
      hours: "08:00 – 20:00",
      closed: null,
      availableHours: 12,
      bookedHours: 0.8,
    });
    expect(greenWeek.days[5]).toMatchObject({ hours: null, closed: null });
    expect(weeks.get("blue")!.days[3]).toMatchObject({ closed: "Malowanie" });
    expect(greenWeek.occupancy.visitCount).toBe(1);
  });

  it("today: who is on duty when, the visits, now", () => {
    const today = roomWeeks(
      input(now, [visit("10:00", "10:50", "Ewa Kowalska")]),
    ).get("green")!.today!;
    expect(today.range).toEqual({ start: 8 * 60, end: 20 * 60 });
    expect(today.now).toBe(10 * 60 + 20);
    expect(today.duties.map((one) => [one.person.name, one.time])).toEqual([
      ["Anna Nowak", "08:00–12:00"],
      ["Jan Lis", "14:00–17:00"],
    ]);
    expect(today.visits).toEqual([
      expect.objectContaining({
        start: 600,
        end: 650,
        client: "Ewa Kowalska",
        person: expect.objectContaining({
          name: "Anna Nowak",
          color: "#c26a12",
        }),
      }),
    ]);
  });

  it("now: in a visit, on duty and free, free until someone comes, closed", () => {
    const status = (time: Date, visits: VisitLike[] = []) =>
      roomWeeks(input(time, visits)).get("green")!.now;
    expect(
      status(now, [
        visit("10:00", "10:50", "Ewa Kowalska"),
        visit("11:00", "11:50", "Jan K"),
      ]),
    ).toEqual({
      tone: "busy",
      title: "Wizyta do 10:50 · Anna Nowak",
      detail: "Potem 11:00 · Anna Nowak",
    });
    expect(status(now)).toEqual({
      tone: "free",
      title: "Dyżur: Anna Nowak · wolny",
      detail: "Bez wizyt do 12:00",
    });
    expect(status(at("10-03", "12:30"))).toEqual({
      tone: "later",
      title: "Wolny do 14:00",
      detail: "14:00 Jan Lis",
    });
    expect(status(at("10-03", "18:00"))).toEqual({
      tone: "off",
      title: "Dziś już bez dyżurów",
      detail: null,
    });
    expect(roomWeeks(input(now, [])).get("blue")!.now).toEqual({
      tone: "off",
      title: "Zamknięty dziś",
      detail: "Malowanie",
    });
  });

  it("who uses the room this week, the most hours first", () => {
    expect(
      roomWeeks(input(now, []))
        .get("green")!
        .users.map((one) => [one.person.name, one.days, one.hours]),
    ).toEqual([
      ["Anna Nowak", "Pn, Czw", 6],
      ["Jan Lis", "Czw", 3],
    ]);
  });

  it("the schedule: a column a day, the duties as available time, in their colours", () => {
    const { schedule } = roomWeeks(
      input(now, [visit("10:00", "10:50", "Ewa Kowalska")]),
    ).get("green")!;
    // A key a day: the calendar draws the columns by their keys.
    const keys = schedule.columns.map((one) => one.key);
    expect(new Set(keys).size).toBe(keys.length);
    expect(schedule.columns.map((one) => [one.title, one.subtitle])).toEqual([
      ["Pon", "30 września"],
      ["Wt", "1 października"],
      ["Śr", "2 października"],
      ["Czw", "3 października"],
      ["Pt", "4 października"],
    ]);
    const thursday = schedule.columns[3]!;
    expect(
      thursday.availability.map((one) => [
        one.time,
        one.place.name,
        one.place.color,
      ]),
    ).toEqual([
      ["08:00–12:00", "Anna Nowak", "#c26a12"],
      ["14:00–17:00", "Jan Lis", null],
    ]);
    expect(thursday.visits.map((one) => one.client)).toEqual(["Ewa Kowalska"]);
    expect(schedule.range).toEqual({ start: 7 * 60 + 30, end: 20 * 60 + 30 });
    expect(schedule.now?.minute).toBe(10 * 60 + 20);
    // A room closed that day: the column says why.
    const blueThursday = roomWeeks(input(now, []))
      .get("blue")!
      .schedule.columns.find((one) => one.date === "2030-10-03")!;
    expect(blueThursday.closed).toBe("Malowanie");
    // No opening hours that day (Sunday, shown as today): closed too.
    const sunday = roomWeeks(input(at("10-06", "10:20"), []))
      .get("green")!
      .schedule.columns.find((one) => one.date === "2030-10-06")!;
    expect(sunday.closed).toBe("Gabinet zamknięty");
  });

  it("a day without opening hours: closed, the line hatched", () => {
    // Sunday 6 October.
    const sunday = roomWeeks(input(at("10-06", "10:20"), [])).get("green")!;
    expect(sunday.today!.closed).toBe("Gabinet zamknięty");
    expect(sunday.now).toEqual({
      tone: "off",
      title: "Zamknięty dziś",
      detail: null,
    });
  });

  it("another week: no today, nothing to say about now", () => {
    const week = roomWeeks({ ...input(now, []), week: "2030-10-07" }).get(
      "green",
    )!;
    expect(week.today).toBeNull();
    expect(week.now).toBeNull();
  });

  it("the schedule without the closed days, on request", () => {
    const { schedule } = roomWeeks(input(at("10-06", "10:20"), [])).get(
      "green",
    )!;
    expect(schedule.columns.some((one) => one.closed)).toBe(true);
    const open = openDaysOnly(schedule);
    expect(open.columns.map((one) => one.title)).toEqual([
      "Pon",
      "Wt",
      "Śr",
      "Czw",
      "Pt",
    ]);
    expect(open.range).toEqual(schedule.range);
  });
});
