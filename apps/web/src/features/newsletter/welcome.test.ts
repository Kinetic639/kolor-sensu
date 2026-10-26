import { beforeEach, describe, expect, it, vi } from "vitest";

// The welcome after a confirmed sign-up: what it says (what comes, how
// often, how to leave, where to start), and that it goes once, only when
// the confirmation went through, with the address copied to Resend; a
// failed welcome or copy does not undo the confirmation. The database,
// Resend and the schedule stand in.

const confirmed = vi.fn();
vi.mock("@repo/supabase/newsletter", () => ({
  confirmNewsletterSubscription: confirmed,
  unsubscribeNewsletter: vi.fn(),
}));
vi.mock("next/headers", () => ({ headers: async () => new Headers() }));
vi.mock("@/features/booking/guards", () => ({
  clientIp: () => "203.0.113.1",
  turnstileKeys: () => ({ secretKey: "x" }),
  verifyTurnstile: vi.fn(),
}));
vi.mock("@/features/booking/email/confirmation-server", () => ({
  siteUrl: () => "https://kolorsensu.example.invalid",
}));
vi.mock("@/lib/supabase/secret", () => ({ createSecretClient: () => ({}) }));
const sync = vi.fn(async () => undefined);
vi.mock("./server", () => ({ syncNewsletterNow: sync }));
const send = vi.fn(async () => undefined);
vi.mock("./signup-server", () => ({
  newsletterSignupDeps: vi.fn(),
  sendNewsletterEmail: send,
}));

const { newsletterWelcomeContent } = await import("./confirmation-email");
const { confirmNewsletterAction } = await import("./actions");

const form = (token: string) => {
  const data = new FormData();
  data.set("token", token);
  return data;
};
const idle = { status: "idle" } as const;

beforeEach(() => {
  confirmed.mockReset();
  send.mockReset().mockResolvedValue(undefined);
  sync.mockReset().mockResolvedValue(undefined);
});

describe("the welcome e-mail", () => {
  it("says what comes, how often and how to leave, and where to start", () => {
    const welcome = newsletterWelcomeContent(
      "https://kolorsensu.example.invalid",
    );
    expect(welcome.subject).toBe("Witaj w newsletterze Kolor Sensu");
    expect(welcome.intro).toMatch(/raz w miesiącu/);
    expect(welcome.intro).toMatch(/artykułach, warsztatach/);
    expect(welcome.note).toMatch(/Wypisać się możesz w każdej chwili/);
    expect(welcome.manageUrl).toBe(
      "https://kolorsensu.example.invalid/edukacja",
    );
    expect(welcome.buttonLabel).toBe("Przeczytaj artykuły");
    expect(welcome.text).toContain(welcome.intro);
    expect(welcome.text).toContain(welcome.note);
  });
});

describe("confirming sends the welcome", () => {
  it("once, to the confirmed address, and copies it to Resend", async () => {
    confirmed.mockResolvedValue({
      outcome: "confirmed",
      email: "anna@example.invalid",
    });
    expect(await confirmNewsletterAction(idle, form("token-1"))).toEqual({
      status: "confirmed",
    });
    expect(send).toHaveBeenCalledTimes(1);
    const [to, content, key] = send.mock.calls[0] as unknown as [
      string,
      { subject: string },
      string,
    ];
    expect(to).toBe("anna@example.invalid");
    expect(content.subject).toBe("Witaj w newsletterze Kolor Sensu");
    // The same link clicked twice sends one welcome.
    expect(key).toMatch(/^newsletter-welcome-[0-9a-f]{32}$/);
    expect(sync).toHaveBeenCalledTimes(1);
  });

  it("not for an address already on the list, nor for a dead link", async () => {
    for (const outcome of ["already", "unknown"] as const) {
      confirmed.mockResolvedValue({ outcome, email: "anna@example.invalid" });
      expect(await confirmNewsletterAction(idle, form("token-2"))).toEqual({
        status: outcome,
      });
    }
    expect(send).not.toHaveBeenCalled();
    expect(sync).not.toHaveBeenCalled();
  });

  it("not without a token, nor when the database fails", async () => {
    expect(await confirmNewsletterAction(idle, form(""))).toEqual({
      status: "unknown",
    });
    confirmed.mockRejectedValue(new Error("down"));
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect(await confirmNewsletterAction(idle, form("token-3"))).toEqual({
      status: "failed",
    });
    expect(send).not.toHaveBeenCalled();
  });

  it("keeps the confirmation when the welcome or the copy fails", async () => {
    confirmed.mockResolvedValue({
      outcome: "confirmed",
      email: "anna@example.invalid",
    });
    send.mockRejectedValue(new Error("Resend down"));
    sync.mockRejectedValue(new Error("Resend down"));
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect(await confirmNewsletterAction(idle, form("token-4"))).toEqual({
      status: "confirmed",
    });
  });
});
