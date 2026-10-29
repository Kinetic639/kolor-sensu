import { beforeEach, describe, expect, it, vi } from "vitest";

// "Zacznij od nowa" (Klient · 1, card 15): the held time goes back at once,
// with a payment started for it, and every choice is forgotten. The
// database, Stripe and the cookies are stand-ins here; the release itself
// is the database's (booking_domain.sql, H).

const db = vi.hoisted(() => ({
  releaseHold: vi.fn(async () => true),
  pendingCheckoutSession: vi.fn(async (): Promise<string | null> => null),
}));
const hold = vi.hoisted(() => ({
  readHoldToken: vi.fn(async (): Promise<string | null> => null),
  clearHoldToken: vi.fn(async () => {}),
  saveHoldToken: vi.fn(),
  saveFormerHoldToken: vi.fn(),
}));
const jar = vi.hoisted(() => ({ delete: vi.fn(), get: vi.fn() }));
const expireSession = vi.hoisted(() => vi.fn(async () => {}));

vi.mock("@repo/supabase", () => ({
  ...db,
  attachCheckoutSession: vi.fn(),
  BookingError: class extends Error {},
  getBooking: vi.fn(),
  holdSlot: vi.fn(),
  reserveHold: vi.fn(),
  saveBookingDetails: vi.fn(),
}));
vi.mock("@repo/supabase/discount-codes", () => ({}));
vi.mock("@repo/supabase/intakes", () => ({}));
vi.mock("next/headers", () => ({
  cookies: async () => jar,
  headers: async () => new Headers(),
}));
vi.mock("next/navigation", () => ({
  redirect: (href: string) => {
    throw Object.assign(new Error("NEXT_REDIRECT"), { href });
  },
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/server", () => ({ after: vi.fn() }));
vi.mock("@/lib/public-data", () => ({ getBookingWindow: vi.fn() }));
vi.mock("@/lib/stripe", () => ({ stripeServer: vi.fn() }));
vi.mock("@/lib/supabase/secret", () => ({ createSecretClient: () => ({}) }));
vi.mock("./email/confirmation-server", () => ({}));
vi.mock("./guards", () => ({}));
vi.mock("./hold-cookie", () => hold);
vi.mock("./intake-cookie", () => ({}));
vi.mock("./load-wizard", () => ({}));
vi.mock("./payment-server", () => ({ expireSession }));
vi.mock("@/features/newsletter/signup-server", () => ({}));

const { startOverAction } = await import("./actions");

async function startOver() {
  try {
    await startOverAction();
  } catch (error) {
    return (error as { href?: string }).href;
  }
  throw new Error("no redirect");
}

beforeEach(() => vi.clearAllMocks());

describe("startOverAction (card 15)", () => {
  it("gives the held time back at once, stops its payment, forgets the choices", async () => {
    hold.readHoldToken.mockResolvedValue("hold-token");
    db.pendingCheckoutSession.mockResolvedValue("cs_test_1");

    expect(await startOver()).toBe("/umow-wizyte");
    expect(expireSession).toHaveBeenCalledWith("cs_test_1");
    expect(db.releaseHold).toHaveBeenCalledWith({}, "hold-token");
    expect(hold.clearHoldToken).toHaveBeenCalled();
    // Not kept to fill the next booking in: it starts afresh.
    expect(hold.saveFormerHoldToken).not.toHaveBeenCalled();
    expect(jar.delete).toHaveBeenCalledWith({
      name: "ks_wybory",
      path: "/umow-wizyte",
    });
    expect(jar.delete).toHaveBeenCalledWith({
      name: "ks_rezerwacja",
      path: "/",
    });
  });

  it("without a held time, only the choices go", async () => {
    hold.readHoldToken.mockResolvedValue(null);

    expect(await startOver()).toBe("/umow-wizyte");
    expect(db.releaseHold).not.toHaveBeenCalled();
    expect(jar.delete).toHaveBeenCalledTimes(2);
  });

  it("still starts afresh when the time could not be given back", async () => {
    hold.readHoldToken.mockResolvedValue("hold-token");
    db.releaseHold.mockRejectedValueOnce(new Error("network"));

    expect(await startOver()).toBe("/umow-wizyte");
    expect(hold.clearHoldToken).toHaveBeenCalled();
  });
});
