import { describe, expect, it } from "vitest";
import { clientEmails, emailPreviews } from "./catalogue";

const options = {
  siteUrl: "https://kolorsensu.example.invalid",
  timeZone: "Europe/Warsaw",
  contact: { phone: "+48 600 100 200", email: "kontakt@example.invalid" },
  visitReminderHours: 24,
  paymentReminderHours: 48,
};

describe("clientEmails", () => {
  const emails = clientEmails(options);

  it("every e-mail a client gets, each variant once, in groups", () => {
    expect(emails.map((email) => email.key)).toEqual([
      "confirmation",
      "reserved",
      "reserved-by-centre",
      "payment-reminder",
      "payment-last-call",
      "unpaid-cancelled",
      "visit-reminder",
      "rescheduled",
      "changed-by-centre",
      "cancelled-refund",
      "cancelled-late",
      "cancelled-unpaid",
      "cancelled-by-centre",
      "cancelled-by-centre-kept",
      "refunded",
    ]);
    expect(new Set(emails.map((email) => email.group))).toEqual(
      new Set(["Rezerwacja i płatność", "Przed wizytą", "Zmiany i odwołania"]),
    );
  });

  it("says when each goes, by the centre's settings", () => {
    const when = (key: string) =>
      emails.find((email) => email.key === key)!.when;
    expect(when("visit-reminder")).toBe("24 godz. przed opłaconą wizytą.");
    expect(when("payment-reminder")).toBe("48 godz. przed terminem zapłaty.");
    const off = clientEmails({
      ...options,
      visitReminderHours: null,
      paymentReminderHours: null,
    });
    expect(off.find((email) => email.key === "visit-reminder")!.when).toBe(
      "Wyłączone w Ustawieniach: nie jest wysyłane.",
    );
  });

  it("each built as the real one is, from the sample visit", () => {
    for (const email of emails) {
      const content = email.build();
      expect(content.subject).toBeTruthy();
      expect(content.greeting).toBe("Dzień dobry, Joanna Kowalska!");
    }
    const refund = emails.find(
      (email) => email.key === "cancelled-by-centre-kept",
    )!;
    const kept = refund.build().rows.find(([label]) => label === "Zatrzymano");
    expect(kept?.[1]).toMatch(/^120\s+zł$/);
  });
});

describe("emailPreviews", () => {
  it("each with its HTML and text, the company under it", async () => {
    const previews = await emailPreviews(
      options,
      "Kolor Sensu sp. z o.o. · NIP 123-456-32-18",
    );
    const confirmation = previews[0]!;
    expect(confirmation).toMatchObject({
      key: "confirmation",
      name: "Potwierdzenie wizyty",
      attachment: "Plik kalendarza (.ics)",
    });
    expect(confirmation.html).toContain("Twoja wizyta jest potwierdzona");
    expect(confirmation.html).toContain("NIP 123-456-32-18");
    expect(confirmation.text).toContain("NIP 123-456-32-18");
  });
});
