import { beforeEach, describe, expect, it, vi } from "vitest";

// The e-mail's link to pay a reservation (Klient · 5, card 10): opened
// after the visit was paid, it leads to the visit's page saying so; for a
// reservation still to pay, it shows the payment.

const guest = vi.hoisted(() => ({ visitByLinkToken: vi.fn() }));
vi.mock("@/features/booking/guest-visit", () => guest);
vi.mock("next/navigation", () => ({
  notFound: () => {
    throw Object.assign(new Error("NEXT_NOT_FOUND"), { href: "404" });
  },
  redirect: (href: string) => {
    throw Object.assign(new Error("NEXT_REDIRECT"), { href });
  },
}));
const reservation = vi.hoisted(() => ({
  pendingReservationPayment: vi.fn(async () => null),
}));
vi.mock("@repo/supabase", () => reservation);
vi.mock("@/lib/supabase/secret", () => ({ createSecretClient: () => ({}) }));
vi.mock("@/lib/stripe", () => ({ stripeServer: vi.fn() }));
vi.mock("@/features/booking/centre-phone", () => ({
  centrePhone: async () => null,
}));
vi.mock("@/features/booking/payment-form", () => ({ PaymentForm: () => null }));
vi.mock("@/features/booking/reservation-payment-form", () => ({
  ReservationPaymentForm: () => null,
}));

const { default: Page } = await import("./page");

const policy = {
  cancellationWindowHours: 24,
  rescheduleWindowHours: 24,
  maxSelfReschedules: 1,
};
const booking = {
  reference: "2610-030",
  startsAt: new Date(Date.now() + 5 * 86_400_000).toISOString(),
  rescheduleCount: 0,
  priceMinor: 15000,
  currencyCode: "PLN",
};

async function open() {
  try {
    await Page({
      params: Promise.resolve({ token: "link-token" }),
    } as never);
  } catch (error) {
    return (error as { href?: string }).href;
  }
  return "the payment";
}

beforeEach(() => guest.visitByLinkToken.mockReset());

describe("/wizyta/[token]/platnosc", () => {
  it("after paying, leads to the visit's page saying it is paid already", async () => {
    guest.visitByLinkToken.mockResolvedValue({
      booking: {
        ...booking,
        status: "confirmed",
        paid: true,
        paymentDueAt: null,
      },
      timeZone: "Europe/Warsaw",
      policy,
    });
    expect(await open()).toBe("/wizyta/link-token?zmiana=oplacona");
  });

  it("a cancelled reservation goes back to the visit's page as it is", async () => {
    guest.visitByLinkToken.mockResolvedValue({
      booking: {
        ...booking,
        status: "cancelled",
        paid: false,
        paymentDueAt: new Date(Date.now() - 3_600_000).toISOString(),
      },
      timeZone: "Europe/Warsaw",
      policy,
    });
    expect(await open()).toBe("/wizyta/link-token");
  });
});
