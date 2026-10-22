import { describe, expect, it, vi } from "vitest";
import {
  acceptBookingTerms,
  attachCheckoutSession,
  attachReservationPayment,
  claimStripeEvent,
  failCheckoutSession,
  fulfillCheckoutSession,
  pendingCheckoutSession,
  pendingReservationPayment,
  listStuckPayments,
  recordDispute,
  recordRefund,
  releaseStripeEvent,
} from "./booking-payments";

function rpcClient(data: unknown, error: unknown = null) {
  const rpc = vi.fn().mockResolvedValue({ data, error });
  return { client: { rpc } as never, rpc };
}

describe("a visit's Checkout Session", () => {
  it("is tied to the hold, with its amount and end", async () => {
    const { client, rpc } = rpcClient(null);
    await attachCheckoutSession(client, "token", {
      sessionId: "cs_1",
      expiresAt: "2030-01-01T10:30:00.000Z",
      amountMinor: 25000,
      currencyCode: "pln",
    });
    expect(rpc).toHaveBeenCalledWith("attach_checkout_session", {
      p_access_token: "token",
      p_session_id: "cs_1",
      p_expires_at: "2030-01-01T10:30:00.000Z",
      p_amount_minor: 25000,
      p_currency_code: "pln",
    });
  });

  it("refuses with a reason the page can show", async () => {
    const { client } = rpcClient(null, { message: "x", hint: "hold_expired" });
    await expect(
      attachCheckoutSession(client, "token", {
        sessionId: "cs_1",
        expiresAt: "2030-01-01T10:30:00.000Z",
        amountMinor: 25000,
        currencyCode: "pln",
      }),
    ).rejects.toMatchObject({ name: "BookingError", code: "hold_expired" });
  });

  it("is found again while the client pays", async () => {
    expect(
      await pendingCheckoutSession(
        rpcClient([{ checkout_session_id: "cs_1" }]).client,
        "token",
      ),
    ).toBe("cs_1");
    expect(
      await pendingCheckoutSession(rpcClient([]).client, "token"),
    ).toBeNull();
  });
});

describe("the payment's outcome", () => {
  it("confirms a paid session and says what happened", async () => {
    const { client, rpc } = rpcClient("confirmed");
    expect(await fulfillCheckoutSession(client, "cs_1", true, "pi_1")).toBe(
      "confirmed",
    );
    expect(rpc).toHaveBeenCalledWith("fulfill_checkout_session", {
      p_session_id: "cs_1",
      p_paid: true,
      p_payment_intent_id: "pi_1",
    });
  });

  it("frees the time of a failed or expired session", async () => {
    const { client, rpc } = rpcClient(null);
    await failCheckoutSession(client, "cs_1", "expired");
    expect(rpc).toHaveBeenCalledWith("fail_checkout_session", {
      p_session_id: "cs_1",
      p_reason: "expired",
    });
  });

  it("records a refund", async () => {
    const { client, rpc } = rpcClient(true);
    expect(await recordRefund(client, "pi_1", 25000)).toBe(true);
    expect(rpc).toHaveBeenCalledWith("record_refund", {
      p_payment_intent_id: "pi_1",
      p_refunded_minor: 25000,
    });
  });
});

describe("Stripe events", () => {
  function tableClient(result: { data: unknown; error: unknown }) {
    const chain = {
      insert: vi.fn(() => chain),
      upsert: vi.fn(() => chain),
      select: vi.fn(() => chain),
      delete: vi.fn(() => chain),
      eq: vi.fn(() => Promise.resolve(result)),
      then: (resolve: (value: unknown) => void) => resolve(result),
    };
    return { client: { from: vi.fn(() => chain) } as never, chain };
  }

  it("are handled once: a second delivery is not claimed", async () => {
    const first = tableClient({ data: [{ id: "evt_1" }], error: null });
    expect(
      await claimStripeEvent(
        first.client,
        "evt_1",
        "checkout.session.completed",
      ),
    ).toBe(true);
    expect(first.chain.upsert).toHaveBeenCalledWith(
      { id: "evt_1", type: "checkout.session.completed" },
      { onConflict: "id", ignoreDuplicates: true },
    );
    const again = tableClient({ data: [], error: null });
    expect(
      await claimStripeEvent(
        again.client,
        "evt_1",
        "checkout.session.completed",
      ),
    ).toBe(false);
  });

  it("can be given back when handling failed, so Stripe retries", async () => {
    const { client, chain } = tableClient({ data: null, error: null });
    await releaseStripeEvent(client, "evt_1");
    expect(chain.delete).toHaveBeenCalled();
    expect(chain.eq).toHaveBeenCalledWith("id", "evt_1");
  });
});

describe("paying a reservation later, from its link", () => {
  it("takes the consents, then ties the session to it", async () => {
    const terms = rpcClient(null);
    await acceptBookingTerms(terms.client, "link");
    expect(terms.rpc).toHaveBeenCalledWith("accept_booking_terms", {
      p_token: "link",
    });
    const { client, rpc } = rpcClient(null);
    await attachReservationPayment(client, "link", {
      sessionId: "cs_2",
      amountMinor: 25000,
      currencyCode: "PLN",
    });
    expect(rpc).toHaveBeenCalledWith("attach_reservation_payment", {
      p_token: "link",
      p_session_id: "cs_2",
      p_amount_minor: 25000,
      p_currency_code: "PLN",
    });
    expect(
      await pendingReservationPayment(
        rpcClient([{ checkout_session_id: "cs_2" }]).client,
        "link",
      ),
    ).toBe("cs_2");
  });

  it("says when there is nothing to pay any more", async () => {
    const { client } = rpcClient(null, {
      message: "Nothing to pay",
      hint: "not_payable",
    });
    await expect(acceptBookingTerms(client, "link")).rejects.toMatchObject({
      code: "not_payable",
    });
  });
});

describe("a dispute on a visit's payment", () => {
  it("is written by the payment's intent", async () => {
    const { client, rpc } = rpcClient("2610-004");
    expect(
      await recordDispute(client, {
        paymentIntentId: "pi_1",
        disputeId: "du_1",
        status: "needs_response",
        amountMinor: 25000,
        reason: "fraudulent",
        closed: false,
      }),
    ).toBe("2610-004");
    expect(rpc).toHaveBeenCalledWith("record_dispute", {
      p_payment_intent_id: "pi_1",
      p_dispute_id: "du_1",
      p_status: "needs_response",
      p_amount_minor: 25000,
      p_reason: "fraudulent",
      p_closed: false,
    });
  });
});

describe("payments still pending", () => {
  it("lists their sessions", async () => {
    const { client } = rpcClient([
      { checkout_session_id: "cs_1" },
      { checkout_session_id: "cs_2" },
    ]);
    expect(await listStuckPayments(client)).toEqual(["cs_1", "cs_2"]);
  });
});
