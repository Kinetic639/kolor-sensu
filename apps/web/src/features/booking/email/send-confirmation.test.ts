import type { ClaimedBookingEmail } from "@repo/supabase";
import { describe, expect, it, vi } from "vitest";
import {
  sendConfirmationEmail,
  type ConfirmationEmailDeps,
} from "./send-confirmation";

const claimed: ClaimedBookingEmail = {
  reference: "KS-20301002-1534",
  mode: "online",
  startsAt: "2030-10-02T09:00:00+00:00",
  endsAt: "2030-10-02T09:50:00+00:00",
  serviceName: "Konsultacja",
  specialistName: "Michał Stępień",
  roomName: null,
  locationName: null,
  locationAddress: null,
  priceMinor: 20000,
  currencyCode: "PLN",
  clientName: "Jan Kowalski",
  clientEmail: "jan@example.com",
  manageToken: "link-token",
  cancelledBy: null,
};

function deps(overrides: Partial<ConfirmationEmailDeps> = {}) {
  return {
    claim: vi.fn().mockResolvedValue(claimed),
    markSent: vi.fn().mockResolvedValue(undefined),
    release: vi.fn().mockResolvedValue(undefined),
    send: vi.fn().mockResolvedValue({ id: "msg_1" }),
    from: "Kolor Sensu <rezerwacje@kolorsensu.pl>",
    siteUrl: "https://kolorsensu.pl",
    timeZone: "Europe/Warsaw",
    contact: { phone: "+48 600 100 200" },
    ...overrides,
  } satisfies ConfirmationEmailDeps;
}

describe("sendConfirmationEmail", () => {
  it("sends the confirmation once, with the calendar file", async () => {
    const d = deps();
    expect(await sendConfirmationEmail("KS-20301002-1534", d)).toBe("sent");
    expect(d.claim).toHaveBeenCalledWith("KS-20301002-1534");
    const [message, idempotencyKey] = vi.mocked(d.send).mock.calls[0]!;
    expect(message).toMatchObject({
      from: "Kolor Sensu <rezerwacje@kolorsensu.pl>",
      to: "jan@example.com",
      subject: expect.stringContaining("KS-20301002-1534"),
      text: expect.stringContaining("https://kolorsensu.pl/wizyta/link-token"),
      attachments: [
        {
          filename: "wizyta-KS-20301002-1534.ics",
          contentType: "text/calendar; charset=utf-8; method=PUBLISH",
          content: expect.stringContaining("BEGIN:VCALENDAR"),
        },
      ],
    });
    expect(message.html).toContain("Twoja wizyta jest potwierdzona");
    // One key per claim: a retried call of the same send is a no-op, and a
    // later claim (a new link token) is a new send, not a conflict.
    expect(idempotencyKey).toMatch(
      /^confirmation:KS-20301002-1534:[0-9a-f]{16}$/,
    );
    await sendConfirmationEmail("KS-20301002-1534", d);
    expect(vi.mocked(d.send).mock.calls[1]![1]).toBe(idempotencyKey);
    const next = deps({
      claim: vi
        .fn()
        .mockResolvedValue({ ...claimed, manageToken: "another-token" }),
    });
    await sendConfirmationEmail("KS-20301002-1534", next);
    expect(vi.mocked(next.send).mock.calls[0]![1]).not.toBe(idempotencyKey);
    expect(d.markSent).toHaveBeenCalledWith("KS-20301002-1534", "msg_1");
  });

  it("does nothing when someone else sends it, or it was sent", async () => {
    const d = deps({ claim: vi.fn().mockResolvedValue(null) });
    expect(await sendConfirmationEmail("KS-1", d)).toBe("skipped");
    expect(d.send).not.toHaveBeenCalled();
  });

  it("gives the claim back when sending fails, for a retry", async () => {
    const d = deps({ send: vi.fn().mockRejectedValue(new Error("down")) });
    expect(await sendConfirmationEmail("KS-20301002-1534", d)).toBe("failed");
    expect(d.release).toHaveBeenCalledWith("KS-20301002-1534");
    expect(d.markSent).not.toHaveBeenCalled();
  });
});
