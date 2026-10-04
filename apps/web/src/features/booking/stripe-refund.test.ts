import { describe, expect, it, vi } from "vitest";
import { refundThroughStripe, type RefundingStripe } from "./stripe-refund";

// Giving money back through Stripe: the refund, then all refunded on the
// payment so far; and when Stripe has given it back already (a refund made
// in its dashboard, its webhook never received), what it holds instead.

const options = { reference: "2610-004", idempotencyKey: "refund:2610-004" };

function stripeWith({
  create,
  charge,
}: {
  create: RefundingStripe["refunds"]["create"];
  charge: { amount: number; amount_refunded: number };
}): RefundingStripe {
  return {
    refunds: { create },
    charges: { retrieve: vi.fn().mockResolvedValue(charge) },
    paymentIntents: {
      retrieve: vi.fn().mockResolvedValue({ latest_charge: charge }),
    },
  };
}

class StripeInvalidRequestError extends Error {
  type = "StripeInvalidRequestError";
  constructor(public code: string) {
    super(code);
  }
}

describe("refundThroughStripe", () => {
  it("refunds, and answers all refunded on the payment so far", async () => {
    const create = vi.fn().mockResolvedValue({ amount: 5000, charge: "ch_1" });
    const stripe = stripeWith({
      create,
      charge: { amount: 20000, amount_refunded: 15000 },
    });
    await expect(
      refundThroughStripe(stripe, "pi_1", 5000, options),
    ).resolves.toBe(15000);
    expect(create).toHaveBeenCalledWith(
      {
        payment_intent: "pi_1",
        amount: 5000,
        reason: "requested_by_customer",
        metadata: { appointment_reference: "2610-004" },
      },
      { idempotencyKey: "refund:2610-004" },
    );
  });

  it("given back already elsewhere: what Stripe holds, nothing refunded twice", async () => {
    const stripe = stripeWith({
      create: vi
        .fn()
        .mockRejectedValue(
          new StripeInvalidRequestError("charge_already_refunded"),
        ),
      charge: { amount: 24000, amount_refunded: 24000 },
    });
    await expect(
      refundThroughStripe(stripe, "pi_1", 24000, options),
    ).resolves.toBe(24000);
  });

  it("partly given back elsewhere, less left than asked: what Stripe holds", async () => {
    const stripe = stripeWith({
      create: vi
        .fn()
        .mockRejectedValue(new StripeInvalidRequestError("amount_too_large")),
      charge: { amount: 24000, amount_refunded: 10000 },
    });
    await expect(
      refundThroughStripe(stripe, "pi_1", 24000, options),
    ).resolves.toBe(10000);
  });

  it("refused for any other reason: the error goes on", async () => {
    const refused = new StripeInvalidRequestError("resource_missing");
    const stripe = stripeWith({
      create: vi.fn().mockRejectedValue(refused),
      charge: { amount: 24000, amount_refunded: 0 },
    });
    await expect(
      refundThroughStripe(stripe, "pi_1", 24000, options),
    ).rejects.toBe(refused);
  });

  it("a network failure is not mistaken for a refund elsewhere", async () => {
    const down = new Error("ECONNRESET");
    const stripe = stripeWith({
      create: vi.fn().mockRejectedValue(down),
      charge: { amount: 24000, amount_refunded: 24000 },
    });
    await expect(
      refundThroughStripe(stripe, "pi_1", 24000, options),
    ).rejects.toBe(down);
  });
});
