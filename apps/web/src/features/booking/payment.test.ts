import type { GuestBooking } from "@repo/supabase";
import type Stripe from "stripe";
import { describe, expect, it, vi } from "vitest";
import {
  checkoutSessionParams,
  handleStripeEvent,
  type PaymentDeps,
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
    email: "jan@example.com",
    phone: "600100200",
    notes: null,
  },
  rescheduleCount: 0,
  cancelledBy: null,
  refundDueMinor: null,
  refundedMinor: 0,
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
});

function deps(outcome = "confirmed" as const): PaymentDeps {
  return {
    fulfill: vi.fn().mockResolvedValue(outcome),
    fail: vi.fn().mockResolvedValue(undefined),
    refundLostSlot: vi.fn().mockResolvedValue(undefined),
    recordRefund: vi.fn().mockResolvedValue(true),
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
};

describe("handleStripeEvent", () => {
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

  it("refunds money for a time that was lost meanwhile", async () => {
    const d = deps("slot_lost" as never);
    await handleStripeEvent(event("checkout.session.completed", session), d);
    expect(d.refundLostSlot).toHaveBeenCalledWith("cs_1", "pi_1");
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

  it("ignores other events", async () => {
    const d = deps();
    await handleStripeEvent(event("customer.created", {}), d);
    expect(d.fulfill).not.toHaveBeenCalled();
    expect(d.fail).not.toHaveBeenCalled();
  });
});
