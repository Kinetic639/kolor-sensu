import { describe, expect, it } from "vitest";
import {
  dayNav,
  dayTimeline,
  weekVisitsByDay,
  weekSummary,
} from "./day-timeline";
import type { VisitLike } from "./visits";

const timeZone = "Europe/Warsaw";
// Friday 9 October 2026, 11:20 in Warsaw.
const now = new Date("2026-10-09T09:20:00Z");

const anna = { id: "anna", name: "Anna Kłobuchowska", color: "#c26a12" };
const michal = { id: "michal", name: "Michał Stępień", color: null };
const green = { id: "green", name: "Gabinet Zielony", color: "#1e9e57" };
const blue = { id: "blue", name: "Gabinet Niebieski", color: null };

let seq = 0;
function visit(
  start: string,
  end: string,
  over: Partial<VisitLike> = {},
): VisitLike {
  seq += 1;
  return {
    id: `v${seq}`,
    reference: `2610-0${10 + seq}`,
    status: "confirmed",
    mode: "in_person",
    startsAt: `2026-10-09T${start}:00+02:00`,
    endsAt: `2026-10-09T${end}:00+02:00`,
    serviceName: "Konsultacja psychologiczna",
    specialist: anna,
    room: green,
    locationName: "Siedziba",
    client: { name: "Ewa Nowak", email: null, phone: null, notes: null },
    priceMinor: 20000,
    currencyCode: "PLN",
    payment: { paid: true, refundDueMinor: null, refundedMinor: 0 },
    cancelledBy: null,
    rescheduleCount: 0,
    ...over,
  };
}

describe("dayTimeline", () => {
  const visits = [
    visit("08:00", "08:50"),
    visit("11:00", "11:50", {
      specialist: michal,
      client: {
        name: "Piotr Zieliński",
        email: null,
        phone: null,
        notes: null,
      },
    }),
    visit("14:00", "14:50", {
      specialist: michal,
      status: "awaiting_payment",
      paymentDueAt: "2026-10-09T13:00:00+02:00",
      payment: { paid: false, refundDueMinor: null, refundedMinor: 0 },
    }),
    visit("12:00", "12:50", { mode: "online", room: null }),
    // Cancelled: not on the day's line.
    visit("15:00", "15:50", { status: "cancelled", cancelledBy: "client" }),
  ];
  const day = dayTimeline(visits, {
    timeZone,
    now,
    date: "2026-10-09",
    rooms: [green, blue],
    specialists: [anna, michal],
  });

  it("spans the working day, 8:00–18:00, the hour marks on it", () => {
    expect(day.startHour).toBe(8);
    expect(day.endHour).toBe(18);
    expect(day.hours).toEqual([8, 9, 10, 11, 12, 13, 14, 15, 16, 17]);
    // 11:20 is a third of the way through 10 hours.
    expect(day.now).toBeCloseTo(33.33, 1);
  });

  it("a lane per room (the empty too), online after; occupancy", () => {
    expect(day.rooms.map((lane) => [lane.name, lane.cards.length])).toEqual([
      ["Gabinet Zielony", 3],
      ["Gabinet Niebieski", 0],
      ["Online", 1],
    ]);
    // 150 minutes of 600.
    expect(day.rooms[0]!.summary).toBe("3 · 25%");
    expect(day.rooms[1]!.summary).toBe("wolny");
  });

  it("a card where and how long its visit is, its state", () => {
    const [first, current, waiting] = day.rooms[0]!.cards;
    expect(first).toMatchObject({
      time: "08:00–08:50",
      left: 0,
      past: true,
      status: { label: "Minęła", tone: "neutral" },
    });
    expect(first!.width).toBeCloseTo(8.33, 1);
    // Its own price (each specialist may ask their own).
    expect(first!.price).toMatch(/^200\szł$/);
    expect(current).toMatchObject({
      clientName: "Piotr Zieliński",
      current: true,
      status: { label: "Trwa", tone: "info" },
      specialist: { name: "Michał Stępień", initials: "MS" },
    });
    expect(waiting).toMatchObject({
      awaitingPayment: true,
      status: { label: "Czeka na płatność · do 13:00", tone: "warning" },
    });
    // Just that booking, found by its number.
    expect(waiting!.href).toBe(
      `/rezerwacje?zakres=wszystkie&q=${waiting!.reference}&wizyta=${waiting!.id}`,
    );
  });

  it("a lane per person of the team, their hours", () => {
    expect(
      day.people.map((lane) => [lane.name, lane.cards.length, lane.summary]),
    ).toEqual([
      ["Anna Kłobuchowska", 2, "2 · 08:00–12:50"],
      ["Michał Stępień", 2, "2 · 11:00–14:50"],
    ]);
  });

  it("a visit outside the usual hours widens the day", () => {
    const late = dayTimeline([visit("19:00", "19:50")], {
      timeZone,
      now,
      rooms: [green],
      specialists: [anna],
    });
    expect([late.startHour, late.endHour]).toEqual([8, 20]);
  });

  it("another day than today: no now line", () => {
    const tomorrow = dayTimeline([], {
      timeZone,
      now,
      date: "2026-10-10",
      rooms: [green],
      specialists: [anna],
    });
    expect(tomorrow.now).toBeNull();
  });

  it("before or after the day, no now line", () => {
    const evening = dayTimeline([], {
      timeZone,
      now: new Date("2026-10-09T18:30:00Z"),
      rooms: [],
      specialists: [],
    });
    expect(evening.now).toBeNull();
    expect(evening.people).toEqual([]);
  });
});

describe("weekSummary", () => {
  it("this week against the last: visits, paid, cancelled", () => {
    const week = weekSummary(
      [
        visit("08:00", "08:50"),
        visit("09:00", "09:50"),
        visit("10:00", "10:50", {
          status: "cancelled",
          cancelledBy: "client",
        }),
        visit("11:00", "11:50", {
          status: "awaiting_payment",
          payment: { paid: false, refundDueMinor: null, refundedMinor: 0 },
        }),
      ],
      [visit("08:00", "08:50")],
    );
    expect(week).toEqual([
      { id: "visits", label: "Wizyty", value: "3", change: "+2", trend: "up" },
      {
        id: "paid",
        label: "Opłacone",
        value: expect.stringMatching(/^400\szł$/),
        change: "+100%",
        trend: "up",
      },
      {
        id: "cancelled",
        label: "Odwołania",
        value: "1",
        change: "+1",
        trend: "down",
      },
    ]);
  });
});

describe("weekVisitsByDay", () => {
  it("the week's visits day by day, today marked, cancelled ones left out", () => {
    const days = weekVisitsByDay(
      [
        visit("08:00", "08:50"),
        visit("09:00", "09:50", { status: "awaiting_payment" }),
        visit("10:00", "10:50", { status: "cancelled" }),
        // Late on Sunday in Warsaw, Sunday still (UTC: 21:30).
        visit("08:00", "08:50", {
          startsAt: "2026-10-11T21:30:00Z",
          endsAt: "2026-10-11T22:20:00Z",
        }),
      ],
      { timeZone, now, week: "2026-10-05" },
    );
    expect(days.map((day) => day.weekday)).toEqual([
      "Pn",
      "Wt",
      "Śr",
      "Czw",
      "Pt",
      "Sob",
      "Nd",
    ]);
    expect(days.map((day) => day.count)).toEqual([0, 0, 0, 0, 2, 0, 1]);
    expect(days.filter((day) => day.isToday).map((day) => day.date)).toEqual([
      "2026-10-09",
    ]);
  });
});

describe("dayNav", () => {
  it("the day shown, the days around it, back to today", () => {
    expect(dayNav("2026-10-09", "2026-10-09")).toEqual({
      date: "2026-10-09",
      label: "9 października",
      previous: "2026-10-08",
      next: "2026-10-10",
      isToday: true,
    });
    expect(dayNav("2026-10-12", "2026-10-09")).toMatchObject({
      label: "12 października",
      isToday: false,
    });
  });
});
