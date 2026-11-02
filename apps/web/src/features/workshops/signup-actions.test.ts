import { beforeEach, describe, expect, it, vi } from "vitest";

// A bot at a workshop's sign-up (Warsztat · 10, card 2): no seat is held
// without Cloudflare's check passing, and details with the hidden field
// filled go nowhere. The database and the cookies are stand-ins; the
// check itself is tested in booking/guards.test.ts, the hidden field in
// booking/details-form-data.test.ts.

const db = vi.hoisted(() => ({
  holdWorkshopSeat: vi.fn(async () => ({ accessToken: "seat-token" })),
  joinWorkshopWaitlist: vi.fn(),
  saveWorkshopDetails: vi.fn(),
}));
const human = vi.hoisted(() => vi.fn(async () => false));

vi.mock("@repo/supabase/workshops", () => ({
  ...db,
  WorkshopError: class extends Error {
    code = "unknown";
  },
}));
vi.mock("@repo/supabase/discount-codes", () => ({}));
vi.mock("next/headers", () => ({ headers: async () => new Headers() }));
vi.mock("next/navigation", () => ({
  redirect: (href: string) => {
    throw Object.assign(new Error("NEXT_REDIRECT"), { href });
  },
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/server", () => ({ after: vi.fn() }));
vi.mock("@/features/booking/guards", () => ({
  clientIp: () => "203.0.113.1",
  holdKey: () => "visitor",
  turnstileKeys: () => ({ siteKey: "site", secretKey: "secret" }),
  verifyTurnstile: human,
}));
vi.mock("@/features/booking/payment-server", () => ({
  expireSession: vi.fn(),
}));
vi.mock("@/features/newsletter/signup-server", () => ({}));
vi.mock("@/lib/supabase/secret", () => ({ createSecretClient: () => ({}) }));
vi.mock("./email/send", () => ({
  claimWorkshopEmailLink: vi.fn(),
  sendWorkshopEmail: vi.fn(),
}));
vi.mock("./payment-server", () => ({ workshopCheckout: vi.fn() }));
vi.mock("./seat-cookie", () => ({
  clearSeatToken: vi.fn(),
  readSeatToken: vi.fn(async () => "seat-token"),
  saveSeatToken: vi.fn(),
}));

const { holdSeatAction, joinWaitlistAction, saveSeatDetailsAction } =
  await import("./actions");

function form(fields: Record<string, string>) {
  const data = new FormData();
  for (const [name, value] of Object.entries(fields)) data.set(name, value);
  return data;
}

const details = {
  slug: "uwaznosc",
  firstName: "Ola",
  lastName: "Nowak",
  email: "ola@example.invalid",
  phone: "500600700",
  acceptTerms: "on",
  acceptPrivacy: "on",
};

beforeEach(() => {
  vi.clearAllMocks();
  human.mockResolvedValue(false);
});

describe("a bot at a workshop's sign-up (Warsztat · 10, card 2)", () => {
  it("holds no seat without Cloudflare's check", async () => {
    let href: string | undefined;
    try {
      await holdSeatAction(
        form({ slug: "uwaznosc", "cf-turnstile-response": "" }),
      );
    } catch (error) {
      href = (error as { href?: string }).href;
    }
    expect(href).toBe("/warsztaty/uwaznosc?zapis=weryfikacja#zapis");
    expect(db.holdWorkshopSeat).not.toHaveBeenCalled();
  });

  it("saves nothing from details with the hidden field filled", async () => {
    const bot = form({ ...details, website: "http://spam.example.invalid" });
    expect(await saveSeatDetailsAction({ status: "idle" }, bot)).toEqual({
      status: "idle",
    });
    expect(await joinWaitlistAction({ status: "idle" }, bot)).toEqual({
      status: "idle",
    });
    expect(db.saveWorkshopDetails).not.toHaveBeenCalled();
    expect(db.joinWorkshopWaitlist).not.toHaveBeenCalled();
  });
});
