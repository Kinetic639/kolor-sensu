import { describe, expect, it } from "vitest";
import { notificationView, type NotificationLike } from "./notification-view";

const base: NotificationLike = {
  id: 1,
  kind: "booked",
  actor: "payment",
  appointmentId: "visit-1",
  createdAt: "2026-10-01T08:05:00+00:00",
  readAt: null,
  details: {
    reference: "2610-004",
    startsAt: "2026-10-03T09:00:00+00:00",
    mode: "online",
    clientName: "Jan Kowalski",
    serviceName: "Konsultacja",
    specialistName: "Michał Stępień",
    fromStartsAt: null,
    reason: null,
    refundMinor: null,
    refundDueMinor: null,
    priceMinor: 20000,
    currencyCode: "PLN",
  },
};

const at = (overrides: Partial<NotificationLike>, details = {}) => ({
  ...base,
  ...overrides,
  details: { ...base.details, ...details },
});

const options = {
  timeZone: "Europe/Warsaw",
  portal: "admin" as const,
  now: new Date("2026-10-01T12:00:00+00:00"),
};

describe("notificationView", () => {
  it("a new paid visit: its number, who, what, when; a link to the booking", () => {
    expect(notificationView(base, options)).toEqual({
      id: 1,
      title: "Nowa wizyta",
      reference: "2610-004",
      description:
        "Jan Kowalski · Konsultacja · sob. 03.10, 11:00 · Michał Stępień",
      tone: "success",
      icon: "new",
      // The bookings table, found by its number, the booking open.
      href: "/rezerwacje?zakres=wszystkie&q=2610-004&wizyta=visit-1",
      when: "dziś, 10:05",
      unread: true,
    });
  });

  it("a specialist's own: no name of theirs, no money", () => {
    const view = notificationView(
      at({ kind: "cancelled", actor: "client" }, { refundDueMinor: 20000 }),
      { ...options, portal: "specialist" },
    );
    expect(view.title).toBe("Klient odwołał wizytę");
    expect(view.description).toBe(
      "Jan Kowalski · Konsultacja · sob. 03.10, 11:00",
    );
  });

  it("each kind says what happened, and the money to admins", () => {
    const titles = (
      [
        [{ kind: "reserved", actor: "client" }, {}],
        [{ kind: "centre_booked", actor: "centre" }, {}],
        [{ kind: "paid", actor: "payment" }, {}],
        [
          { kind: "cancelled", actor: "centre" },
          { refundDueMinor: 10000, reason: "Późne odwołanie" },
        ],
        [
          { kind: "cancelled", actor: "system" },
          { reason: "unpaid", refundDueMinor: 0 },
        ],
        [{ kind: "cancelled", actor: "client" }, { refundDueMinor: 0 }],
        [
          { kind: "rescheduled", actor: "client" },
          { fromStartsAt: "2026-10-02T09:00:00+00:00" },
        ],
        [
          { kind: "rescheduled", actor: "centre" },
          { reason: "Prośba klienta" },
        ],
        [{ kind: "refunded", actor: "centre" }, { refundMinor: 5050 }],
      ] as [Partial<NotificationLike>, object][]
    ).map(([o, d]) => {
      const view = notificationView(at(o, d), options);
      return [
        view.title,
        view.description.split(" · ").slice(3).join(" · "),
        view.tone,
      ];
    });
    expect(titles).toEqual([
      ["Nowa rezerwacja, płatność później", "Michał Stępień", "info"],
      ["Centrum umówiło wizytę", "Michał Stępień", "info"],
      ["Rezerwacja opłacona", "Michał Stępień", "success"],
      [
        "Centrum odwołało wizytę",
        expect.stringMatching(
          /^Michał Stępień · Do zwrotu: 100\s?zł · Późne odwołanie$/,
        ),
        "danger",
      ],
      ["Anulowano – brak płatności", "Michał Stępień", "danger"],
      ["Klient odwołał wizytę", "Michał Stępień · Bez zwrotu", "danger"],
      [
        "Klient przełożył wizytę",
        "Michał Stępień · wcześniej pt. 02.10, 11:00",
        "info",
      ],
      ["Centrum przesunęło wizytę", "Michał Stępień · Prośba klienta", "info"],
      [
        expect.stringMatching(/^Zwrot pieniędzy: 50,50\s?zł$/),
        "Michał Stępień",
        "info",
      ],
    ]);
  });

  it("says when: today, yesterday, or the date; read or not", () => {
    const when = (createdAt: string) =>
      notificationView(at({ createdAt }), options).when;
    expect(when("2026-09-30T19:30:00+00:00")).toBe("wczoraj, 21:30");
    expect(when("2026-09-28T07:00:00+00:00")).toBe("28.09, 09:00");
    expect(
      notificationView(at({ readAt: "2026-10-01T09:00:00+00:00" }), options)
        .unread,
    ).toBe(false);
  });

  it("missing facts are left out, never shown as blanks", () => {
    const view = notificationView(
      at(
        { appointmentId: null },
        { clientName: null, startsAt: null, serviceName: null },
      ),
      options,
    );
    expect(view.description).toBe("Michał Stępień");
    expect(view.href).toBeNull();
  });
});
