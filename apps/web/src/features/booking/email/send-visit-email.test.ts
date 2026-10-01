import type { ClaimedBookingEmail } from "@repo/supabase";
import { describe, expect, it, vi } from "vitest";
import { sendVisitEmail, type VisitEmailDeps } from "./send-visit-email";

const reserved: ClaimedBookingEmail = {
  reference: "3010-004",
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
  bookedBy: "centre",
  paid: false,
  paymentDueAt: "2030-09-30T09:00:00+00:00",
};

function deps(claimed: ClaimedBookingEmail | null) {
  return {
    claim: vi.fn().mockResolvedValue(claimed),
    markSent: vi.fn().mockResolvedValue(undefined),
    release: vi.fn().mockResolvedValue(undefined),
    send: vi.fn().mockResolvedValue({ id: "msg_1" }),
    from: "Kolor Sensu <rezerwacje@kolorsensu.pl>",
    siteUrl: "https://kolorsensu.pl",
    timeZone: "Europe/Warsaw",
    contact: {},
  } satisfies VisitEmailDeps;
}

describe("sendVisitEmail", () => {
  it("sends the reservation with the link to pay, once", async () => {
    const d = deps(reserved);
    expect(await sendVisitEmail("3010-004", "reserved", d)).toBe("sent");
    expect(d.claim).toHaveBeenCalledWith("3010-004", "reserved");
    const [message, key] = vi.mocked(d.send).mock.calls[0]!;
    expect(message.subject).toMatch(/^Rezerwacja wizyty 3010-004 – opłać do/);
    expect(message.text).toContain(
      "Zapłać za wizytę: https://kolorsensu.pl/wizyta/link-token",
    );
    expect(key).toMatch(/^reserved:3010-004:[0-9a-f]{16}$/);
    expect(d.markSent).toHaveBeenCalledWith("3010-004", "reserved", "msg_1");
  });

  it("cancelled for want of payment: no link, the calendar event cancelled", async () => {
    const d = deps({ ...reserved, manageToken: null, cancelledBy: "system" });
    expect(await sendVisitEmail("3010-004", "cancelled", d)).toBe("sent");
    const [message, key] = vi.mocked(d.send).mock.calls[0]!;
    expect(message.subject).toBe(
      "Rezerwacja 3010-004 anulowana – brak płatności",
    );
    expect(message.attachments[0]!.contentType).toContain("method=CANCEL");
    expect(key).toBe("cancelled:3010-004:once");
  });

  it("leaves other cancellations to the change that made them", async () => {
    const d = deps({ ...reserved, manageToken: null, cancelledBy: "centre" });
    expect(await sendVisitEmail("3010-004", "cancelled", d)).toBe("skipped");
    expect(d.send).not.toHaveBeenCalled();
    expect(d.release).toHaveBeenCalledWith("3010-004", "cancelled");
  });

  it("nothing to send when someone else has it", async () => {
    const d = deps(null);
    expect(await sendVisitEmail("3010-004", "payment_reminder", d)).toBe(
      "skipped",
    );
  });
});
