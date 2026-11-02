import { beforeEach, describe, expect, it, vi } from "vitest";

// "Zapłać" pressed twice (Warsztat · 4, card 8): the seat's open session is
// used again, so only one payment can be taken; a new one is made only when
// there is none open, and with a key that makes Stripe's answer the same
// for the same seat and price.

const db = vi.hoisted(() => ({
  getWorkshopRegistration: vi.fn(),
  pendingWorkshopCheckout: vi.fn(),
  attachWorkshopCheckout: vi.fn(),
}));
vi.mock("@repo/supabase/workshops", () => ({
  ...db,
  failWorkshopCheckout: vi.fn(),
  fulfillWorkshopCheckout: vi.fn(),
  recordWorkshopRefund: vi.fn(),
  WorkshopError: class extends Error {},
}));
const sessions = vi.hoisted(() => ({ retrieve: vi.fn(), create: vi.fn() }));
vi.mock("@/lib/stripe", () => ({
  stripeServer: () => ({ checkout: { sessions } }),
}));
const expireSession = vi.hoisted(() => vi.fn());
vi.mock("@/features/booking/payment-server", () => ({ expireSession }));
vi.mock("@/features/booking/stripe-refund", () => ({
  refundThroughStripe: vi.fn(),
}));
vi.mock("@/lib/public-data", () => ({
  getBookingWindow: async () => ({ timeZone: "Europe/Warsaw" }),
}));
vi.mock("@/lib/supabase/secret", () => ({ createSecretClient: () => ({}) }));
vi.mock("./email/send", () => ({ sendWorkshopEmail: vi.fn() }));

const { workshopCheckout } = await import("./payment-server");

const registration = {
  reference: "W2611-004",
  priceMinor: 15000,
  currencyCode: "PLN",
  workshopTitle: "Uważność",
  startsAt: "2030-11-10T16:00:00Z",
  endsAt: "2030-11-10T18:00:00Z",
  details: {
    firstName: "Ola",
    lastName: "Nowak",
    email: "ola@example.invalid",
  },
};
const open = {
  id: "cs_open",
  status: "open",
  customer_email: "ola@example.invalid",
  amount_total: 15000,
};

beforeEach(() => {
  vi.clearAllMocks();
  db.getWorkshopRegistration.mockResolvedValue(registration);
  sessions.create.mockResolvedValue({
    id: "cs_new",
    expires_at: 1_900_000_000,
    amount_total: 15000,
    currency: "pln",
  });
});

describe("workshopCheckout", () => {
  it("uses the seat's open session again: one payment for two clicks", async () => {
    db.pendingWorkshopCheckout.mockResolvedValue("cs_open");
    sessions.retrieve.mockResolvedValue(open);

    expect(await workshopCheckout("token", "https://example.invalid")).toBe(
      open,
    );
    expect(sessions.create).not.toHaveBeenCalled();
    expect(expireSession).not.toHaveBeenCalled();
  });

  it("makes a new one only when none is open, with a key for this seat and price", async () => {
    db.pendingWorkshopCheckout.mockResolvedValue(null);

    const session = await workshopCheckout("token", "https://example.invalid");
    expect(session).toMatchObject({ id: "cs_new" });
    expect(sessions.create).toHaveBeenCalledTimes(1);
    expect(sessions.create.mock.calls[0]![1]).toEqual({
      idempotencyKey: expect.stringMatching(
        /^workshop-checkout:W2611-004:15000:\d+$/,
      ),
    });
    expect(db.attachWorkshopCheckout).toHaveBeenCalledWith(
      {},
      "token",
      expect.objectContaining({ sessionId: "cs_new", amountMinor: 15000 }),
    );
  });

  it("closes an open session for another amount before the new one", async () => {
    db.pendingWorkshopCheckout.mockResolvedValue("cs_open");
    sessions.retrieve.mockResolvedValue({ ...open, amount_total: 20000 });

    await workshopCheckout("token", "https://example.invalid");
    expect(expireSession).toHaveBeenCalledWith("cs_open");
    expect(sessions.create).toHaveBeenCalledTimes(1);
  });
});
