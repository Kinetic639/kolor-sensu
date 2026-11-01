import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Back from Stripe before its confirmation came (Warsztat · 4, card 9): the
// page settles the payment itself; while the bank still works on it, the
// page says so and refreshes itself until the seat is confirmed.

const stripe = vi.hoisted(() => ({ retrieve: vi.fn() }));
vi.mock("@/lib/stripe", () => ({
  stripeServer: () => ({ checkout: { sessions: stripe } }),
}));
const settle = vi.hoisted(() => vi.fn());
vi.mock("@/features/workshops/payment", () => ({
  WORKSHOP_METADATA_KEY: "workshop_reference",
  settleWorkshopSession: settle,
}));
vi.mock("@/features/workshops/payment-server", () => ({
  workshopPaymentDeps: () => ({}),
}));
vi.mock("@/features/workshops/email/send", () => ({
  sendWorkshopEmail: vi.fn(),
}));
vi.mock("@/features/workshops/seat-step", () => ({
  readHeldSeat: async () => null,
}));
vi.mock("@/features/booking/refresh-while-waiting", () => ({
  RefreshWhileWaiting: () => <span>odświeżam</span>,
}));
vi.mock("next/server", () => ({ after: vi.fn() }));
vi.mock("next/navigation", () => ({
  redirect: (href: string) => {
    throw Object.assign(new Error("NEXT_REDIRECT"), { href });
  },
}));

const { default: Page } = await import("./page");

async function open() {
  const page = await Page({
    searchParams: Promise.resolve({ sesja: "cs_test_seat" }),
  } as never);
  return renderToStaticMarkup(page);
}

beforeEach(() => {
  settle.mockReset();
  stripe.retrieve.mockResolvedValue({
    id: "cs_test_seat",
    status: "complete",
    metadata: { workshop_reference: "W2611-004" },
  });
});

describe("the page Stripe returns to after a seat's payment", () => {
  it("waits for the bank, refreshing itself", async () => {
    settle.mockResolvedValue("pending");
    const html = await open();
    expect(settle).toHaveBeenCalledTimes(1);
    expect(html).toContain("Czekamy na potwierdzenie płatności");
    expect(html).toContain("odświeżam");
  });

  it("confirms the seat as soon as the payment is settled, webhook or not", async () => {
    settle.mockResolvedValue("confirmed");
    const html = await open();
    expect(html).toContain("Miejsce potwierdzone");
    expect(html).not.toContain("odświeżam");
  });
});
