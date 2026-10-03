import { describe, expect, it } from "vitest";
import { clientRows, sortVisits, type ClientLike } from "./clients";
import type { VisitLike } from "./visits";

const client: ClientLike = {
  id: "client-1",
  name: "Jan Kowalski",
  email: "jan@example.invalid",
  phone: "600 100 200",
  notes: null,
  visits: 3,
  upcoming: 2,
  cancelled: 1,
  lastVisitAt: "2026-09-20T08:00:00+00:00",
  nextVisitAt: "2026-10-05T08:00:00+00:00",
  paidMinor: 60000,
  createdAt: "2026-09-01T10:00:00+00:00",
};

describe("clientRows", () => {
  it("each client's visits, payments and dates, where the centre is", () => {
    expect(clientRows([client], { timeZone: "Europe/Warsaw" })).toEqual([
      {
        id: "client-1",
        name: "Jan Kowalski",
        email: "jan@example.invalid",
        phone: "600 100 200",
        notes: null,
        visits: "3",
        upcoming: "2 nadchodzące",
        lastVisit: "20.09.2026",
        nextVisit: "pon. 05.10.2026, 10:00",
        paid: expect.stringMatching(/^600\s?zł$/),
        since: "Klient od 01.09.2026",
        href: "/klienci/client-1",
      },
    ]);
  });

  it("no visits yet, nothing to come", () => {
    const [row] = clientRows(
      [
        {
          ...client,
          visits: 0,
          upcoming: 0,
          lastVisitAt: null,
          nextVisitAt: null,
          paidMinor: 0,
        },
      ],
      { timeZone: "Europe/Warsaw" },
    );
    expect(row).toMatchObject({
      upcoming: null,
      lastVisit: "—",
      nextVisit: "—",
    });
    expect(
      clientRows([{ ...client, upcoming: 5 }], {
        timeZone: "Europe/Warsaw",
      })[0]!.upcoming,
    ).toBe("5 nadchodzących");
  });
});

function visit(overrides: Partial<VisitLike>): VisitLike {
  return {
    id: "v",
    reference: "2610-001",
    status: "confirmed",
    mode: "in_person",
    startsAt: "2026-10-01T08:00:00+00:00",
    endsAt: "2026-10-01T08:50:00+00:00",
    serviceName: "Konsultacja",
    specialist: { id: "s", name: "Michał Stępień", color: null },
    room: { id: "r", name: "Gabinet Zielony", color: null },
    locationName: null,
    client: { name: "Jan", email: null, phone: null, notes: null },
    priceMinor: 20000,
    currencyCode: "PLN",
    payment: null,
    cancelledBy: null,
    rescheduleCount: 0,
    ...overrides,
  };
}

describe("sortVisits", () => {
  const visits = [
    visit({
      id: "a",
      reference: "1",
      startsAt: "2026-10-03T08:00:00+00:00",
      priceMinor: 25000,
      status: "cancelled",
    }),
    visit({
      id: "b",
      reference: "2",
      startsAt: "2026-09-01T08:00:00+00:00",
      mode: "online",
      room: null,
    }),
    visit({
      id: "c",
      reference: "3",
      startsAt: "2026-10-10T08:00:00+00:00",
      serviceName: "Terapia par",
      status: "awaiting_payment",
    }),
  ];
  const ids = (sorted: VisitLike[]) => sorted.map((v) => v.id).join("");

  it("by time, either way; the input stays as it was", () => {
    expect(ids(sortVisits(visits, "termin", "desc"))).toBe("cab");
    expect(ids(sortVisits(visits, "termin", "asc"))).toBe("bac");
    expect(ids(visits)).toBe("abc");
  });

  it("by price, service, place, status (then by time)", () => {
    expect(ids(sortVisits(visits, "kwota", "desc"))).toBe("acb");
    expect(ids(sortVisits(visits, "usluga", "asc"))).toBe("bac");
    expect(ids(sortVisits(visits, "miejsce", "asc"))).toBe("acb");
    expect(ids(sortVisits(visits, "status", "asc"))).toBe("bca");
  });
});
