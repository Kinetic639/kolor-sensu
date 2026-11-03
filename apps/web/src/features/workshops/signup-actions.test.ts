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
  getWorkshopRegistration: vi.fn(
    async (): Promise<{ priceMinor: number; reference: string } | null> => ({
      priceMinor: 10000,
      reference: "W2611-001",
    }),
  ),
  reserveWorkshopSeat: vi.fn(async () => ({
    reference: "W2611-001",
    paymentDueAt: "2030-11-05T16:00:00Z" as string | null,
    confirmBy: "2030-11-01T10:30:00Z" as string | null,
    outcome: "reserved" as "reserved" | "pay_now",
  })),
  confirmFreeWorkshopSeat: vi.fn(async () => ({
    reference: "W2611-001",
    confirmBy: "2030-11-01T10:30:00Z" as string | null,
  })),
}));
const mail = vi.hoisted(() => ({
  claimWorkshopEmailLink: vi.fn(async () => "mail-token"),
  sendWorkshopEmail: vi.fn(),
}));
const checkout = vi.hoisted(() => vi.fn(async () => ({ id: "cs_test" })));
const cookie = vi.hoisted(() => ({
  clearSeatToken: vi.fn(),
  readSeatToken: vi.fn(async () => "seat-token"),
  saveSeatToken: vi.fn(),
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
vi.mock("./email/send", () => mail);
vi.mock("./payment-server", () => ({ workshopCheckout: checkout }));
vi.mock("./seat-cookie", () => cookie);

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

/** Where the action sent the browser. */
async function landing(run: () => Promise<unknown>) {
  try {
    await run();
  } catch (error) {
    return (error as { href?: string }).href;
  }
  return undefined;
}

describe("a seat taken with a made-up address (#269, Warsztat · 5, card 5)", () => {
  it("sends the link to confirm a seat paid later by e-mail only", async () => {
    const href = await landing(() =>
      saveSeatDetailsAction(
        { status: "idle" },
        form({ ...details, zamiar: "pozniej" }),
      ),
    );
    expect(href).toBe("/warsztaty/potwierdzenie?sprawdz=1");
    expect(db.reserveWorkshopSeat).toHaveBeenCalledWith(
      expect.anything(),
      "seat-token",
      "visitor",
    );
    expect(mail.sendWorkshopEmail).toHaveBeenCalledWith(
      "W2611-001",
      "reserved",
    );
    expect(mail.claimWorkshopEmailLink).not.toHaveBeenCalled();
    expect(cookie.clearSeatToken).toHaveBeenCalled();
  });

  it("asks for the payment now from someone with two unpaid seats", async () => {
    db.reserveWorkshopSeat.mockResolvedValueOnce({
      reference: "W2611-001",
      paymentDueAt: null,
      confirmBy: null,
      outcome: "pay_now",
    });
    const href = await landing(() =>
      saveSeatDetailsAction(
        { status: "idle" },
        form({ ...details, zamiar: "pozniej" }),
      ),
    );
    expect(href).toBe("/warsztaty/uwaznosc/platnosc");
    expect(checkout).toHaveBeenCalled();
    expect(mail.sendWorkshopEmail).not.toHaveBeenCalled();
  });

  it("sends the link to confirm a free seat by e-mail only", async () => {
    db.getWorkshopRegistration.mockResolvedValueOnce({
      priceMinor: 0,
      reference: "W2611-001",
    });
    const href = await landing(() =>
      saveSeatDetailsAction({ status: "idle" }, form(details)),
    );
    expect(href).toBe("/warsztaty/potwierdzenie?sprawdz=1");
    expect(db.confirmFreeWorkshopSeat).toHaveBeenCalledWith(
      expect.anything(),
      "seat-token",
      "visitor",
    );
    expect(mail.sendWorkshopEmail).toHaveBeenCalledWith(
      "W2611-001",
      "reserved",
    );
    expect(mail.sendWorkshopEmail).not.toHaveBeenCalledWith(
      "W2611-001",
      "confirmation",
    );
  });

  it("says to confirm the earlier ones first after two free seats waiting", async () => {
    db.getWorkshopRegistration.mockResolvedValueOnce({
      priceMinor: 0,
      reference: "W2611-001",
    });
    const { WorkshopError } = await import("@repo/supabase/workshops");
    db.confirmFreeWorkshopSeat.mockRejectedValueOnce(
      Object.assign(new WorkshopError("too_many_unconfirmed", "two waiting"), {
        code: "too_many_unconfirmed",
      }),
    );
    const href = await landing(() =>
      saveSeatDetailsAction({ status: "idle" }, form(details)),
    );
    expect(href).toBe("/warsztaty/uwaznosc?zapis=niepotwierdzone#zapis");
  });
});
