import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Where Stripe returns the client (Klient · 9, card 19): the payment's
// number in the address is not enough to see a visit. Only the browser
// that booked it (its cookie) sees the visit, and only the one this payment
// was for; anyone else gets the payment's outcome and nothing more.

const stripe = vi.hoisted(() => ({ retrieve: vi.fn() }));
vi.mock("@/lib/stripe", () => ({
  stripeServer: () => ({ checkout: { sessions: stripe } }),
}));
const guest = vi.hoisted(() => ({ readGuestVisit: vi.fn() }));
vi.mock("@/features/booking/booking-step", () => ({
  ...guest,
  BookingStep: ({ visit }: { visit: { booking: { reference: string } } }) => (
    <p>Wizyta {visit.booking.reference}</p>
  ),
}));
vi.mock("@/features/booking/payment", () => ({
  settleSession: async () => "already_settled",
}));
vi.mock("@/features/booking/payment-server", () => ({
  paymentDeps: () => ({}),
}));
vi.mock("@/features/booking/email/confirmation-server", () => ({
  sendVisitConfirmation: vi.fn(),
}));
vi.mock("@/features/booking/refresh-while-waiting", () => ({
  RefreshWhileWaiting: () => null,
}));
vi.mock("@/features/booking/remember-choices", () => ({
  ResumeBooking: () => null,
}));
vi.mock("next/server", () => ({ after: vi.fn() }));
vi.mock("next/navigation", () => ({
  redirect: (href: string) => {
    throw Object.assign(new Error("NEXT_REDIRECT"), { href });
  },
}));

const { default: Page } = await import("./page");

const mine = {
  booking: { reference: "2611-001", status: "confirmed", clientName: "Ola" },
};

async function open(sesja: string) {
  const page = await Page({
    searchParams: Promise.resolve({ sesja }),
  } as never);
  return renderToStaticMarkup(page);
}

beforeEach(() => {
  stripe.retrieve.mockReset();
  guest.readGuestVisit.mockResolvedValue(mine);
});

describe("the page Stripe returns to", () => {
  it("shows the visit to the browser that booked it", async () => {
    stripe.retrieve.mockResolvedValue({
      status: "complete",
      metadata: { appointment_reference: "2611-001" },
    });
    expect(await open("cs_test_mine")).toContain("Wizyta 2611-001");
  });

  it("another payment's number shows no visit, neither its own nor this browser's", async () => {
    stripe.retrieve.mockResolvedValue({
      status: "complete",
      metadata: { appointment_reference: "2611-099" },
    });
    const html = await open("cs_test_someone_else");
    expect(html).not.toContain("2611-099");
    expect(html).not.toContain("Wizyta");
    expect(html).toContain("Ta płatność jest już rozliczona");

    guest.readGuestVisit.mockResolvedValue(null);
    expect(await open("cs_test_someone_else")).not.toContain("Wizyta");
  });

  it("a made-up number leads back to the wizard", async () => {
    stripe.retrieve.mockRejectedValue(new Error("No such checkout.session"));
    await expect(open("cs_test_made_up")).rejects.toMatchObject({
      href: "/umow-wizyte",
    });
    await expect(open("not-a-session")).rejects.toMatchObject({
      href: "/umow-wizyte",
    });
  });
});
