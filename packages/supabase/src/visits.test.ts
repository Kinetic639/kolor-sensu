import { describe, expect, it, vi } from "vitest";
import { centreCancelVisit, listVisits, searchVisits } from "./visits";

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
    });
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
      refundDue: false,
      specialistId: "anna",
      from: "2030-09-30T00:00:00.000Z",
      to: null,
      sort: "client",
      descending: true,
      limit: 20,
      offset: 40,
      own: false,
    });
    expect(rpc).toHaveBeenCalledWith("search_visits", {
      p_query: "kowalski",
      p_statuses: ["confirmed"],
      p_refund_due: false,
      p_specialist_id: "anna",
      p_from: "2030-09-30T00:00:00.000Z",
      p_to: undefined,
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
