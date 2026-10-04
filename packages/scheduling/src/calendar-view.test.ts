import { describe, expect, it } from "vitest";
import {
  calendarWindows,
  dayView,
  findAvailability,
  moveVisitDefaults,
  newVisitDefaults,
  occupancyOf,
  personalWeek,
  placeShort,
  scheduleRange,
  visitsLabel,
  weekComparison,
  type CalendarPerson,
  type CalendarRoom,
  type CalendarTimeOff,
  type CalendarWindow,
} from "./calendar-view";
import type { VisitLike } from "./visits";

const timeZone = "Europe/Warsaw";
// Wednesday 2 October 2030, 12:37 in Warsaw.
const now = new Date("2030-10-02T10:37:00Z");
const at = (day: number, time: string) =>
  new Date(`2030-10-0${day}T${time}:00+02:00`);

const anna: CalendarPerson = {
  id: "anna",
  name: "Anna Nowak",
  title: "Psychoterapeutka CBT",
  avatarUrl: "https://example.com/anna.jpg",
  color: "#5f9e8f",
};
const jan: CalendarPerson = {
  id: "jan",
  name: "Jan Lis",
  title: null,
  avatarUrl: null,
  color: null,
};
const ewa: CalendarPerson = {
  id: "ewa",
  name: "Ewa Wójcik",
  title: "Psycholożka",
  avatarUrl: null,
  color: null,
};
const green: CalendarRoom = {
  id: "green",
  name: "Gabinet 1",
  color: "#286e4d",
  locationId: "loc",
  hours: [{ weekday: 3, startsAt: "08:00", endsAt: "18:00" }],
  exceptions: [],
};
const blue: CalendarRoom = {
  id: "blue",
  name: "Gabinet Niebieski",
  color: null,
  locationId: "loc",
  hours: [],
  exceptions: [
    {
      date: "2030-10-02",
      type: "closed_all_day",
      startsAt: null,
      endsAt: null,
      reason: "Remont",
    },
  ],
};

const windows: CalendarWindow[] = [
  {
    id: "w1",
    specialistId: "anna",
    placeId: "green",
    start: at(2, "08:00"),
    end: at(2, "12:00"),
  },
  {
    id: "w2",
    specialistId: "anna",
    placeId: "online",
    start: at(2, "12:00"),
    end: at(2, "14:00"),
  },
  {
    id: "w3",
    specialistId: "jan",
    placeId: "green",
    start: at(2, "14:00"),
    end: at(2, "17:00"),
  },
  {
    id: "w4",
    specialistId: "anna",
    placeId: "green",
    start: at(3, "09:00"),
    end: at(3, "11:00"),
  },
];
const timeOff: CalendarTimeOff[] = [
  {
    specialistId: "jan",
    start: at(2, "17:00"),
    end: at(2, "18:00"),
    reason: "Szkolenie",
  },
];

const visit = (patch: Partial<VisitLike>): VisitLike => ({
  id: "v1",
  reference: "3010-001",
  status: "confirmed",
  mode: "in_person",
  startsAt: at(2, "09:00").toISOString(),
  endsAt: at(2, "10:30").toISOString(),
  serviceName: "Psychoterapia",
  specialist: { id: "anna", name: "Anna Nowak", color: null },
  room: { id: "green", name: "Gabinet 1", color: "#286e4d" },
  locationName: "Siedziba",
  client: { name: "Ewa Kowalska", email: null, phone: null, notes: null },
  priceMinor: 20000,
  currencyCode: "PLN",
  payment: null,
  cancelledBy: null,
  rescheduleCount: 0,
  ...patch,
});
const visits: VisitLike[] = [
  visit({}),
  visit({
    id: "v2",
    mode: "online",
    room: null,
    status: "awaiting_payment",
    startsAt: at(2, "12:30").toISOString(),
    endsAt: at(2, "13:00").toISOString(),
    client: { name: "Piotr Zieliński", email: null, phone: null, notes: null },
  }),
  visit({ id: "v3", status: "cancelled", cancelledBy: "client" }),
];

const base = {
  timeZone,
  people: [anna, jan, ewa],
  rooms: [green, blue],
  windows,
  timeOff,
  visits,
  now,
};

describe("helpers", () => {
  it("counts visits in Polish", () => {
    expect([0, 1, 2, 5, 22].map(visitsLabel)).toEqual([
      "0 wizyt",
      "1 wizyta",
      "2 wizyty",
      "5 wizyt",
      "22 wizyty",
    ]);
  });

  it("shortens room names as the reference does", () => {
    expect(
      ["Gabinet 1", "Gabinet Zielony", "Sala warsztatowa", "Online"].map(
        placeShort,
      ),
    ).toEqual(["G1", "GZ", "SW", "ONL"]);
  });

  it("occupancy: booked over available, over 100% is overbooking", () => {
    expect(
      occupancyOf([{ start: 0, end: 90 }], [{ start: 0, end: 240 }]),
    ).toEqual({
      visitCount: 1,
      bookedMinutes: 90,
      availableMinutes: 240,
      bookedHours: 1.5,
      availableHours: 4,
      freeHours: 2.5,
      percent: 38,
      overbooked: false,
      overMinutes: 0,
    });
    expect(
      occupancyOf([{ start: 0, end: 390 }], [{ start: 0, end: 360 }]),
    ).toMatchObject({ percent: 108, overbooked: true, overMinutes: 30 });
    expect(occupancyOf([{ start: 0, end: 60 }], [])).toMatchObject({
      percent: 100,
      overbooked: true,
    });
    expect(occupancyOf([], [])).toMatchObject({ percent: 0 });
  });

  it("shows half an hour around what there is, else 8 to 18", () => {
    expect(scheduleRange([{ start: 9 * 60, end: 17 * 60 }])).toEqual({
      start: 8 * 60 + 30,
      end: 17 * 60 + 30,
    });
    expect(scheduleRange([])).toEqual({ start: 8 * 60, end: 18 * 60 });
  });
});

describe("calendarWindows", () => {
  it("expands rules, cuts time off out and keeps it as blocked time", () => {
    const rule = {
      id: "r",
      specialistId: "jan",
      recurrence: "weekly" as const,
      weekdays: [3],
      intervalWeeks: 1,
      exceptions: [],
      startsAt: "14:00",
      endsAt: "18:00",
      validFrom: "2030-01-01",
      validUntil: null,
      mode: "in_person" as const,
      roomId: "green",
    };
    const result = calendarWindows({
      specialistIds: ["jan"],
      rules: [rule, { ...rule, id: "x", specialistId: "nobody" }],
      timeOff: [
        {
          specialistId: "jan",
          startsAt: at(2, "17:00").toISOString(),
          endsAt: at(2, "20:00").toISOString(),
          reason: null,
        },
      ],
      from: "2030-10-02",
      to: "2030-10-02",
      timeZone,
    });
    expect(result.windows).toEqual([
      {
        id: "r:2030-10-02T12:00:00.000Z",
        specialistId: "jan",
        placeId: "green",
        start: at(2, "14:00"),
        end: at(2, "17:00"),
      },
    ]);
    // Only where they would have worked.
    expect(result.timeOff).toEqual([
      {
        specialistId: "jan",
        start: at(2, "17:00"),
        end: at(2, "18:00"),
        reason: null,
      },
    ]);
  });
});

describe("dayView by specialist", () => {
  const view = dayView({
    ...base,
    date: "2030-10-02",
    perspective: "specialists",
  });
  const [annaColumn, janColumn, ewaColumn] = view.columns;

  it("a column per specialist, their day summed up", () => {
    expect(annaColumn).toMatchObject({
      key: "anna",
      kind: "specialist",
      title: "Anna Nowak",
      subtitle: "Psychoterapeutka CBT",
      avatarUrl: "https://example.com/anna.jpg",
      initials: "AN",
      hours: "08:00 – 14:00",
      unavailable: false,
      closed: null,
      occupancy: {
        visitCount: 2,
        percent: 33,
        bookedHours: 2,
        availableHours: 6,
      },
    });
    expect(ewaColumn).toMatchObject({
      hours: null,
      unavailable: true,
      occupancy: { percent: 0, visitCount: 0 },
    });
  });

  it("availability wears its room's colour, with the boundary chip text", () => {
    expect(annaColumn!.availability).toEqual([
      expect.objectContaining({
        start: 8 * 60,
        end: 12 * 60,
        time: "08:00–12:00",
        place: expect.objectContaining({
          id: "green",
          name: "Gabinet 1",
          short: "G1",
        }),
        adjacentToPrevious: false,
        label: "Dostępność 08:00–12:00, Gabinet 1",
      }),
      expect.objectContaining({
        start: 12 * 60,
        place: expect.objectContaining({ id: "online", online: true }),
        adjacentToPrevious: true,
      }),
    ]);
  });

  it("visits: time, client, service, place; not cancelled ones", () => {
    expect(annaColumn!.visits).toEqual([
      expect.objectContaining({
        visitId: "v1",
        start: 9 * 60,
        end: 10 * 60 + 30,
        minutes: 90,
        time: "09:00 – 10:30",
        startTime: "09:00",
        client: "Ewa Kowalska",
        clientInitials: "EK",
        service: "Psychoterapia",
        place: expect.objectContaining({ id: "green" }),
        person: expect.objectContaining({ id: "anna", initials: "AN" }),
        pending: false,
        dimmed: false,
      }),
      expect.objectContaining({
        visitId: "v2",
        pending: true,
        place: expect.objectContaining({ id: "online" }),
        label:
          "Piotr Zieliński, Psychoterapia, 12:30 – 13:00, Online, czeka na płatność",
      }),
    ]);
  });

  it("a visit holds the time after it too: drawn to its end", () => {
    const held = dayView({
      ...base,
      date: "2030-10-02",
      perspective: "specialists",
      visits: [visit({ heldUntil: at(2, "10:40").toISOString() })],
    });
    expect(held.columns[0]!.visits[0]).toMatchObject({
      end: 10 * 60 + 30,
      heldEnd: 10 * 60 + 40,
      minutes: 90,
    });
    // Without it known: the visit's own end.
    expect(annaColumn!.visits[1]!.heldEnd).toBe(annaColumn!.visits[1]!.end);
    // The day's occupancy counts all the time it holds (100 min, not 90).
    expect(held.columns[0]!.occupancy.bookedHours).toBeCloseTo(100 / 60, 1);
  });

  it("time off is blocked time", () => {
    expect(janColumn!.blocked).toEqual([
      expect.objectContaining({
        start: 17 * 60,
        end: 18 * 60,
        time: "17:00 – 18:00",
        label: "Szkolenie",
      }),
    ]);
  });

  it("the range around everything, and now on today", () => {
    expect(view.range).toEqual({ start: 7 * 60 + 30, end: 18 * 60 + 30 });
    expect(view.now).toEqual({ minute: 12 * 60 + 37, label: "12:37" });
  });

  it("hides empty columns when asked", () => {
    expect(
      dayView({
        ...base,
        date: "2030-10-02",
        perspective: "specialists",
        hideEmpty: true,
      }).columns.map((column) => column.key),
    ).toEqual(["anna", "jan"]);
  });

  it("dims visits that do not match the search", () => {
    const searched = dayView({
      ...base,
      date: "2030-10-02",
      perspective: "specialists",
      query: "piotr",
    });
    expect(searched.columns[0]!.visits.map((one) => one.dimmed)).toEqual([
      true,
      false,
    ]);
  });

  it("no now on another day", () => {
    expect(
      dayView({ ...base, date: "2030-10-03", perspective: "specialists" }).now,
    ).toBeNull();
  });
});

describe("dayView by room", () => {
  const view = dayView({ ...base, date: "2030-10-02", perspective: "rooms" });
  const [greenColumn, blueColumn, onlineColumn] = view.columns;

  it("a room is available in its opening hours, with who is in it", () => {
    expect(greenColumn).toMatchObject({
      kind: "room",
      title: "Gabinet 1",
      short: "G1",
      hours: "08:00 – 18:00",
      closed: null,
      occupancy: { visitCount: 1, availableHours: 10 },
    });
    expect(greenColumn!.availability).toEqual([
      expect.objectContaining({
        start: 8 * 60,
        end: 18 * 60,
        time: "08:00–18:00",
      }),
    ]);
    expect(greenColumn!.visits[0]).toMatchObject({
      person: expect.objectContaining({ name: "Anna Nowak" }),
    });
  });

  it("a room closed all day says why", () => {
    expect(blueColumn).toMatchObject({
      closed: "Remont",
      unavailable: true,
      availability: [],
    });
  });

  it("online work has a column of its own", () => {
    expect(onlineColumn).toMatchObject({ kind: "online", title: "Online" });
    expect(onlineColumn!.availability).toHaveLength(1);
    expect(onlineColumn!.visits.map((one) => one.visitId)).toEqual(["v2"]);
  });
});

describe("weekComparison", () => {
  const view = weekComparison({
    ...base,
    week: "2030-09-30",
    perspective: "specialists",
  });

  it("the working days, a lane per specialist in each", () => {
    expect(view.days.map((day) => day.label)).toEqual([
      "Pon, 30",
      "Wt, 1",
      "Śr, 2",
      "Czw, 3",
      "Pt, 4",
    ]);
    const wednesday = view.days[2]!;
    expect(wednesday).toMatchObject({ date: "2030-10-02", isToday: true });
    expect(wednesday.lanes.map((lane) => lane.key)).toEqual([
      "anna",
      "jan",
      "ewa",
    ]);
    expect(wednesday.occupancy.visitCount).toBe(2);
    expect(view.now).toEqual({ minute: 12 * 60 + 37, label: "12:37" });
  });

  it("sums up the week per specialist, with the extremes", () => {
    expect(view.summary).toMatchObject({
      visitCount: 2,
      occupancy: { bookedHours: 2, availableHours: 11 },
      highest: { id: "anna", percent: 25 },
      lowest: { id: "jan", percent: 0 },
    });
    expect(view.summary.items.map((item) => item.id)).toEqual([
      "anna",
      "jan",
      "ewa",
    ]);
  });

  it("hides empty lanes per day", () => {
    const hidden = weekComparison({
      ...base,
      week: "2030-09-30",
      perspective: "specialists",
      hideEmpty: true,
    });
    expect(hidden.days[2]!.lanes.map((lane) => lane.key)).toEqual([
      "anna",
      "jan",
    ]);
    expect(hidden.days[0]!.lanes).toEqual([]);
  });
});

describe("personalWeek", () => {
  it("a specialist's own days, and their week summed up", () => {
    const view = personalWeek({
      ...base,
      week: "2030-09-30",
      person: anna,
    });
    expect(
      view.columns.map((column) => [column.title, column.subtitle]),
    ).toEqual([
      ["Pon", "30 września"],
      ["Wt", "1 października"],
      ["Śr", "2 października"],
      ["Czw", "3 października"],
      ["Pt", "4 października"],
    ]);
    expect(view.columns[2]).toMatchObject({ kind: "day", isToday: true });
    expect(
      personalWeek({
        ...base,
        week: "2030-09-30",
        person: anna,
        hideEmpty: true,
      }).columns.map((column) => column.title),
    ).toEqual(["Śr", "Czw"]);
    // Not finished yet: the one going on now.
    expect(view.summary).toMatchObject({
      visitCount: 2,
      occupancy: { availableHours: 8 },
      upcoming: [
        expect.objectContaining({
          visitId: "v2",
          day: "Śr, 2 paź",
          date: "2030-10-02",
        }),
      ],
    });
  });
});

describe("findAvailability", () => {
  it("finds a shown window and its column", () => {
    const view = dayView({
      ...base,
      date: "2030-10-02",
      perspective: "specialists",
    });
    const key = view.columns[0]!.availability[0]!.key;
    expect(findAvailability(view.columns, key)).toMatchObject({
      slot: { time: "08:00–12:00" },
      column: { key: "anna" },
    });
    expect(findAvailability(view.columns, "nope")).toBeNull();
    expect(findAvailability(view.columns, null)).toBeNull();
  });
});

describe("newVisitDefaults", () => {
  const day = dayView({
    ...base,
    date: "2030-10-02",
    perspective: "specialists",
  });
  const rooms = dayView({ ...base, date: "2030-10-02", perspective: "rooms" });

  it("in a specialist's column: them, and the room of their window then", () => {
    expect(newVisitDefaults(day.columns, "anna", "2030-10-02T09:30")).toEqual({
      specialistId: "anna",
      date: "2030-10-02",
      time: "09:30",
      mode: "in_person",
      roomId: "green",
    });
    // Her online window after noon.
    expect(
      newVisitDefaults(day.columns, "anna", "2030-10-02T12:30"),
    ).toMatchObject({
      mode: "online",
      roomId: null,
    });
    // Outside her hours: nothing assumed about where.
    expect(
      newVisitDefaults(day.columns, "anna", "2030-10-02T19:00"),
    ).toMatchObject({
      specialistId: "anna",
      mode: null,
      roomId: null,
    });
  });

  it("in a room's column: the room; online in the online one", () => {
    expect(
      newVisitDefaults(rooms.columns, "green", "2030-10-02T10:00"),
    ).toEqual({
      specialistId: null,
      date: "2030-10-02",
      time: "10:00",
      mode: "in_person",
      roomId: "green",
    });
    expect(
      newVisitDefaults(rooms.columns, "online", "2030-10-02T12:00"),
    ).toMatchObject({
      mode: "online",
      roomId: null,
    });
  });

  it("without a column (the form opened by hand): only the time", () => {
    expect(newVisitDefaults([], null, "2030-10-02T09:00")).toEqual({
      specialistId: null,
      date: "2030-10-02",
      time: "09:00",
      mode: null,
      roomId: null,
    });
  });
});

describe("moveVisitDefaults (R12)", () => {
  const rooms = dayView({ ...base, date: "2030-10-02", perspective: "rooms" });
  const visit = { mode: "online" as const, roomId: null };

  it("a room picked: that room, in person", () => {
    expect(
      moveVisitDefaults(rooms.columns, "green", "2030-10-02T15:00", visit),
    ).toEqual({
      date: "2030-10-02",
      time: "15:00",
      mode: "in_person",
      roomId: "green",
    });
  });

  it("nothing said about where: where the visit was", () => {
    expect(moveVisitDefaults([], null, "2030-10-03T09:00", visit)).toEqual({
      date: "2030-10-03",
      time: "09:00",
      mode: "online",
      roomId: null,
    });
  });
});
