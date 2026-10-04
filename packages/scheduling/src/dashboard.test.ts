import { describe, expect, it } from "vitest";
import {
  awaitingPaymentSummary,
  owedInAll,
  roomsToday,
  settlementView,
  teamToday,
  todayCounts,
  todayVisitItems,
  type SettlementLike,
} from "./dashboard";
import type { VisitLike } from "./visits";

const timeZone = "Europe/Warsaw";

function visit(overrides: Partial<VisitLike> = {}): VisitLike {
  return {
    id: "v1",
    reference: "2610-001",
    status: "confirmed",
    mode: "in_person",
    startsAt: "2026-10-02T07:00:00+00:00",
    endsAt: "2026-10-02T07:50:00+00:00",
    serviceName: "Konsultacja",
    specialist: { id: "s1", name: "Michał Stępień", color: null },
    room: { id: "r1", name: "Gabinet Zielony", color: null },
    locationName: "Siedziba Główna",
    client: { name: "Jan Kowalski", email: null, phone: null, notes: null },
    priceMinor: 20000,
    currencyCode: "PLN",
    payment: null,
    cancelledBy: null,
    rescheduleCount: 0,
    paymentDueAt: null,
    ...overrides,
  };
}

const today = [
  visit({
    id: "v2",
    startsAt: "2026-10-02T10:00:00+00:00",
    endsAt: "2026-10-02T10:50:00+00:00",
    mode: "online",
    room: null,
    status: "awaiting_payment",
    client: { name: "Ewa Nowak", email: null, phone: null, notes: null },
  }),
  visit(),
  visit({ id: "v3", status: "cancelled", cancelledBy: "client" }),
  visit({
    id: "v4",
    startsAt: "2026-10-02T08:00:00+00:00",
    endsAt: "2026-10-02T08:50:00+00:00",
    specialist: { id: "s2", name: "Anna Kłobuchowska", color: null },
    room: { id: "r2", name: "Gabinet Błękitny", color: null },
  }),
];

describe("todayVisitItems", () => {
  it("the visits that take place, by time, each linking to the calendar", () => {
    const items = todayVisitItems(today, { timeZone });
    expect(items.map((item) => item.id)).toEqual(["v1", "v4", "v2"]);
    expect(items[0]).toEqual({
      id: "v1",
      time: "09:00",
      duration: "50 min",
      clientName: "Jan Kowalski",
      service: "Konsultacja · Michał Stępień",
      location: "Gabinet Zielony",
      status: "Opłacona",
      statusTone: "success",
      href: "/kalendarz?data=2026-10-02&wizyta=v1",
    });
    expect(items[2]).toMatchObject({
      location: "Online",
      status: "Czeka na płatność",
      statusTone: "warning",
    });
  });
});

describe("todayCounts", () => {
  it("paid and waiting; cancelled ones do not count", () => {
    expect(todayCounts(today)).toEqual({
      total: 3,
      paid: 2,
      awaitingPayment: 1,
    });
  });
});

describe("roomsToday and teamToday", () => {
  it("each room's visits in person, from first to last", () => {
    expect(roomsToday(today, { timeZone })).toEqual([
      {
        id: "r2",
        title: "Gabinet Błękitny",
        description: "10:00–10:50",
        value: "1 wizyta",
        tone: "info",
      },
      {
        id: "r1",
        title: "Gabinet Zielony",
        description: "09:00–09:50",
        value: "1 wizyta",
        tone: "info",
      },
    ]);
  });

  it("each specialist's day, with how many online", () => {
    expect(teamToday(today, { timeZone })).toEqual([
      {
        id: "s2",
        title: "Anna Kłobuchowska",
        description: "10:00–10:50",
        value: "1 wizyta",
        tone: "success",
      },
      {
        id: "s1",
        title: "Michał Stępień",
        description: "09:00–12:50 · online: 1",
        value: "2 wizyty",
        tone: "success",
      },
    ]);
  });
});

describe("awaitingPaymentSummary", () => {
  const now = new Date("2026-10-02T06:00:00+00:00");
  it("how many wait, the next due, and those due within a day", () => {
    const summary = awaitingPaymentSummary(
      [
        visit({
          id: "a",
          status: "awaiting_payment",
          paymentDueAt: "2026-10-04T08:00:00+00:00",
        }),
        visit({
          id: "b",
          status: "awaiting_payment",
          paymentDueAt: "2026-10-02T18:00:00+00:00",
        }),
        visit({
          id: "c",
          status: "awaiting_payment",
          paymentDueAt: "2026-10-01T18:00:00+00:00",
        }),
        visit({ id: "d", status: "awaiting_payment", paymentDueAt: null }),
      ],
      { timeZone, now },
    );
    expect(summary.count).toBe(2);
    expect(summary.nextDue).toBe("02.10, 20:00");
    expect(summary.dueSoon.map((v) => v.id)).toEqual(["b"]);
  });

  it("none waiting", () => {
    expect(awaitingPaymentSummary([], { timeZone, now })).toEqual({
      count: 0,
      nextDue: null,
      dueSoon: [],
    });
  });
});

describe("settlementView", () => {
  const owed: SettlementLike = {
    appointmentId: "v9",
    reference: "2610-004",
    kind: "refund_owed",
    startsAt: "2026-10-03T09:00:00+00:00",
    client: { name: "Jan Kowalski", email: null, phone: null },
    serviceName: "Konsultacja",
    owedMinor: 5050,
    currencyCode: "PLN",
    since: "2026-10-01T20:00:00+00:00",
  };

  it("what is owed, to whom, since when; a link to the visit", () => {
    const view = settlementView(owed, { timeZone });
    expect(view).toMatchObject({
      id: "v9",
      reference: "2610-004",
      title: "Zwrot nie doszedł do skutku",
      description: "Jan Kowalski · 2610-004 · sob. 03.10, 11:00 · od 01.10",
      owedMinor: 5050,
      clientName: "Jan Kowalski",
      // Among all the bookings, found by its number (not only upcoming).
      href: "/rezerwacje?zakres=wszystkie&q=2610-004&wizyta=v9",
    });
    expect(view.owed).toMatch(/^50,50\s?zł$/);
    expect(
      settlementView({ ...owed, kind: "paid_without_visit" }, { timeZone })
        .title,
    ).toBe("Płatność bez wizyty");
  });

  it("owed in all", () => {
    expect(owedInAll([owed, { ...owed, owedMinor: 4950 }])).toMatch(
      /^100\s?zł$/,
    );
    expect(owedInAll([])).toMatch(/^0\s?zł$/);
  });
});
