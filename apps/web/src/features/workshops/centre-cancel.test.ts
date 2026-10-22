import { beforeEach, describe, expect, it, vi } from "vitest";

// The centre cancels a workshop: the database says who is owed what; each
// paid seat goes back through Stripe and is recorded; a refusal is passed
// on; a failed refund is reported, not thrown.

const cancelWorkshop = vi.fn();
const refundableWorkshopPayments = vi.fn();
const recordWorkshopRefund = vi.fn();
const refundThroughStripe = vi.fn();

class WorkshopAdminError extends Error {
  constructor(readonly code: string) {
    super(code);
  }
}

vi.mock("@repo/supabase/workshops-admin", () => ({
  cancelWorkshop: (...args: unknown[]) => cancelWorkshop(...args),
  refundableWorkshopPayments: (...args: unknown[]) =>
    refundableWorkshopPayments(...args),
  WorkshopAdminError,
}));
vi.mock("@repo/supabase/workshops", () => ({
  recordWorkshopRefund: (...args: unknown[]) => recordWorkshopRefund(...args),
}));
vi.mock("@repo/supabase/public", () => ({
  createSupabasePublicClient: () => ({ asAdmin: true }),
}));
vi.mock("@/features/booking/stripe-refund", () => ({
  refundThroughStripe: (...args: unknown[]) => refundThroughStripe(...args),
}));
vi.mock("@/lib/supabase/environment", () => ({
  getPublicSupabaseEnvironment: () => ({}),
}));
vi.mock("@/lib/supabase/secret", () => ({
  createSecretClient: () => ({ secret: true }),
}));
vi.mock("@/lib/stripe", () => ({ stripeServer: () => ({}) }));

const { cancelWorkshopAsCentre } = await import("./centre-cancel");

beforeEach(() => {
  vi.clearAllMocks();
});

describe("the centre cancels a workshop", () => {
  it("refunds every paid seat in full and records it", async () => {
    cancelWorkshop.mockResolvedValue([
      { registrationId: "r1", reference: "W1", refundMinor: 10000 },
      { registrationId: "r2", reference: "W2", refundMinor: 0 },
    ]);
    refundableWorkshopPayments.mockImplementation(async (_db, id: string) =>
      id === "r1"
        ? [{ paymentIntentId: "pi_1", amountMinor: 10000, refundedMinor: 0 }]
        : [],
    );
    refundThroughStripe.mockResolvedValue(10000);

    const result = await cancelWorkshopAsCentre("w1", "Choroba", "token");

    expect(cancelWorkshop).toHaveBeenCalledWith(
      { asAdmin: true },
      "w1",
      "Choroba",
    );
    expect(refundThroughStripe).toHaveBeenCalledWith({}, "pi_1", 10000, {
      reference: "W1",
      idempotencyKey: "workshop-cancelled:pi_1",
    });
    expect(recordWorkshopRefund).toHaveBeenCalledWith(
      { secret: true },
      "pi_1",
      10000,
    );
    expect(result).toEqual({ ok: true, refunded: 2, refundFailed: false });
  });

  it("passes the database's refusal on", async () => {
    cancelWorkshop.mockRejectedValue(new WorkshopAdminError("forbidden"));
    expect(await cancelWorkshopAsCentre("w1", null, "token")).toEqual({
      ok: false,
      code: "forbidden",
    });
  });

  it("reports a refund that failed", async () => {
    cancelWorkshop.mockResolvedValue([
      { registrationId: "r1", reference: "W1", refundMinor: 10000 },
    ]);
    refundableWorkshopPayments.mockResolvedValue([
      { paymentIntentId: "pi_1", amountMinor: 10000, refundedMinor: 0 },
    ]);
    refundThroughStripe.mockRejectedValue(new Error("Stripe down"));
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect(await cancelWorkshopAsCentre("w1", null, "token")).toEqual({
      ok: true,
      refunded: 0,
      refundFailed: true,
    });
  });
});
