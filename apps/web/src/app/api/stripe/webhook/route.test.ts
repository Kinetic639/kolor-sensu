import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// The webhook's own rules (audit of 22.10): no signature or a wrong one is
// refused, an event of the other mode is ignored, each event is handled
// once, and a failure gives the event back with a 500 so Stripe retries.

const supabase = vi.hoisted(() => ({
  claimStripeEvent: vi.fn(),
  releaseStripeEvent: vi.fn(),
}));
const payment = vi.hoisted(() => ({ handleStripeEvent: vi.fn() }));
const constructEvent = vi.hoisted(() => vi.fn());

vi.mock("@repo/supabase", () => supabase);
vi.mock("@/features/booking/payment", async (original) => ({
  ...(await original<typeof import("@/features/booking/payment")>()),
  handleStripeEvent: payment.handleStripeEvent,
}));
vi.mock("@/features/booking/payment-server", () => ({
  paymentDeps: () => ({}),
}));
vi.mock("@/lib/stripe", () => ({
  stripeServer: () => ({ webhooks: { constructEvent } }),
}));
vi.mock("@/lib/supabase/secret", () => ({ createSecretClient: () => ({}) }));

const { POST } = await import("./route");

const post = (signature: string | null = "t=1,v1=abc") =>
  POST(
    new Request("https://kolorsensu.pl/api/stripe/webhook", {
      method: "POST",
      body: "{}",
      headers: signature ? { "stripe-signature": signature } : {},
    }),
  );

const event = (livemode = false) => ({
  id: "evt_1",
  type: "checkout.session.completed",
  livemode,
  data: { object: {} },
});

beforeEach(() => {
  vi.stubEnv("STRIPE_WEBHOOK_SECRET", "whsec_test");
  vi.stubEnv("STRIPE_SECRET_KEY", "sk_test_123");
  supabase.claimStripeEvent.mockResolvedValue(true);
  supabase.releaseStripeEvent.mockResolvedValue(undefined);
  payment.handleStripeEvent.mockResolvedValue(undefined);
  constructEvent.mockReturnValue(event());
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.clearAllMocks();
});

describe("the Stripe webhook", () => {
  it("refuses a request without a signature", async () => {
    expect((await post(null)).status).toBe(400);
    expect(payment.handleStripeEvent).not.toHaveBeenCalled();
  });

  it("refuses a wrong signature", async () => {
    constructEvent.mockImplementation(() => {
      throw new Error("No signatures found");
    });
    expect((await post()).status).toBe(400);
    expect(supabase.claimStripeEvent).not.toHaveBeenCalled();
  });

  it("ignores an event of the other mode (a live one on test keys)", async () => {
    constructEvent.mockReturnValue(event(true));
    const response = await post();
    expect(response.status).toBe(200);
    expect(supabase.claimStripeEvent).not.toHaveBeenCalled();
    expect(payment.handleStripeEvent).not.toHaveBeenCalled();
  });

  it("handles an event once", async () => {
    expect((await post()).status).toBe(200);
    expect(payment.handleStripeEvent).toHaveBeenCalledTimes(1);
    supabase.claimStripeEvent.mockResolvedValue(false);
    expect((await post()).status).toBe(200);
    expect(payment.handleStripeEvent).toHaveBeenCalledTimes(1);
  });

  it("a failure gives the event back and answers 500, so Stripe retries", async () => {
    payment.handleStripeEvent.mockRejectedValue(new Error("database down"));
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect((await post()).status).toBe(500);
    expect(supabase.releaseStripeEvent).toHaveBeenCalledWith({}, "evt_1");
  });
});
