import type { ClaimedBookingEmail } from "@repo/supabase";
import { describe, expect, it } from "vitest";
import { formatPrice } from "@/lib/format";
import {
  reservationContent,
  unpaidCancelledContent,
  visitReminderContent,
} from "./payment-content";

const visit = {
  reference: "3010-004",
  mode: "in_person",
  startsAt: "2030-10-02T09:00:00+00:00",
  endsAt: "2030-10-02T09:50:00+00:00",
  serviceName: "Konsultacja psychologiczna",
  specialistName: "Michał Stępień",
  roomName: "Gabinet Zielony",
  locationName: "Siedziba Główna",
  locationAddress: "Plac Wolności 18/518, 61-739 Poznań",
  locationDirections: null,
  priceMinor: 20000,
  currencyCode: "PLN",
  clientName: "Jan Kowalski",
  clientEmail: "jan@example.com",
  manageToken: "link-token",
  cancelledBy: null,
  bookedBy: "centre",
  paid: false,
  paymentDueAt: "2030-09-30T09:00:00+00:00",
  confirmBy: null,
} satisfies ClaimedBookingEmail;

const options = {
  siteUrl: "https://kolorsensu.pl",
  timeZone: "Europe/Warsaw",
  contact: { phone: "+48 600 100 200", email: "kontakt@kolorsensu.pl" },
};

describe("reservationContent", () => {
  it("the reservation: the visit, the price, the time to pay by and the link to pay", () => {
    const content = reservationContent("reserved", visit, options);
    expect(content.subject).toBe(
      "Rezerwacja wizyty 3010-004 – opłać do 30 września 2030, godz. 11:00",
    );
    expect(content.heading).toBe("Zarezerwowaliśmy Twoją wizytę");
    expect(content.rows).toContainEqual([
      "Termin",
      "środa, 2 października 2030, godz. 11:00–11:50",
    ]);
    expect(content.rows).toContainEqual(["Do zapłaty", formatPrice(visit)]);
    expect(content.rows).toContainEqual([
      "Zapłać do",
      "30 września 2030, godz. 11:00",
    ]);
    expect(content.manageUrl).toBe("https://kolorsensu.pl/wizyta/link-token");
    expect(content.buttonLabel).toBe("Zapłać za wizytę");
    expect(content.intro).toMatch(/anulujemy/);
    expect(content.text).toContain("https://kolorsensu.pl/wizyta/link-token");
    expect(content.text).not.toContain("na miejscu");
    expect(content.ics).toContain("UID:3010-004@kolorsensu.pl");
  });

  it("a client's reservation asks to be confirmed first, by its time", () => {
    const content = reservationContent(
      "reserved",
      {
        ...visit,
        bookedBy: "client",
        confirmBy: "2030-09-29T09:30:00+00:00",
      },
      options,
    );
    expect(content.subject).toBe(
      "Potwierdź rezerwację wizyty 3010-004 do 29 września 2030, godz. 11:30",
    );
    expect(content.heading).toBe("Potwierdź swoją rezerwację");
    expect(content.buttonLabel).toBe("Potwierdź rezerwację");
    expect(content.intro).toContain("29 września 2030, godz. 11:30");
    expect(content.intro).toContain("30 września 2030, godz. 11:00");
    // Someone booked on another person's address (Klient · 9, card 9).
    expect(content.intro).toContain(
      "Jeśli to nie Ty rezerwujesz tę wizytę, nic nie rób: bez potwierdzenia rezerwacja przepadnie, a Ty nic nie zapłacisz.",
    );
    expect(content.rows).toContainEqual([
      "Potwierdź do",
      "29 września 2030, godz. 11:30",
    ]);
    expect(content.manageUrl).toBe("https://kolorsensu.pl/wizyta/link-token");
  });

  it("the reminders say the time is running out", () => {
    expect(reservationContent("payment_reminder", visit, options).subject).toBe(
      "Przypomnienie: opłać wizytę 3010-004 do 30 września 2030, godz. 11:00",
    );
    const last = reservationContent("payment_last_call", visit, options);
    expect(last.subject).toBe("Ostatnie godziny na opłacenie wizyty 3010-004");
    expect(last.heading).toBe("Zostało kilka godzin na płatność");
  });
});

describe("unpaidCancelledContent", () => {
  it("says why, and how to book again", () => {
    const content = unpaidCancelledContent(
      { ...visit, manageToken: null, cancelledBy: "system" },
      options,
    );
    expect(content.subject).toBe(
      "Rezerwacja 3010-004 anulowana – brak płatności",
    );
    expect(content.intro).toMatch(/nie została opłacona/);
    expect(content.manageUrl).toBe("https://kolorsensu.pl/umow-wizyte");
    expect(content.buttonLabel).toBe("Umów nową wizytę");
    expect(content.ics).toContain("STATUS:CANCELLED");
  });
});

describe("visitReminderContent", () => {
  it("reminds of tomorrow's visit, with its link", () => {
    const content = visitReminderContent(
      { ...visit, paid: true, paymentDueAt: null },
      options,
    );
    expect(content.subject).toBe(
      "Przypomnienie o wizycie – środa, 2 października 2030, godz. 11:00",
    );
    expect(content.manageUrl).toBe("https://kolorsensu.pl/wizyta/link-token");
    expect(content.rows).toContainEqual(["Numer rezerwacji", "3010-004"]);
  });

  it("says how to get there (Klient · 6, card 11)", () => {
    const content = visitReminderContent(
      {
        ...visit,
        paid: true,
        paymentDueAt: null,
        locationDirections: "Wejście od podwórza",
      },
      options,
    );
    expect(content.rows).toContainEqual(["Dojazd", "Wejście od podwórza"]);
    expect(content.text).toContain("Dojazd: Wejście od podwórza");
  });
});
