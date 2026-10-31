import type { ClaimedBookingEmail } from "@repo/supabase";
import { describe, expect, it, vi } from "vitest";
import { sendChangeEmail, type ChangeEmailDeps } from "./send-change";

const claimed: ClaimedBookingEmail = {
  reference: "KS-20301002-1534",
  mode: "online",
  startsAt: "2030-10-03T09:00:00+00:00",
  endsAt: "2030-10-03T09:50:00+00:00",
  serviceName: "Konsultacja",
  specialistName: "Michał Stępień",
  roomName: null,
  locationName: null,
  locationAddress: null,
  locationDirections: null,
  priceMinor: 20000,
  currencyCode: "PLN",
  clientName: "Jan Kowalski",
  clientEmail: "jan@example.com",
  manageToken: null,
  cancelledBy: null,
  bookedBy: "client",
  paid: true,
  paymentDueAt: null,
  confirmBy: null,
};

function deps(overrides: Partial<ChangeEmailDeps> = {}) {
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
  } satisfies ChangeEmailDeps;
}

describe("sendChangeEmail", () => {
  it("sends the new time once per move, with the client's link", async () => {
    const d = deps();
    const change = {
      kind: "rescheduled" as const,
      reference: "KS-20301002-1534",
      manageToken: "link-token",
      sequence: 1,
    };
    expect(await sendChangeEmail(change, d)).toBe("sent");
    expect(d.claim).toHaveBeenCalledWith("KS-20301002-1534", "rescheduled");
    const [message, key] = vi.mocked(d.send).mock.calls[0]!;
    expect(message).toMatchObject({
      to: "jan@example.com",
      subject: expect.stringContaining("Nowy termin"),
      text: expect.stringContaining("https://kolorsensu.pl/wizyta/link-token"),
      attachments: [
        {
          filename: "wizyta-KS-20301002-1534.ics",
          contentType: "text/calendar; charset=utf-8; method=PUBLISH",
        },
      ],
    });
    expect(message.html).toContain("Twoja wizyta ma nowy termin");
    // The next move is a new e-mail, not a repeat of this one.
    expect(key).toBe("rescheduled:KS-20301002-1534:1");
    expect(d.markSent).toHaveBeenCalledWith(
      "KS-20301002-1534",
      "rescheduled",
      "msg_1",
    );
  });

  it("the centre's change (its claim brings the link): what the visit is now (Klient · 6, card 13)", async () => {
    const d = deps({
      claim: vi
        .fn()
        .mockResolvedValue({ ...claimed, manageToken: "new-token" }),
    });
    const change = {
      kind: "rescheduled" as const,
      reference: "KS-20301002-1534",
      manageToken: null,
      sequence: 2,
      reason: "Remont gabinetu",
    };
    expect(await sendChangeEmail(change, d)).toBe("sent");
    const [message] = vi.mocked(d.send).mock.calls[0]!;
    expect(message.subject).toMatch(/^Zmiana wizyty KS-20301002-1534/);
    expect(message.text).toContain("https://kolorsensu.pl/wizyta/new-token");
    expect(message.html).toContain("Zmieniliśmy Twoją wizytę");
  });

  it("sends the cancellation with what is given back", async () => {
    const d = deps();
    await sendChangeEmail(
      {
        kind: "cancelled",
        reference: "KS-20301002-1534",
        manageToken: "link-token",
        sequence: 0,
        refundMinor: 20000,
      },
      d,
    );
    const [message, key] = vi.mocked(d.send).mock.calls[0]!;
    expect(message.subject).toBe("Wizyta KS-20301002-1534 została odwołana");
    expect(message.attachments[0]!.contentType).toBe(
      "text/calendar; charset=utf-8; method=CANCEL",
    );
    expect(key).toBe("cancelled:KS-20301002-1534");
  });

  it("sends a later refund once per refund, with the claim's new link, no calendar file", async () => {
    const d = deps({
      claim: vi
        .fn()
        .mockResolvedValue({ ...claimed, manageToken: "new-token" }),
    });
    expect(
      await sendChangeEmail(
        {
          kind: "refunded",
          reference: "KS-20301002-1534",
          refundMinor: 5000,
          refundedBeforeMinor: 15000,
          reason: "Gest dobrej woli",
        },
        d,
      ),
    ).toBe("sent");
    expect(d.claim).toHaveBeenCalledWith("KS-20301002-1534", "refunded");
    const [message, key] = vi.mocked(d.send).mock.calls[0]!;
    expect(message.subject).toContain("Zwrot");
    expect(message.text).toContain("Gest dobrej woli");
    expect(message.text).toContain("https://kolorsensu.pl/wizyta/new-token");
    expect(message.attachments).toEqual([]);
    expect(key).toBe("refunded:KS-20301002-1534:15000:5000");
    expect(d.markSent).toHaveBeenCalledWith(
      "KS-20301002-1534",
      "refunded",
      "msg_1",
    );
  });

  it("gives the claim back when sending fails; skips what is not its to send", async () => {
    const failing = deps({
      send: vi.fn().mockRejectedValue(new Error("down")),
    });
    const change = {
      kind: "rescheduled" as const,
      reference: "KS-1",
      manageToken: "t",
      sequence: 1,
    };
    expect(await sendChangeEmail(change, failing)).toBe("failed");
    expect(failing.release).toHaveBeenCalledWith("KS-1", "rescheduled");
    const taken = deps({ claim: vi.fn().mockResolvedValue(null) });
    expect(await sendChangeEmail(change, taken)).toBe("skipped");
    expect(taken.send).not.toHaveBeenCalled();
  });
});
