import type { GuestBooking } from "@repo/supabase";
import type Stripe from "stripe";
import { describe, expect, it, vi } from "vitest";
import {
  checkoutSessionParams,
  eventFitsKey,
  handleStripeEvent,
  type PaymentDeps,
  settleSession,
  stuckSessionAction,
} from "./payment";

const booking: GuestBooking = {
  reference: "KS-20301002-6422",
  status: "held",
  mode: "in_person",
  startsAt: "2030-10-02T08:00:00+00:00",
  endsAt: "2030-10-02T08:50:00+00:00",
  holdExpiresAt: "2030-10-01T10:10:00+00:00",
  serviceName: "Konsultacja psychologiczna",
  specialistName: "Michał Stępień",
  roomName: "Gabinet Zielony",
  locationName: "Siedziba Główna",
  priceMinor: 20000,
  currencyCode: "PLN",
  details: {
    name: "Jan Kowalski",
    firstName: "Jan",
    lastName: "Kowalski",
    email: "jan@example.com",
    phone: "600100200",
    notes: null,
  },
  rescheduleCount: 0,
  cancelledBy: null,
  refundDueMinor: null,
  refundedMinor: 0,
  bookedBy: "client",
  paid: true,
  paymentDueAt: null,
};

describe("checkoutSessionParams", () => {
  it("asks Stripe for the visit's price, in our own payment step", () => {
    const now = new Date("2030-10-01T10:00:00Z");
    const params = checkoutSessionParams({
      booking,
      returnUrl: "https://kolorsensu.pl/umow-wizyte/potwierdzenie",
      visitLabel: "czwartek, 2 października 2030, godz. 10:00",
      now,
    });
    expect(params).toEqual({
      ui_mode: "elements",
      mode: "payment",
      allowed_payment_method_types: ["card", "blik", "p24"],
      customer_email: "jan@example.com",
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "pln",
            unit_amount: 20000,
            product_data: {
              name: "Konsultacja psychologiczna",
              description:
                "Michał Stępień · czwartek, 2 października 2030, godz. 10:00",
            },
          },
        },
      ],
      // At least 30 minutes, as Stripe requires.
      expires_at: Math.floor(now.getTime() / 1000) + 31 * 60,
      return_url:
        "https://kolorsensu.pl/umow-wizyte/potwierdzenie?sesja={CHECKOUT_SESSION_ID}",
      metadata: { appointment_reference: "KS-20301002-6422" },
      payment_intent_data: {
        description: "Wizyta KS-20301002-6422",
        metadata: { appointment_reference: "KS-20301002-6422" },
      },
    });
  });

  it("never sends the client's name, phone or notes to Stripe", () => {
    const params = JSON.stringify(
      checkoutSessionParams({
        booking: {
          ...booking,
          details: { ...booking.details!, notes: "lęki" },
        },
        returnUrl: "https://kolorsensu.pl/x",
        visitLabel: "…",
        now: new Date(),
      }),
    );
    expect(params).not.toContain("Jan Kowalski");
    expect(params).not.toContain("600100200");
    expect(params).not.toContain("lęki");
  });

  it("offers only a card (with its wallets), BLIK and Przelewy24", () => {
    const params = checkoutSessionParams({
      booking,
      returnUrl: "https://kolorsensu.pl/x",
      visitLabel: "…",
    });
    expect(params.allowed_payment_method_types).toEqual([
      "card",
      "blik",
      "p24",
    ]);
  });
});

function deps(outcome = "confirmed" as const): PaymentDeps {
  return {
    fulfill: vi.fn().mockResolvedValue(outcome),
    fail: vi.fn().mockResolvedValue(undefined),
    refundPayment: vi.fn().mockResolvedValue(undefined),
    recordRefund: vi.fn().mockResolvedValue(true),
    recordDispute: vi.fn().mockResolvedValue("KS-20301002-6422"),
  };
}

function event(type: string, object: object) {
  return { id: "evt_1", type, data: { object } } as unknown as Stripe.Event;
}

const session = {
  id: "cs_1",
  metadata: { appointment_reference: "KS-20301002-6422" },
  object: "checkout.session",
  payment_status: "paid",
  payment_intent: "pi_1",
  amount_total: 20000,
  currency: "pln",
  customer_email: "jan@example.invalid",
};

describe("handleStripeEvent", () => {
  it("settles a workshop seat's session as a workshop's, failures and refunds both ways", async () => {
    const workshop = {
      settle: vi.fn().mockResolvedValue("confirmed"),
      fail: vi.fn().mockResolvedValue(undefined),
      recordRefund: vi.fn().mockResolvedValue(true),
    };
    const d = { ...deps(), workshop };
    const seat = { ...session, metadata: { workshop_reference: "W2611-004" } };
    await handleStripeEvent(event("checkout.session.completed", seat), d);
    expect(workshop.settle).toHaveBeenCalledWith(seat);
    expect(d.fulfill).not.toHaveBeenCalled();
    await handleStripeEvent(event("checkout.session.expired", seat), d);
    expect(d.fail).toHaveBeenCalledWith("cs_1", "expired");
    expect(workshop.fail).toHaveBeenCalledWith("cs_1", "expired");
    await handleStripeEvent(
      event("charge.refunded", {
        payment_intent: "pi_1",
        amount_refunded: 500,
      }),
      d,
    );
    expect(workshop.recordRefund).toHaveBeenCalledWith("pi_1", 500);
  });

  it("confirms a paid session", async () => {
    const d = deps();
    await handleStripeEvent(event("checkout.session.completed", session), d);
    expect(d.fulfill).toHaveBeenCalledWith("cs_1", true, "pi_1");
  });

  it("waits for BLIK and Przelewy24, then confirms", async () => {
    const d = deps("awaiting_payment" as never);
    await handleStripeEvent(
      event("checkout.session.completed", {
        ...session,
        payment_status: "unpaid",
      }),
      d,
    );
    expect(d.fulfill).toHaveBeenCalledWith("cs_1", false, "pi_1");
    await handleStripeEvent(
      event("checkout.session.async_payment_succeeded", session),
      d,
    );
    expect(d.fulfill).toHaveBeenLastCalledWith("cs_1", true, "pi_1");
  });

  it("sends the confirmation e-mail once the visit is confirmed", async () => {
    const d = { ...deps(), onConfirmed: vi.fn().mockResolvedValue(undefined) };
    await handleStripeEvent(event("checkout.session.completed", session), d);
    expect(d.onConfirmed).toHaveBeenCalledWith("KS-20301002-6422");
    const waiting = {
      ...deps("awaiting_payment" as never),
      onConfirmed: vi.fn(),
    };
    await handleStripeEvent(
      event("checkout.session.completed", {
        ...session,
        payment_status: "unpaid",
      }),
      waiting,
    );
    expect(waiting.onConfirmed).not.toHaveBeenCalled();
  });

  it("refunds money for a time that was lost meanwhile, and tells the client why (Klient · 4, card 17)", async () => {
    const d = { ...deps("slot_lost" as never), onSlotLost: vi.fn() };
    await handleStripeEvent(event("checkout.session.completed", session), d);
    expect(d.refundPayment).toHaveBeenCalledWith(
      "cs_1",
      "pi_1",
      20000,
      "KS-20301002-6422",
    );
    expect(d.onSlotLost).toHaveBeenCalledWith({
      reference: "KS-20301002-6422",
      amountMinor: 20000,
      currencyCode: "pln",
      to: "jan@example.invalid",
      sessionId: "cs_1",
    });
  });

  it("no such e-mail for a second payment of a visit paid, nor for a confirmed one", async () => {
    for (const outcome of ["refund_payment", "confirmed"]) {
      const d = { ...deps(outcome as never), onSlotLost: vi.fn() };
      await handleStripeEvent(event("checkout.session.completed", session), d);
      expect(d.onSlotLost).not.toHaveBeenCalled();
    }
  });

  it("refunds a second payment for a visit already paid", async () => {
    const d = { ...deps("refund_payment" as never), onConfirmed: vi.fn() };
    await handleStripeEvent(event("checkout.session.completed", session), d);
    expect(d.refundPayment).toHaveBeenCalledWith(
      "cs_1",
      "pi_1",
      20000,
      "KS-20301002-6422",
    );
    expect(d.onConfirmed).not.toHaveBeenCalled();
  });

  it("does nothing for a payment settled before (the return page again)", async () => {
    const d = { ...deps("already_settled" as never), onConfirmed: vi.fn() };
    await settleSession(session as never, d);
    expect(d.refundPayment).not.toHaveBeenCalled();
    expect(d.onConfirmed).not.toHaveBeenCalled();
  });

  it("refunds nothing while the money is still on its way", async () => {
    const d = deps("slot_lost" as never);
    await settleSession({ ...session, payment_status: "unpaid" } as never, d);
    expect(d.refundPayment).not.toHaveBeenCalled();
  });

  it("frees the time of a failed or expired session", async () => {
    const d = deps();
    await handleStripeEvent(
      event("checkout.session.async_payment_failed", session),
      d,
    );
    expect(d.fail).toHaveBeenCalledWith("cs_1", "failed");
    await handleStripeEvent(event("checkout.session.expired", session), d);
    expect(d.fail).toHaveBeenLastCalledWith("cs_1", "expired");
  });

  it("records refunds", async () => {
    const d = deps();
    await handleStripeEvent(
      event("charge.refunded", {
        payment_intent: "pi_1",
        amount_refunded: 20000,
      }),
      d,
    );
    expect(d.recordRefund).toHaveBeenCalledWith("pi_1", 20000);
  });

  it("records a dispute when it opens and when it closes", async () => {
    const d = deps();
    const dispute = {
      id: "du_1",
      payment_intent: "pi_1",
      amount: 20000,
      reason: "fraudulent",
      status: "needs_response",
    };
    await handleStripeEvent(event("charge.dispute.created", dispute), d);
    expect(d.recordDispute).toHaveBeenCalledWith({
      paymentIntentId: "pi_1",
      disputeId: "du_1",
      status: "needs_response",
      amountMinor: 20000,
      reason: "fraudulent",
      closed: false,
      reference: null,
    });
    await handleStripeEvent(
      event("charge.dispute.closed", { ...dispute, status: "lost" }),
      d,
    );
    expect(d.recordDispute).toHaveBeenLastCalledWith(
      expect.objectContaining({ status: "lost", closed: true }),
    );
  });

  it("names the visit or the seat a dispute is for (it may come before the payment is settled)", async () => {
    const d = {
      ...deps(),
      paymentReference: vi.fn().mockResolvedValue("W2611-004"),
    };
    await handleStripeEvent(
      event("charge.dispute.created", {
        id: "du_2",
        payment_intent: { id: "pi_2" },
        amount: 8000,
        reason: "general",
        status: "needs_response",
      }),
      d,
    );
    expect(d.paymentReference).toHaveBeenCalledWith("pi_2");
    expect(d.recordDispute).toHaveBeenCalledWith(
      expect.objectContaining({
        paymentIntentId: "pi_2",
        reference: "W2611-004",
      }),
    );
  });

  it("ignores other events", async () => {
    const d = deps();
    await handleStripeEvent(event("customer.created", {}), d);
    expect(d.fulfill).not.toHaveBeenCalled();
    expect(d.fail).not.toHaveBeenCalled();
  });
});

describe("eventFitsKey", () => {
  it("a live event only with a live key, a test one only with a test key", () => {
    expect(eventFitsKey(false, "sk_test_123")).toBe(true);
    expect(eventFitsKey(true, "rk_live_123")).toBe(true);
    expect(eventFitsKey(true, "sk_test_123")).toBe(false);
    expect(eventFitsKey(false, "sk_live_123")).toBe(false);
    expect(eventFitsKey(false, undefined)).toBe(false);
  });
});

describe("stuckSessionAction", () => {
  const intent = (status: string) => ({ id: "pi_1", status });

  it("a payment Stripe settled meanwhile is settled here too", () => {
    expect(
      stuckSessionAction({
        status: "complete",
        payment_status: "paid",
        payment_intent: intent("succeeded"),
      }),
    ).toBe("settle");
  });

  it("a session never paid frees its time", () => {
    expect(
      stuckSessionAction({
        status: "expired",
        payment_status: "unpaid",
        payment_intent: null,
      }),
    ).toBe("expire");
    expect(
      stuckSessionAction({
        status: "complete",
        payment_status: "unpaid",
        payment_intent: intent("canceled"),
      }),
    ).toBe("fail");
    expect(
      stuckSessionAction({
        status: "complete",
        payment_status: "unpaid",
        payment_intent: intent("requires_payment_method"),
      }),
    ).toBe("fail");
  });

  it("money still on its way waits", () => {
    expect(
      stuckSessionAction({
        status: "complete",
        payment_status: "unpaid",
        payment_intent: intent("processing"),
      }),
    ).toBe("wait");
    expect(
      stuckSessionAction({
        status: "open",
        payment_status: "unpaid",
        payment_intent: null,
      }),
    ).toBe("wait");
  });
});
