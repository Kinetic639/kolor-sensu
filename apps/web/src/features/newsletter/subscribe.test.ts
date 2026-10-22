import { NewsletterRateLimitedError } from "@repo/supabase/newsletter";
import { describe, expect, it, vi } from "vitest";
import {
  hashToken,
  subscribeToNewsletter,
  type SubscribeDeps,
} from "./subscribe";

function form(fields: Record<string, string>) {
  const data = new FormData();
  for (const [name, value] of Object.entries(fields)) data.set(name, value);
  return data;
}

const filled = {
  email: " ola@example.invalid ",
  consent: "on",
  source: "home",
  "cf-turnstile-response": "token",
};

function deps(overrides: Partial<SubscribeDeps> = {}): SubscribeDeps {
  return {
    verify: vi.fn(async () => true),
    senderKey: "k".repeat(64),
    controller: "Kolor Sensu sp. z o.o.",
    siteUrl: "https://kolorsensu.pl",
    save: vi.fn(async () => "send" as const),
    markSent: vi.fn(async () => {}),
    send: vi.fn(async () => {}),
    token: () => "abc",
    ...overrides,
  };
}

describe("subscribeToNewsletter", () => {
  it("saves the sign-up with its consent and sends the link", async () => {
    const d = deps();
    expect(await subscribeToNewsletter(form(filled), d)).toEqual({
      status: "sent",
    });
    expect(d.save).toHaveBeenCalledWith({
      email: "ola@example.invalid",
      source: "home",
      consentText: expect.stringContaining(
        "Administratorem danych jest Kolor Sensu sp. z o.o.",
      ),
      consentVersion: "2026-10-22",
      senderKey: "k".repeat(64),
      tokenHash: hashToken("abc"),
    });
    expect(d.send).toHaveBeenCalledWith(
      "ola@example.invalid",
      expect.objectContaining({
        manageUrl: "https://kolorsensu.pl/newsletter/potwierdz?token=abc",
      }),
      `newsletter-confirm-${hashToken("abc").slice(0, 32)}`,
    );
    expect(d.markSent).toHaveBeenCalledWith("ola@example.invalid");
  });

  it("tells a bot it worked and keeps nothing", async () => {
    const d = deps();
    expect(
      await subscribeToNewsletter(form({ ...filled, website: "spam" }), d),
    ).toEqual({ status: "sent" });
    expect(d.verify).not.toHaveBeenCalled();
    expect(d.save).not.toHaveBeenCalled();
  });

  it("asks for the consent and a correct address", async () => {
    const d = deps();
    const result = await subscribeToNewsletter(
      form({ email: "ola", source: "footer" }),
      d,
    );
    expect(result).toEqual({
      status: "invalid",
      errors: {
        email: "Podaj poprawny adres e-mail",
        consent: "Zaznacz zgodę, żeby zapisać się na newsletter",
      },
      email: "ola",
    });
    expect(d.save).not.toHaveBeenCalled();
  });

  it("stops when Turnstile does not pass", async () => {
    const d = deps({ verify: vi.fn(async () => false) });
    expect((await subscribeToNewsletter(form(filled), d)).status).toBe(
      "unverified",
    );
    expect(d.save).not.toHaveBeenCalled();
  });

  it("says the same and sends nothing to an address already on the list", async () => {
    for (const answer of ["active", "wait"] as const) {
      const d = deps({ save: vi.fn(async () => answer) });
      expect(await subscribeToNewsletter(form(filled), d)).toEqual({
        status: "sent",
      });
      expect(d.send).not.toHaveBeenCalled();
    }
  });

  it("says when there were too many sign-ups", async () => {
    const d = deps({
      save: vi.fn(async () => {
        throw new NewsletterRateLimitedError();
      }),
    });
    expect((await subscribeToNewsletter(form(filled), d)).status).toBe(
      "limited",
    );
  });

  it("says it failed when the e-mail does not go, and records nothing", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const d = deps({
      send: vi.fn(async () => {
        throw new Error("Resend down");
      }),
    });
    expect((await subscribeToNewsletter(form(filled), d)).status).toBe(
      "failed",
    );
    expect(d.markSent).not.toHaveBeenCalled();
  });
});
