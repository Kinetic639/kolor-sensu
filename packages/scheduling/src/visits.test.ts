import { describe, expect, it } from "vitest";
import {
  bookingHref,
  refundsToSettle,
  visitDays,
  visitRows,
  type VisitLike,
} from "./visits";

const visit: VisitLike = {
  id: "v1",
  reference: "KS-20301002-1534",
  status: "confirmed",
  mode: "in_person",
  startsAt: "2030-10-02T09:00:00Z",
  endsAt: "2030-10-02T09:50:00Z",
  serviceName: "Konsultacja psychologiczna",
  specialist: { id: "anna", name: "Anna Test", color: "#7fb3a6" },
  room: { id: "r1", name: "Gabinet Zielony", color: null },
  locationName: "Siedziba",
  client: {
    name: "Jan Kowalski",
    email: "jan@example.com",
    phone: "600100200",
    notes: "Pierwsza wizyta",
  },
  priceMinor: 20000,
  currencyCode: "PLN",
  payment: { paid: true, refundDueMinor: null, refundedMinor: 0 },
  cancelledBy: null,
  rescheduleCount: 0,
};
const options = {
  timeZone: "Europe/Warsaw",
  now: new Date("2030-10-01T08:00:00Z"),
};

describe("the centre's own way (R12)", () => {
  it("knows what is left to give back, and where the visit is", () => {
    const [row] = visitRows(
      [
        {
          ...visit,
          status: "cancelled",
          cancelledBy: "client",
          payment: { paid: true, refundDueMinor: 0, refundedMinor: 5000 },
        },
      ],
      options,
    );
    expect(row).toMatchObject({
      refundableMinor: 15000,
      currencyCode: "PLN",
      mode: "in_person",
      roomId: "r1",
      movable: false,
    });
    expect(visitRows([visit], options)[0]).toMatchObject({
      refundableMinor: 20000,
      movable: true,
    });
  });

  it("a refund owed and not gone back: owed, not given back a second time", () => {
    const [row] = visitRows(
      [
        {
          ...visit,
          status: "cancelled",
          cancelledBy: "centre",
          payment: { paid: true, refundDueMinor: 20000, refundedMinor: 0 },
        },
      ],
      options,
    );
    expect(row).toMatchObject({ refundableMinor: 0, owedMinor: 20000 });
    expect(visitRows([visit], options)[0]!.owedMinor).toBe(0);
  });

  it("a specialist, or a visit not paid, has nothing to give back", () => {
    expect(
      visitRows([{ ...visit, payment: null }], options)[0]!.refundableMinor,
    ).toBe(0);
    expect(
      visitRows(
        [
          {
            ...visit,
            status: "awaiting_payment",
            payment: { paid: false, refundDueMinor: null, refundedMinor: 0 },
          },
        ],
        options,
      )[0]!.refundableMinor,
    ).toBe(0);
  });
});

describe("a reservation not paid yet (R11)", () => {
  const reserved: VisitLike = {
    ...visit,
    status: "awaiting_payment",
    payment: { paid: false, refundDueMinor: null, refundedMinor: 0 },
    paymentDueAt: "2030-09-30T09:00:00Z",
  };

  it("says when it must be paid by, and that the link can go again", () => {
    const [row] = visitRows([reserved], {
      ...options,
      now: new Date("2030-09-29T08:00:00Z"),
    });
    expect(row).toMatchObject({
      status: { label: "Czeka na płatność", tone: "warning" },
      paymentDue: "pon. 30.09, 11:00",
      resendable: true,
    });
  });

  it("past its time, or with no e-mail, there is nothing to send", () => {
    expect(
      visitRows([reserved], {
        ...options,
        now: new Date("2030-09-30T10:00:00Z"),
      })[0]!.resendable,
    ).toBe(false);
    expect(
      visitRows(
        [{ ...reserved, client: { ...reserved.client, email: null } }],
        {
          ...options,
          now: new Date("2030-09-29T08:00:00Z"),
        },
      )[0]!.resendable,
    ).toBe(false);
  });

  it("a paid visit has neither", () => {
    expect(visitRows([visit], options)[0]).toMatchObject({
      paymentDue: null,
      resendable: false,
    });
  });
});

describe("bookingHref", () => {
  it("finds just that booking, by its number over all time, open", () => {
    expect(bookingHref({ id: "v1", reference: "TEST-1012-02" })).toBe(
      "/rezerwacje?zakres=wszystkie&q=TEST-1012-02&wizyta=v1",
    );
    // No number: open by its id alone.
    expect(bookingHref({ id: "v1", reference: null })).toBe(
      "/rezerwacje?zakres=wszystkie&wizyta=v1",
    );
  });
});

describe("visitDays", () => {
  it("groups visits by the centre's day, with local times", () => {
    const days = visitDays(
      [
        visit,
        {
          ...visit,
          id: "v2",
          startsAt: "2030-10-03T12:00:00Z",
          endsAt: "2030-10-03T12:50:00Z",
        },
      ],
      options,
    );
    expect(days.map((day) => [day.date, day.label])).toEqual([
      ["2030-10-02", "środa, 2 października"],
      ["2030-10-03", "czwartek, 3 października"],
    ]);
    expect(days[0]!.visits[0]).toMatchObject({
      id: "v1",
      time: "11:00–11:50",
      clientName: "Jan Kowalski",
      serviceName: "Konsultacja psychologiczna",
      specialistName: "Anna Test",
      place: "Gabinet Zielony · Siedziba",
      room: "Gabinet Zielony",
      locationName: "Siedziba",
      phone: "600100200",
      notes: "Pierwsza wizyta",
      amount: "200 zł",
      status: { label: "Potwierdzona", tone: "success" },
      payment: { label: "Opłacona", tone: "success" },
      cancellable: true,
      note: null,
    });
    expect(days[0]!.visits[0]!.contact).toEqual([
      { label: "Telefon", value: "600100200" },
      { label: "E-mail", value: "jan@example.com" },
      { label: "Uwagi klienta", value: "Pierwsza wizyta" },
    ]);
  });

  it("says who cancelled and what happens with the money", () => {
    const [day] = visitDays(
      [
        {
          ...visit,
          status: "cancelled",
          cancelledBy: "client",
          payment: { paid: true, refundDueMinor: 0, refundedMinor: 0 },
        },
        {
          ...visit,
          id: "v2",
          status: "cancelled",
          cancelledBy: "centre",
          payment: { paid: true, refundDueMinor: 20000, refundedMinor: 0 },
        },
        {
          ...visit,
          id: "v3",
          status: "cancelled",
          cancelledBy: "client",
          payment: { paid: true, refundDueMinor: 20000, refundedMinor: 20000 },
        },
        {
          ...visit,
          id: "v4",
          status: "cancelled",
          cancelledBy: "system",
          payment: { paid: false, refundDueMinor: 0, refundedMinor: 0 },
        },
      ],
      options,
    );
    expect(
      day!.visits.map((row) => [
        row.status.label,
        row.payment?.label,
        row.cancellable,
      ]),
    ).toEqual([
      ["Odwołana przez klienta", "Bez zwrotu", false],
      ["Odwołana przez centrum", "Zwrot do zlecenia", false],
      ["Odwołana przez klienta", "Zwrócono", false],
      ["Anulowana – brak płatności", "Nieopłacona", false],
    ]);
  });

  it("a specialist sees no payments; online visits and moved ones say so", () => {
    const [day] = visitDays(
      [
        {
          ...visit,
          mode: "online",
          room: null,
          payment: null,
          rescheduleCount: 1,
        },
      ],
      options,
    );
    expect(day!.visits[0]).toMatchObject({
      place: "Online",
      payment: null,
      note: "Przełożona przez klienta",
    });
  });

  it("a past visit cannot be cancelled", () => {
    const [day] = visitDays([visit], {
      ...options,
      now: new Date("2030-10-02T10:00:00Z"),
    });
    expect(day!.visits[0]!.cancellable).toBe(false);
  });
});

describe("refundsToSettle", () => {
  it("lists the cancelled visits whose money has not gone back", () => {
    const owed = {
      ...visit,
      id: "v2",
      status: "cancelled" as const,
      cancelledBy: "client" as const,
      payment: { paid: true, refundDueMinor: 20000, refundedMinor: 0 },
    };
    expect(refundsToSettle([visit, owed]).map((one) => one.id)).toEqual(["v2"]);
  });
});

describe("visitRows", () => {
  it("keeps the order given and says the day", () => {
    const later = {
      ...visit,
      id: "v2",
      startsAt: "2030-10-03T12:00:00Z",
      endsAt: "2030-10-03T12:50:00Z",
    };
    const rows = visitRows([later, visit], options);
    expect(
      rows.map((row) => [row.id, row.dateLabel, row.weekday, row.time]),
    ).toEqual([
      ["v2", "3 października 2030", "czwartek", "14:00–14:50"],
      ["v1", "2 października 2030", "środa", "11:00–11:50"],
    ]);
  });
});
