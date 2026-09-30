import { describe, expect, it } from "vitest";
import {
  calendarWindows,
  dayView,
  laneLayout,
  visitsLabel,
  weekView,
  type CalendarWindow,
} from "./calendar-view";
import type { VisitLike } from "./visits";

const timeZone = "Europe/Warsaw";
// Wednesday 2 October 2030, noon in Warsaw.
const now = new Date("2030-10-02T10:00:00Z");

const anna = { id: "anna", name: "Anna Test", color: "#5f9e8f" };
const jan = { id: "jan", name: "Jan Test", color: null };
const green = { id: "green", name: "Gabinet Zielony", color: "#7fb3a6" };
const blue = { id: "blue", name: "Gabinet Niebieski", color: null };

const windows: CalendarWindow[] = [
  {
    id: "w1",
    specialist: anna,
    room: green,
    start: new Date("2030-10-02T07:00:00Z"),
    end: new Date("2030-10-02T11:00:00Z"),
    mode: "in_person",
  },
  {
    id: "w2",
    specialist: jan,
    room: null,
    start: new Date("2030-10-02T15:00:00Z"),
    end: new Date("2030-10-02T19:30:00Z"),
    mode: "online",
  },
  {
    id: "w3",
    specialist: anna,
    room: green,
    start: new Date("2030-10-03T07:00:00Z"),
    end: new Date("2030-10-03T09:00:00Z"),
    mode: "in_person",
  },
];

const visit: VisitLike = {
  id: "v1",
  reference: "3010-001",
  status: "confirmed",
  mode: "in_person",
  startsAt: "2030-10-02T08:00:00Z",
  endsAt: "2030-10-02T08:50:00Z",
  serviceName: "Konsultacja",
  specialist: anna,
  room: green,
  locationName: "Siedziba",
  client: { name: "Jan Kowalski", email: null, phone: null, notes: null },
  priceMinor: 20000,
  currencyCode: "PLN",
  payment: null,
  cancelledBy: null,
  rescheduleCount: 0,
};
const cancelled: VisitLike = {
  ...visit,
  id: "v2",
  status: "cancelled",
  cancelledBy: "client",
  startsAt: "2030-10-02T09:00:00Z",
  endsAt: "2030-10-02T09:50:00Z",
};
const online: VisitLike = {
  ...visit,
  id: "v3",
  mode: "online",
  room: null,
  status: "awaiting_payment",
  specialist: jan,
  startsAt: "2030-10-02T16:00:00Z",
  endsAt: "2030-10-02T16:50:00Z",
  client: { ...visit.client, name: null },
};

describe("visitsLabel", () => {
  it("counts visits in Polish", () => {
    expect([0, 1, 2, 5, 12, 22].map(visitsLabel)).toEqual([
      "0 wizyt",
      "1 wizyta",
      "2 wizyty",
      "5 wizyt",
      "12 wizyt",
      "22 wizyty",
    ]);
  });
});

describe("laneLayout", () => {
  it("side by side only while overlapping", () => {
    expect(
      laneLayout([
        { start: 60, end: 120 },
        { start: 90, end: 150 },
        { start: 100, end: 110 },
        { start: 200, end: 260 },
      ]),
    ).toEqual([
      { lane: 0, lanes: 3 },
      { lane: 1, lanes: 3 },
      { lane: 2, lanes: 3 },
      { lane: 0, lanes: 1 },
    ]);
  });

  it("reuses a lane once it is free", () => {
    expect(
      laneLayout([
        { start: 0, end: 60 },
        { start: 30, end: 90 },
        { start: 60, end: 120 },
      ]),
    ).toEqual([
      { lane: 0, lanes: 2 },
      { lane: 1, lanes: 2 },
      { lane: 0, lanes: 2 },
    ]);
  });
});

describe("dayView", () => {
  const specialistsDay = () =>
    dayView({
      date: "2030-10-02",
      timeZone,
      perspective: "specialists",
      resources: [anna, jan],
      windows,
      visits: [visit, cancelled, online],
      now,
    });

  it("a column per specialist: their hours and visits, in local minutes", () => {
    const view = specialistsDay();
    expect(view.columns.map((column) => column.label)).toEqual([
      "Anna Test",
      "Jan Test",
    ]);
    const [annaColumn] = view.columns;
    expect(
      annaColumn!.blocks.map((block) => [
        block.kind,
        block.start,
        block.end,
        block.title,
      ]),
    ).toEqual([
      ["availability", 9 * 60, 13 * 60, "Gabinet Zielony"],
      ["visit", 10 * 60, 10 * 60 + 50, "Jan Kowalski"],
    ]);
    expect(annaColumn!.blocks[0]).toMatchObject({
      time: "09:00–13:00",
      label: "Dostępność 09:00–13:00, Gabinet Zielony",
      color: "#7fb3a6",
      colorSeed: "green",
    });
    expect(annaColumn!.blocks[1]).toMatchObject({
      visitId: "v1",
      subtitle: "Konsultacja",
      meta: "Gabinet Zielony",
      time: "10:00–10:50",
      pending: false,
      label:
        "Jan Kowalski, Konsultacja, 10:00–10:50, Gabinet Zielony · Siedziba",
      lane: 0,
      lanes: 1,
    });
  });

  it("sums up each column: hours, visits and how full it is", () => {
    const [annaColumn, janColumn] = specialistsDay().columns;
    expect(annaColumn).toMatchObject({
      hours: "09:00–13:00",
      visitCount: 1,
      summary: "1 wizyta · 0,8 godz. z 4 godz.",
      occupancy: 21,
    });
    expect(janColumn!.blocks[0]).toMatchObject({
      title: "Online",
      start: 17 * 60,
      end: 21 * 60 + 30,
      color: null,
      colorSeed: "online",
    });
    // Awaiting payment is shown, marked; a client without a name is "Klient".
    expect(janColumn!.blocks[1]).toMatchObject({
      title: "Klient",
      pending: true,
      meta: "Online",
    });
  });

  it("an empty column says so", () => {
    const view = dayView({
      date: "2030-10-02",
      timeZone,
      perspective: "specialists",
      resources: [{ id: "ewa", name: "Ewa", color: null }],
      windows,
      visits: [],
      now,
    });
    expect(view.columns[0]).toMatchObject({
      hours: null,
      visitCount: 0,
      occupancy: null,
      summary: "0 wizyt",
      blocks: [],
    });
  });

  it("hours from 8 to 20, widened to whole hours; the line for now", () => {
    const view = specialistsDay();
    // Jan's evening ends at 21:30.
    expect(view.range).toEqual({ start: 8 * 60, end: 22 * 60 });
    expect(view.nowMinute).toBe(12 * 60);
    expect(view.today).toBe(true);
  });

  it("no line for now on another day", () => {
    const view = dayView({
      date: "2030-10-03",
      timeZone,
      perspective: "specialists",
      resources: [anna],
      windows,
      visits: [],
      now,
    });
    expect(view.nowMinute).toBeNull();
    expect(view.today).toBe(false);
  });

  it("a column per room: who has it, and the visits in it, by specialist", () => {
    const view = dayView({
      date: "2030-10-02",
      timeZone,
      perspective: "rooms",
      resources: [green, blue],
      windows,
      visits: [visit, online],
      now,
    });
    expect(view.columns.map((column) => column.label)).toEqual([
      "Gabinet Zielony",
      "Gabinet Niebieski",
      "Online",
    ]);
    const [greenColumn, , onlineColumn] = view.columns;
    expect(
      greenColumn!.blocks.map((block) => [
        block.title,
        block.meta,
        block.colorSeed,
      ]),
    ).toEqual([
      ["Anna Test", null, "anna"],
      ["Jan Kowalski", "Anna Test", "anna"],
    ]);
    expect(onlineColumn!.blocks.map((block) => block.title)).toEqual([
      "Jan Test",
      "Klient",
    ]);
  });

  it("no online column for rooms when nothing happens online", () => {
    const view = dayView({
      date: "2030-10-03",
      timeZone,
      perspective: "rooms",
      resources: [green],
      windows,
      visits: [],
      now,
    });
    expect(view.columns.map((column) => column.label)).toEqual([
      "Gabinet Zielony",
    ]);
  });

  it("overlapping visits share the column", () => {
    const view = dayView({
      date: "2030-10-02",
      timeZone,
      perspective: "specialists",
      resources: [anna],
      windows: [],
      visits: [visit, { ...visit, id: "v4", startsAt: "2030-10-02T08:30:00Z" }],
      now,
    });
    expect(
      view.columns[0]!.blocks.map((block) => [block.lane, block.lanes]),
    ).toEqual([
      [0, 2],
      [1, 2],
    ]);
  });

  it("cuts what crosses midnight at the day's edges", () => {
    const view = dayView({
      date: "2030-10-02",
      timeZone,
      perspective: "specialists",
      resources: [anna],
      windows: [
        {
          ...windows[0]!,
          start: new Date("2030-10-02T19:00:00Z"),
          end: new Date("2030-10-03T01:00:00Z"),
        },
      ],
      visits: [],
      now,
    });
    expect(view.columns[0]!.blocks[0]).toMatchObject({
      start: 21 * 60,
      end: 24 * 60,
    });
    expect(view.range.end).toBe(24 * 60);
  });
});

describe("weekView", () => {
  it("the working days of one specialist, today marked; weekends when used", () => {
    const view = weekView({
      week: "2030-09-30",
      timeZone,
      resource: { kind: "specialist", id: "anna" },
      windows: [
        ...windows,
        {
          ...windows[0]!,
          id: "w4",
          start: new Date("2030-10-05T08:00:00Z"),
          end: new Date("2030-10-05T10:00:00Z"),
        },
      ],
      visits: [visit, online],
      now,
    });
    expect(view.columns.map((column) => column.key)).toEqual([
      "2030-09-30",
      "2030-10-01",
      "2030-10-02",
      "2030-10-03",
      "2030-10-04",
      "2030-10-05",
    ]);
    expect(view.columns[2]).toMatchObject({
      label: "Śr",
      sublabel: "2 października",
      isToday: true,
      visitCount: 1,
    });
    expect(view.columns[3]!.blocks).toHaveLength(1);
    expect(view.columns[0]!.blocks).toHaveLength(0);
    expect(view.nowMinute).toBe(12 * 60);
    expect(view.today).toBe(true);
  });

  it("a room's week holds everyone's hours in it", () => {
    const view = weekView({
      week: "2030-09-30",
      timeZone,
      resource: { kind: "room", id: "green" },
      windows,
      visits: [online],
      now,
    });
    expect(view.columns).toHaveLength(5);
    expect(view.columns[2]!.blocks.map((block) => block.title)).toEqual([
      "Anna Test",
    ]);
  });

  it("no line for now in another week", () => {
    const view = weekView({
      week: "2030-10-07",
      timeZone,
      resource: { kind: "specialist", id: "anna" },
      windows,
      visits: [],
      now,
    });
    expect(view.today).toBe(false);
    expect(view.columns.some((column) => column.isToday)).toBe(false);
  });
});

describe("calendarWindows", () => {
  const rule = {
    id: "r1",
    recurrence: "weekly" as const,
    weekdays: [3],
    intervalWeeks: 1,
    exceptions: [],
    startsAt: "09:00",
    endsAt: "13:00",
    validFrom: "2030-01-01",
    validUntil: null,
    mode: "in_person" as const,
  };

  it("everyone's rules as windows, with rooms and without time off", () => {
    const result = calendarWindows({
      specialists: [anna, jan],
      rooms: [green],
      rules: [
        { ...rule, specialistId: "anna", roomId: "green" },
        { ...rule, id: "r2", specialistId: "jan", roomId: null, mode: "online" },
        // Someone not shown.
        { ...rule, id: "r3", specialistId: "ewa", roomId: null },
      ],
      timeOff: [
        {
          specialistId: "jan",
          startsAt: "2030-10-02T00:00:00Z",
          endsAt: "2030-10-03T00:00:00Z",
        },
      ],
      from: "2030-09-30",
      to: "2030-10-06",
      timeZone,
    });
    expect(result).toEqual([
      {
        id: "r1:2030-10-02T07:00:00.000Z",
        specialist: anna,
        room: green,
        start: new Date("2030-10-02T07:00:00Z"),
        end: new Date("2030-10-02T11:00:00Z"),
        mode: "in_person",
      },
    ]);
  });
});
