import { describe, expect, it, vi } from "vitest";
import {
  centreCancelVisit,
  centreRefundVisit,
  centreRescheduleVisit,
  centreResendPaymentLink,
  getVisit,
  listVisitEvents,
  listVisits,
  searchVisits,
} from "./visits";

function rpcClient(data: unknown, error: unknown = null) {
  const rpc = vi.fn().mockResolvedValue({ data, error });
  return { client: { rpc } as never, rpc };
}

const row = {
  id: "visit-1",
  reference: "KS-20301002-1534",
  status: "confirmed",
  mode: "in_person",
  starts_at: "2030-10-02T09:00:00+00:00",
  ends_at: "2030-10-02T09:50:00+00:00",
  service_name: "Konsultacja",
  specialist_id: "anna",
  specialist_name: "Anna Test",
  specialist_color: "#7fb3a6",
  room_id: "room-1",
  room_name: "Gabinet Zielony",
  room_color: null,
  location_name: "Siedziba",
  client_name: "Jan Kowalski",
  client_email: "jan@example.com",
  client_phone: "600100200",
  client_notes: null,
  price_minor: 20000,
  currency_code: "PLN",
  paid: true,
  refund_due_minor: null,
  refunded_minor: 0,
  cancelled_by: null,
  cancelled_at: null,
  reschedule_count: 0,
  payment_due_at: null,
};

describe("listVisits", () => {
  it("reads a range of visits, optionally one specialist's", async () => {
    const { client, rpc } = rpcClient([row]);
    const [visit] = await listVisits(client, {
      from: "2030-09-30",
      to: "2030-10-06",
      specialistId: "anna",
    });
    expect(rpc).toHaveBeenCalledWith("list_visits", {
      p_from: "2030-09-30",
      p_to: "2030-10-06",
      p_specialist_id: "anna",
      p_own: undefined,
    });
    expect(visit).toEqual({
      id: "visit-1",
      reference: "KS-20301002-1534",
      // The calendar's list does not say when it was booked.
      createdAt: null,
      changedAt: null,
      status: "confirmed",
      mode: "in_person",
      startsAt: "2030-10-02T09:00:00+00:00",
      endsAt: "2030-10-02T09:50:00+00:00",
      serviceName: "Konsultacja",
      specialist: { id: "anna", name: "Anna Test", color: "#7fb3a6" },
      room: { id: "room-1", name: "Gabinet Zielony", color: null },
      locationName: "Siedziba",
      client: {
        name: "Jan Kowalski",
        email: "jan@example.com",
        phone: "600100200",
        notes: null,
      },
      priceMinor: 20000,
      currencyCode: "PLN",
      payment: { paid: true, refundDueMinor: null, refundedMinor: 0 },
      cancelledBy: null,
      cancelledAt: null,
      rescheduleCount: 0,
      paymentDueAt: null,
    });
  });

  it("a reservation says when it must be paid by", async () => {
    const { client } = rpcClient([
      {
        ...row,
        status: "awaiting_payment",
        paid: false,
        payment_due_at: "2030-09-30T09:00:00+00:00",
      },
    ]);
    const [visit] = await listVisits(client, { from: "a", to: "b" });
    expect(visit!.paymentDueAt).toBe("2030-09-30T09:00:00+00:00");
  });

  it("gives a specialist no payment details and an online visit no room", async () => {
    const { client } = rpcClient([
      {
        ...row,
        mode: "online",
        room_id: null,
        room_name: null,
        paid: null,
        refunded_minor: null,
      },
    ]);
    const [visit] = await listVisits(client, { from: "a", to: "b" });
    expect(visit!.room).toBeNull();
    expect(visit!.payment).toBeNull();
  });
});

describe("centreCancelVisit", () => {
  it("cancels as the centre and says what to refund", async () => {
    const { client, rpc } = rpcClient([
      {
        reference: "KS-1",
        refund_minor: 20000,
        payment_intent_id: "pi_1",
        reschedule_count: 1,
      },
    ]);
    expect(await centreCancelVisit(client, "visit-1")).toEqual({
      reference: "KS-1",
      refundMinor: 20000,
      paymentIntentId: "pi_1",
      rescheduleCount: 1,
    });
    expect(rpc).toHaveBeenCalledWith("centre_cancel_visit", {
      p_appointment_id: "visit-1",
      p_refund_minor: null,
      p_reason: null,
    });
  });

  it("says when it cannot", async () => {
    const { client } = rpcClient(null, {
      message: "no",
      hint: "not_cancellable",
    });
    await expect(centreCancelVisit(client, "v")).rejects.toMatchObject({
      code: "not_cancellable",
    });
  });
});

describe("searchVisits", () => {
  it("asks for one page, searched, filtered and sorted, and the total", async () => {
    const { client, rpc } = rpcClient([{ ...row, total_count: 42 }]);
    const page = await searchVisits(client, {
      query: "kowalski",
      statuses: ["confirmed"],
      payments: ["paid", "refunded"],
      specialistIds: ["anna", "jan"],
      serviceIds: ["service-1"],
      roomIds: ["room-1"],
      online: true,
      from: "2030-09-30T00:00:00.000Z",
      to: null,
      createdFrom: "2030-09-01T00:00:00.000Z",
      changedTo: "2030-09-29T00:00:00.000Z",
      sort: "client",
      descending: true,
      limit: 20,
      offset: 40,
      own: false,
    });
    expect(rpc).toHaveBeenCalledWith("search_bookings", {
      p_query: "kowalski",
      p_statuses: ["confirmed"],
      p_payments: ["paid", "refunded"],
      p_specialist_ids: ["anna", "jan"],
      p_service_ids: ["service-1"],
      p_room_ids: ["room-1"],
      p_online: true,
      p_from: "2030-09-30T00:00:00.000Z",
      p_to: undefined,
      p_created_from: "2030-09-01T00:00:00.000Z",
      p_created_to: undefined,
      p_changed_from: undefined,
      p_changed_to: "2030-09-29T00:00:00.000Z",
      p_sort: "client",
      p_desc: true,
      p_limit: 20,
      p_offset: 40,
      p_own: false,
    });
    expect(page.total).toBe(42);
    expect(page.visits[0]).toMatchObject({
      reference: "KS-20301002-1534",
      client: { name: "Jan Kowalski" },
    });
  });

  it("an empty page has no total row: zero", async () => {
    const { client } = rpcClient([]);
    expect(
      await searchVisits(client, {
        sort: "starts_at",
        descending: false,
        limit: 20,
        offset: 0,
      }),
    ).toEqual({ visits: [], total: 0 });
  });
});

describe("getVisit", () => {
  it("reads one visit with its history and e-mails", async () => {
    const { client, rpc } = rpcClient([
      {
        ...row,
        created_at: "2030-09-01T10:00:00+00:00",
        confirmed_at: "2030-09-01T10:05:00+00:00",
        emails: [
          { kind: "confirmation", sent_at: "2030-09-01T10:06:00+00:00" },
        ],
      },
    ]);
    expect(await getVisit(client, "visit-1")).toMatchObject({
      id: "visit-1",
      createdAt: "2030-09-01T10:00:00+00:00",
      confirmedAt: "2030-09-01T10:05:00+00:00",
      emails: [{ kind: "confirmation", sentAt: "2030-09-01T10:06:00+00:00" }],
    });
    expect(rpc).toHaveBeenCalledWith("get_visit", {
      p_id: "visit-1",
      p_own: false,
    });
  });

  it("a specialist gets no e-mails; nothing for someone else's", async () => {
    const { client } = rpcClient([
      { ...row, created_at: "x", confirmed_at: null, emails: null },
    ]);
    expect((await getVisit(client, "v", { own: true }))?.emails).toBeNull();
    expect(await getVisit(rpcClient([]).client, "v")).toBeNull();
  });
});

describe("listVisitEvents", () => {
  it("reads a visit's history, oldest first", async () => {
    const { client, rpc } = rpcClient([
      {
        id: 1,
        occurred_at: "2030-09-20T10:00:00Z",
        kind: "created",
        actor: "client",
        actor_name: null,
        details: { reference: "3010-017" },
      },
      {
        id: 2,
        occurred_at: "2030-09-21T10:00:00Z",
        kind: "cancelled",
        actor: "centre",
        actor_name: "Michał Stępień",
        details: null,
      },
    ]);
    expect(await listVisitEvents(client, "visit-1", { own: true })).toEqual([
      {
        id: 1,
        occurredAt: "2030-09-20T10:00:00Z",
        kind: "created",
        actor: "client",
        actorName: null,
        details: { reference: "3010-017" },
      },
      {
        id: 2,
        occurredAt: "2030-09-21T10:00:00Z",
        kind: "cancelled",
        actor: "centre",
        actorName: "Michał Stępień",
        details: {},
      },
    ]);
    expect(rpc).toHaveBeenCalledWith("list_visit_events", {
      p_id: "visit-1",
      p_own: true,
    });
  });
});

describe("centreResendPaymentLink", () => {
  it("lets the reservation's e-mail go once more", async () => {
    const { client, rpc } = rpcClient([{ reference: "2610-004" }]);
    expect(await centreResendPaymentLink(client, "visit-1")).toBe("2610-004");
    expect(rpc).toHaveBeenCalledWith("centre_resend_payment_link", {
      p_appointment_id: "visit-1",
    });
  });

  it("says why not: sent a moment ago, nothing to pay, not theirs", async () => {
    for (const [error, code] of [
      [{ message: "x", hint: "recently_sent" }, "recently_sent"],
      [{ message: "x", hint: "not_payable" }, "not_payable"],
      [{ message: "x", code: "42501" }, "forbidden"],
    ] as const) {
      await expect(
        centreResendPaymentLink(rpcClient(null, error).client, "v"),
      ).rejects.toMatchObject({ code });
    }
  });
});

describe("the centre's own way (R12)", () => {
  it("cancels with the refund the admin chose, and why", async () => {
    const { client, rpc } = rpcClient([
      {
        reference: "KS-1",
        refund_minor: 10000,
        payment_intent_id: "pi_1",
        reschedule_count: 0,
      },
    ]);
    await centreCancelVisit(client, "visit-1", {
      refundMinor: 10000,
      reason: "Późne odwołanie",
    });
    expect(rpc).toHaveBeenCalledWith("centre_cancel_visit", {
      p_appointment_id: "visit-1",
      p_refund_minor: 10000,
      p_reason: "Późne odwołanie",
    });
  });

  it("gives money back later, up to what is left", async () => {
    const { client, rpc } = rpcClient([
      {
        reference: "KS-1",
        refund_minor: 5000,
        payment_intent_id: "pi_1",
        refunded_before_minor: 15000,
      },
    ]);
    expect(
      await centreRefundVisit(client, "visit-1", 5000, "Gest dobrej woli"),
    ).toEqual({
      reference: "KS-1",
      refundMinor: 5000,
      paymentIntentId: "pi_1",
      refundedBeforeMinor: 15000,
    });
    expect(rpc).toHaveBeenCalledWith("centre_refund_visit", {
      p_appointment_id: "visit-1",
      p_refund_minor: 5000,
      p_reason: "Gest dobrej woli",
    });
    await expect(
      centreRefundVisit(
        rpcClient(null, { message: "x", hint: "refund_too_high" }).client,
        "v",
        1,
        null,
      ),
    ).rejects.toMatchObject({ code: "refund_too_high" });
  });

  it("moves a visit anywhere free", async () => {
    const { client, rpc } = rpcClient([
      {
        reference: "KS-1",
        starts_at: "2030-10-02T13:00:00+00:00",
        ends_at: "2030-10-02T13:50:00+00:00",
        sequence: 1,
        payment_due_at: null,
      },
    ]);
    expect(
      await centreRescheduleVisit(client, "visit-1", {
        startsAt: "2030-10-02T13:00:00.000Z",
        mode: "online",
        roomId: null,
        reason: null,
      }),
    ).toEqual({
      reference: "KS-1",
      startsAt: "2030-10-02T13:00:00+00:00",
      endsAt: "2030-10-02T13:50:00+00:00",
      sequence: 1,
      paymentDueAt: null,
    });
    expect(rpc).toHaveBeenCalledWith("centre_reschedule_visit", {
      p_appointment_id: "visit-1",
      p_starts_at: "2030-10-02T13:00:00.000Z",
      p_mode: "online",
      p_room_id: null,
      p_reason: null,
    });
    await expect(
      centreRescheduleVisit(
        rpcClient(null, { message: "x", code: "42501" }).client,
        "v",
        { startsAt: "x", mode: "online", roomId: null, reason: null },
      ),
    ).rejects.toMatchObject({ code: "forbidden" });
  });
});
