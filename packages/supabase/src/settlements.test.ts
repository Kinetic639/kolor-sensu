import { describe, expect, it, vi } from "vitest";
import { BookingError } from "./booking";
import { centreSettleVisit, listSettlements } from "./visits";

describe("listSettlements", () => {
  it("reads what is owed", async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: [
        {
          appointment_id: "visit-1",
          reference: "2610-004",
          kind: "paid_without_visit",
          status: "expired",
          starts_at: "2026-10-03T09:00:00+00:00",
          client_name: "Jan Kowalski",
          client_email: "jan@example.invalid",
          client_phone: null,
          service_name: "Konsultacja",
          specialist_name: "Michał Stępień",
          paid_minor: 20000,
          refunded_minor: 0,
          owed_minor: 20000,
          currency_code: "PLN",
          since: "2026-10-01T20:00:00+00:00",
        },
      ],
      error: null,
    });
    expect(await listSettlements({ rpc } as never)).toEqual([
      {
        appointmentId: "visit-1",
        reference: "2610-004",
        kind: "paid_without_visit",
        status: "expired",
        startsAt: "2026-10-03T09:00:00+00:00",
        client: {
          name: "Jan Kowalski",
          email: "jan@example.invalid",
          phone: null,
        },
        serviceName: "Konsultacja",
        specialistName: "Michał Stępień",
        paidMinor: 20000,
        refundedMinor: 0,
        owedMinor: 20000,
        currencyCode: "PLN",
        since: "2026-10-01T20:00:00+00:00",
      },
    ]);
    expect(rpc).toHaveBeenCalledWith("list_settlements");
  });

  it("refuses a non-admin", async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: null,
      error: { message: "Only the centre", code: "42501" },
    });
    await expect(listSettlements({ rpc } as never)).rejects.toMatchObject({
      code: "forbidden",
    });
  });
});

describe("centreSettleVisit", () => {
  it("gives what to refund and the settling's own id", async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: [
        {
          reference: "2610-004",
          payment_intent_id: "pi_1",
          refund_minor: 5000,
          refunded_before_minor: 15000,
          settlement_id: 42,
        },
      ],
      error: null,
    });
    expect(await centreSettleVisit({ rpc } as never, "visit-1")).toEqual({
      reference: "2610-004",
      paymentIntentId: "pi_1",
      refundMinor: 5000,
      refundedBeforeMinor: 15000,
      settlementId: 42,
    });
    expect(rpc).toHaveBeenCalledWith("centre_settle_visit", {
      p_appointment_id: "visit-1",
    });
  });

  it("says why not: nothing owed, settled a moment ago", async () => {
    for (const hint of ["nothing_owed", "recently_settled"]) {
      const rpc = vi.fn().mockResolvedValue({
        data: null,
        error: { message: "no", hint, code: "P0001" },
      });
      const error = await centreSettleVisit({ rpc } as never, "v").catch(
        (e: unknown) => e,
      );
      expect(error).toBeInstanceOf(BookingError);
      expect((error as BookingError).code).toBe(hint);
    }
  });
});
