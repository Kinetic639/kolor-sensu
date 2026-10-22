import type { ClaimedBookingEmail } from "@repo/supabase";
import { describe, expect, it } from "vitest";
import { confirmationContent } from "./confirmation-content";

const visit = {
  reference: "KS-20301002-1534",
  mode: "in_person",
  startsAt: "2030-10-02T09:00:00+00:00",
  endsAt: "2030-10-02T09:50:00+00:00",
  serviceName: "Konsultacja psychologiczna",
  specialistName: "Michał Stępień",
  roomName: "Gabinet Zielony",
  locationName: "Siedziba Główna",
  locationAddress: "Plac Wolności 18/518, 61-739 Poznań",
  priceMinor: 20000,
  currencyCode: "PLN",
  clientName: "Jan Kowalski",
  clientEmail: "jan@example.com",
  manageToken: "link-token",
  cancelledBy: null,
  bookedBy: "client",
  paid: true,
  paymentDueAt: null,
  confirmBy: null,
} satisfies ClaimedBookingEmail;

const options = {
  siteUrl: "https://kolorsensu.pl",
  timeZone: "Europe/Warsaw",
  contact: { phone: "+48 600 100 200", email: "kontakt@kolorsensu.pl" },
};

describe("confirmationContent", () => {
  const content = confirmationContent(visit, options);

  it("says what, when and where, in the centre's time", () => {
    expect(content.subject).toBe(
      "Potwierdzenie wizyty KS-20301002-1534 – środa, 2 października 2030, godz. 11:00",
    );
    expect(content.greeting).toBe("Dzień dobry, Jan Kowalski!");
    expect(content.rows).toEqual([
      ["Usługa", "Konsultacja psychologiczna"],
      ["Specjalista", "Michał Stępień"],
      ["Termin", "środa, 2 października 2030, godz. 11:00–11:50"],
      [
        "Miejsce",
        "Siedziba Główna, Plac Wolności 18/518, 61-739 Poznań (Gabinet Zielony)",
      ],
      ["Zapłacono", "200 zł"],
      ["Numer rezerwacji", "KS-20301002-1534"],
    ]);
  });

  it("is sent once paid, also for a visit the centre booked", () => {
    const booked = confirmationContent(
      { ...visit, bookedBy: "centre" },
      options,
    );
    expect(booked.rows).toContainEqual(["Zapłacono", content.rows[4]![1]]);
    expect(booked.text).toContain(
      "Twoja wizyta w Kolor Sensu jest potwierdzona i opłacona.",
    );
    expect(booked.text).not.toContain("na miejscu");
  });

  it("links to the visit by its own token", () => {
    expect(content.manageUrl).toBe("https://kolorsensu.pl/wizyta/link-token");
  });

  it("says an online visit is online", () => {
    const online = confirmationContent(
      {
        ...visit,
        mode: "online",
        roomName: null,
        locationName: null,
        locationAddress: null,
      },
      options,
    );
    expect(online.rows).toContainEqual(["Miejsce", "Online"]);
  });

  it("has a plain-text version with everything that matters", () => {
    expect(content.text).toContain("Dzień dobry, Jan Kowalski!");
    expect(content.text).toContain(
      "Termin: środa, 2 października 2030, godz. 11:00–11:50",
    );
    expect(content.text).toContain("https://kolorsensu.pl/wizyta/link-token");
    expect(content.text).toContain("+48 600 100 200");
  });

  it("makes a calendar event of the visit", () => {
    expect(content.ics).toContain("DTSTART:20301002T090000Z");
    expect(content.ics).toContain("UID:KS-20301002-1534@kolorsensu.pl");
  });
});
