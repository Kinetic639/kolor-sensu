import { describe, expect, it, vi } from "vitest";
import { slotLostContent } from "./slot-lost-content";
import { sendSlotLostEmail } from "./send-slot-lost";

// The e-mail when the money came after the time was taken (Klient · 4,
// card 17).

const payment = {
  reference: "2610-014",
  amountMinor: 15000,
  currencyCode: "pln",
};
const options = {
  siteUrl: "https://kolorsensu.pl",
  contact: { phone: "+48 600 100 200", email: "kontakt@kolorsensu.pl" },
};

describe("slotLostContent", () => {
  it("says the time was taken, the whole amount went back, and how to book again", () => {
    const content = slotLostContent(payment, options);
    expect(content.subject).toBe(
      "Zwrot płatności za rezerwację 2610-014 – termin zajęty",
    );
    expect(content.intro).toContain(
      "dotarła po tym, jak wybrany termin zajęła inna osoba",
    );
    expect(content.intro).toContain("Zwróciliśmy całą kwotę");
    expect(content.rows).toEqual([
      ["Numer rezerwacji", "2610-014"],
      ["Zwrot", expect.stringMatching(/^150\szł$/)],
    ]);
    expect(content.manageUrl).toBe("https://kolorsensu.pl/umow-wizyte");
    expect(content.text).toContain(
      "Wybierz inny termin: https://kolorsensu.pl/umow-wizyte",
    );
    expect(content.text).toContain("+48 600 100 200");
  });
});

describe("sendSlotLostEmail", () => {
  it("sends it to the payer once per payment (Resend's key is the session's)", async () => {
    const send = vi.fn().mockResolvedValue({ id: "email-1" });
    await sendSlotLostEmail(
      { ...payment, to: "jan@example.invalid", sessionId: "cs_1" },
      { ...options, from: "Kolor Sensu <rezerwacje@kolorsensu.pl>", send },
    );
    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "jan@example.invalid",
        subject: "Zwrot płatności za rezerwację 2610-014 – termin zajęty",
        html: expect.stringContaining("Zwróciliśmy płatność"),
      }),
      "slot-lost:cs_1",
    );
  });
});
