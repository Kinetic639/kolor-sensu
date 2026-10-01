import { describe, expect, it } from "vitest";
import { visitEventRows } from "./visit-events";

const base = { actorName: null, details: {} };
const options = { timeZone: "Europe/Warsaw", currencyCode: "PLN" };

describe("visitEventRows", () => {
  it("says what happened, when and who did it, in Polish", () => {
    const rows = visitEventRows(
      [
        {
          ...base,
          id: 1,
          occurredAt: "2026-09-29T18:03:00Z",
          kind: "created",
          actor: "client",
          details: {
            starts_at: "2026-10-02T09:00:00+00:00",
            ends_at: "2026-10-02T09:50:00+00:00",
          },
        },
        {
          ...base,
          id: 2,
          occurredAt: "2026-09-29T18:12:00Z",
          kind: "payment_succeeded",
          actor: "payment",
          details: { amount_minor: 20000 },
        },
        {
          ...base,
          id: 3,
          occurredAt: "2026-09-30T05:02:00Z",
          kind: "rescheduled",
          actor: "client",
          details: {
            from_starts_at: "2026-10-02T09:00:00+00:00",
            to_starts_at: "2026-10-02T08:00:00+00:00",
          },
        },
        {
          id: 4,
          occurredAt: "2026-09-30T05:05:00Z",
          kind: "cancelled",
          actor: "centre",
          actorName: "Michał Stępień",
          details: { refund_due_minor: 20000 },
        },
        {
          ...base,
          id: 5,
          occurredAt: "2026-09-30T05:06:00Z",
          kind: "email_sent",
          actor: "system",
          details: { email: "cancelled", restored: true },
        },
      ],
      options,
    );
    expect(rows).toEqual([
      {
        id: 1,
        when: "29.09.2026, 20:03",
        title: "Zarezerwowano termin",
        detail: "pt. 02.10.2026, 11:00–11:50",
        actor: "Klient",
        tone: "neutral",
        restored: false,
      },
      {
        id: 2,
        when: "29.09.2026, 20:12",
        title: "Płatność przyjęta",
        detail: "200 zł",
        actor: "Płatność (Stripe)",
        tone: "success",
        restored: false,
      },
      {
        id: 3,
        when: "30.09.2026, 07:02",
        title: "Zmieniono termin",
        detail: "z pt. 02.10.2026, 11:00 na pt. 02.10.2026, 10:00",
        actor: "Klient",
        tone: "info",
        restored: false,
      },
      {
        id: 4,
        when: "30.09.2026, 07:05",
        title: "Wizyta odwołana",
        detail: "Do zwrotu: 200 zł",
        actor: "Centrum · Michał Stępień",
        tone: "danger",
        restored: false,
      },
      {
        id: 5,
        when: "30.09.2026, 07:06",
        title: "Wysłano e-mail: Odwołanie",
        detail: null,
        actor: "System",
        tone: "neutral",
        restored: true,
      },
    ]);
  });

  it("a late cancellation: nothing to give back", () => {
    const [row] = visitEventRows(
      [
        {
          ...base,
          id: 1,
          occurredAt: "2026-09-30T05:05:00Z",
          kind: "cancelled",
          actor: "client",
          details: { refund_due_minor: 0 },
        },
      ],
      options,
    );
    expect(row!.detail).toBe("Bez zwrotu");
  });

  it("an unknown kind is still shown", () => {
    const [row] = visitEventRows(
      [
        {
          ...base,
          id: 1,
          occurredAt: "2026-09-30T05:05:00Z",
          kind: "sms_sent",
          actor: "system",
        },
      ],
      options,
    );
    expect(row!.title).toBe("sms_sent");
  });
});

describe("a visit the centre booked", () => {
  it("says the centre reserved it, paid online by its time", () => {
    const [row] = visitEventRows(
      [
        {
          id: 9,
          occurredAt: "2026-09-30T20:30:00Z",
          kind: "created",
          actor: "centre",
          actorName: "Michał Stępień",
          details: {
            starts_at: "2026-10-14T08:15:00+00:00",
            ends_at: "2026-10-14T09:05:00+00:00",
            status: "awaiting_payment",
            payment_due_at: "2026-10-12T08:15:00+00:00",
          },
        },
      ],
      options,
    );
    expect(row).toMatchObject({
      title: "Centrum zarezerwowało wizytę",
      actor: "Centrum · Michał Stępień",
      tone: "info",
    });
    expect(row!.detail).toMatch(
      /10:15–11:05 · płatność online do pon\.? 12\.10\.2026, 10:15$/,
    );
  });

  it("pay later: reserved, then cancelled by the system when unpaid", () => {
    const rows = visitEventRows(
      [
        {
          id: 1,
          occurredAt: "2026-10-01T08:00:00+00:00",
          kind: "reserved",
          actor: "client",
          actorName: null,
          details: { payment_due_at: "2026-10-12T08:15:00+00:00" },
        },
        {
          id: 2,
          occurredAt: "2026-10-12T08:15:00+00:00",
          kind: "cancelled",
          actor: "system",
          actorName: null,
          details: {
            from: "awaiting_payment",
            refund_due_minor: 0,
            reason: "unpaid",
          },
        },
        {
          id: 3,
          occurredAt: "2026-10-12T08:16:00+00:00",
          kind: "email_sent",
          actor: "system",
          actorName: null,
          details: { email: "payment_last_call" },
        },
      ],
      options,
    );
    expect(rows.map((row) => [row.title, row.detail, row.tone])).toEqual([
      [
        "Zarezerwowano, płatność później",
        expect.stringMatching(/^Opłata do pon\.? 12\.10\.2026, 10:15$/),
        "info",
      ],
      ["Anulowano – brak płatności", null, "danger"],
      ["Wysłano e-mail: Ostatnie przypomnienie o płatności", null, "neutral"],
    ]);
  });
});

describe("the centre's own way (R12)", () => {
  const options = { timeZone: "Europe/Warsaw", currencyCode: "PLN" };

  it("a cancellation, a refund later and a move, each with why", () => {
    const rows = visitEventRows(
      [
        {
          id: 1,
          occurredAt: "2026-10-12T08:00:00+00:00",
          kind: "cancelled",
          actor: "centre",
          actorName: "Michał Stępień",
          details: { refund_due_minor: 10000, reason: "Późne odwołanie" },
        },
        {
          id: 2,
          occurredAt: "2026-10-13T08:00:00+00:00",
          kind: "refund_issued",
          actor: "centre",
          actorName: "Michał Stępień",
          details: { refund_minor: 5000, reason: "Gest" },
        },
        {
          id: 3,
          occurredAt: "2026-10-01T08:00:00+00:00",
          kind: "rescheduled",
          actor: "centre",
          actorName: null,
          details: {
            from_starts_at: "2026-10-14T08:00:00+00:00",
            to_starts_at: "2026-10-15T08:00:00+00:00",
            reason: "Prośba klienta",
          },
        },
      ],
      options,
    );
    expect(rows.map((row) => [row.title, row.detail])).toEqual([
      [
        "Wizyta odwołana",
        expect.stringMatching(/^Do zwrotu: 100\s?zł · Późne odwołanie$/),
      ],
      [
        "Zwrot zlecony przez centrum",
        expect.stringMatching(/^50\s?zł · Gest$/),
      ],
      ["Zmieniono termin", expect.stringMatching(/ · Prośba klienta$/)],
    ]);
  });
});
