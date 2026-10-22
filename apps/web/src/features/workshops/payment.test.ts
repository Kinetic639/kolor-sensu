import { describe, expect, it, vi } from "vitest";
import {
  isWorkshopSession,
  settleWorkshopSession,
  workshopCheckoutParams,
} from "./payment";

const registration = {
  reference: "W2611-004",
  priceMinor: 15000,
  currencyCode: "PLN",
  workshopTitle: "Uważność",
  details: { name: "Ola", email: "ola@example.invalid", phone: "500600700" },
};

describe("a workshop's Checkout Session", () => {
  it("asks for the seat's price, in card, BLIK or Przelewy24, marked as a workshop's", () => {
    const params = workshopCheckoutParams({
      registration,
      returnUrl: "https://site.example.invalid/warsztaty/potwierdzenie",
      dateLabel: "wtorek, 12 listopada 2030, 17:00–19:00",
      now: new Date("2030-11-01T10:00:00Z"),
    });
    expect(params.line_items?.[0]?.price_data).toMatchObject({
      currency: "pln",
      unit_amount: 15000,
      product_data: { name: "Warsztat: Uważność" },
    });
    expect(params.allowed_payment_method_types).toEqual([
      "card",
      "blik",
      "p24",
    ]);
    expect(params.customer_email).toBe("ola@example.invalid");
    expect(params.metadata).toEqual({ workshop_reference: "W2611-004" });
    expect(params.return_url).toBe(
      "https://site.example.invalid/warsztaty/potwierdzenie?sesja={CHECKOUT_SESSION_ID}",
    );
    expect(params.expires_at).toBe(
      Math.floor(new Date("2030-11-01T10:31:00Z").getTime() / 1000),
    );
    expect(
      isWorkshopSession({
        metadata: params.metadata as Record<string, string>,
      }),
    ).toBe(true);
    expect(
      isWorkshopSession({ metadata: { appointment_reference: "x" } }),
    ).toBe(false);
  });
});

describe("settling a session", () => {
  const session = {
    id: "cs_1",
    payment_status: "paid" as const,
    payment_intent: "pi_1",
    metadata: { workshop_reference: "W2611-004" },
  };

  it("confirms the seat and sends its e-mail", async () => {
    const deps = {
      fulfill: vi.fn().mockResolvedValue("confirmed"),
      refundLostSeat: vi.fn(),
      onConfirmed: vi.fn(),
    };
    expect(await settleWorkshopSession(session, deps)).toBe("confirmed");
    expect(deps.fulfill).toHaveBeenCalledWith("cs_1", true, "pi_1");
    expect(deps.onConfirmed).toHaveBeenCalledWith("W2611-004");
    expect(deps.refundLostSeat).not.toHaveBeenCalled();
  });

  it("refunds a seat lost meanwhile, and sends nothing", async () => {
    const deps = {
      fulfill: vi.fn().mockResolvedValue("seat_lost"),
      refundLostSeat: vi.fn(),
      onConfirmed: vi.fn(),
    };
    await settleWorkshopSession(session, deps);
    expect(deps.refundLostSeat).toHaveBeenCalledWith("cs_1", "pi_1");
    expect(deps.onConfirmed).not.toHaveBeenCalled();
  });
});
