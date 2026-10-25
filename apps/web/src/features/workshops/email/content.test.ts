import type { ClaimedWorkshopEmail } from "@repo/supabase/workshops";
import { describe, expect, it } from "vitest";
import { workshopEmailContent } from "./content";

const email: ClaimedWorkshopEmail = {
  reference: "W2611-004",
  manageToken: "tok",
  clientName: "Ola",
  clientEmail: "ola@example.invalid",
  workshopTitle: "Uważność",
  workshopSlug: "uwaznosc",
  modality: "in_person",
  startsAt: "2030-11-12T16:00:00Z",
  endsAt: "2030-11-12T18:00:00Z",
  locationName: "Kolor Sensu",
  locationAddress: "ul. Spokojna 1, Warszawa",
  locationDirections: null,
  roomName: "Sala duża",
  leaders: "Anna Nowak",
  priceMinor: 15000,
  paidMinor: 15000,
  currencyCode: "PLN",
  paymentDueAt: null,
  waitlistPosition: null,
  offerExpiresAt: null,
  cancelledBy: null,
  cancelReason: null,
  refundDueMinor: 0,
  refundedMinor: 0,
  refundWhenReplaced: false,
  meetingUrl: null,
  paidOutside: false,
};

const options = {
  siteUrl: "https://site.example.invalid",
  timeZone: "Europe/Warsaw",
  contact: { phone: "+48 600 100 200" },
};

describe("a workshop's e-mails", () => {
  it("confirm the seat with the link, the payment and a calendar file", () => {
    const content = workshopEmailContent("confirmation", email, options);
    expect(content.subject).toBe("Potwierdzenie zapisu W2611-004 – Uważność");
    expect(content.manageUrl).toBe(
      "https://site.example.invalid/warsztaty/zapis/tok",
    );
    expect(content.rows).toContainEqual([
      "Termin",
      "wtorek, 12 listopada 2030, 17:00–19:00",
    ]);
    expect(content.rows).toContainEqual([
      "Miejsce",
      "Kolor Sensu, ul. Spokojna 1, Warszawa (Sala duża)",
    ]);
    expect(content.rows.find(([label]) => label === "Zapłacono")).toBeTruthy();
    expect(content.ics).toContain("SUMMARY:Uważność – warsztat w Kolor Sensu");
    expect(content.text).toContain(
      "Zobacz swój zapis: https://site.example.invalid/warsztaty/zapis/tok",
    );
  });

  it("say how to get there, when the location says it", () => {
    const content = workshopEmailContent(
      "confirmation",
      { ...email, locationDirections: "Wejście od podwórza, 2. piętro." },
      options,
    );
    expect(content.rows).toContainEqual([
      "Jak dojechać",
      "Wejście od podwórza, 2. piętro.",
    ]);
    expect(
      workshopEmailContent("confirmation", email, options).rows.some(
        ([label]) => label === "Jak dojechać",
      ),
    ).toBe(false);
  });

  it("explain a payment that came too late for its seat, and give it back", () => {
    const content = workshopEmailContent(
      "seat_lost",
      { ...email, paidMinor: 0, refundedMinor: 15000 },
      options,
    );
    expect(content.subject).toBe("Zwrot za warsztat W2611-004");
    expect(content.heading).toBe("Miejsce było już zajęte");
    expect(content.intro).toContain("po czasie");
    expect(content.intro).toContain("Oddaliśmy całe 150");
  });

  it("ask for the payment by its date when reserved", () => {
    const content = workshopEmailContent(
      "reserved",
      { ...email, paidMinor: 0, paymentDueAt: "2030-11-05T16:00:00Z" },
      options,
    );
    expect(content.buttonLabel).toBe("Zapłać za warsztat");
    expect(content.rows).toContainEqual([
      "Termin płatności",
      "5 listopada 2030, godz. 17:00",
    ]);
    expect(content.intro).toContain("miejsce się zwolni");
  });

  it("say the waitlist place, and that an online link comes later", () => {
    const content = workshopEmailContent(
      "waitlisted",
      { ...email, modality: "online", paidMinor: 0, waitlistPosition: 2 },
      options,
    );
    expect(content.rows).toContainEqual(["Miejsce na liście", "2"]);
    expect(content.rows).toContainEqual([
      "Miejsce",
      "Online (link do spotkania wyślemy dzień przed)",
    ]);
    expect(content.intro).toContain("24 godziny");
  });

  it("offer a freed seat until its time, and remind of the payment", () => {
    const offered = workshopEmailContent(
      "offered",
      { ...email, paidMinor: 0, offerExpiresAt: "2030-11-02T10:00:00Z" },
      options,
    );
    expect(offered.rows).toContainEqual([
      "Miejsce czeka do",
      "2 listopada 2030, godz. 11:00",
    ]);
    expect(offered.buttonLabel).toBe("Zapłać i zajmij miejsce");
    const reminder = workshopEmailContent(
      "payment_reminder",
      { ...email, paidMinor: 0, paymentDueAt: "2030-11-05T16:00:00Z" },
      options,
    );
    expect(reminder.intro).toContain("5 listopada 2030, godz. 17:00");
  });

  it("give the online link the day before", () => {
    const content = workshopEmailContent(
      "reminder",
      {
        ...email,
        modality: "online",
        meetingUrl: "https://meet.example.invalid/x",
      },
      options,
    );
    expect(content.intro).toContain("https://meet.example.invalid/x");
    expect(content.subject).toBe("Jutro: Uważność");
  });

  it("say a cancellation by the centre with its reason and the refund", () => {
    const content = workshopEmailContent(
      "cancelled",
      {
        ...email,
        cancelledBy: "centre",
        cancelReason: "choroba prowadzącej",
        refundDueMinor: 15000,
      },
      options,
    );
    expect(content.heading).toBe("Warsztat jest odwołany");
    expect(content.intro).toContain("choroba prowadzącej. Zwrócimy 150");
  });

  it("end the centre's reason with one full stop, typed or not", () => {
    const content = workshopEmailContent(
      "cancelled",
      { ...email, cancelledBy: "centre", cancelReason: "Brak sali. " },
      options,
    );
    expect(content.intro).toContain("udział: Brak sali.");
    expect(content.intro).not.toContain("..");
  });

  it("promise a refund when the waitlist takes a late seat", () => {
    const content = workshopEmailContent(
      "cancelled",
      { ...email, cancelledBy: "client", refundWhenReplaced: true },
      options,
    );
    expect(content.intro).toContain("listy rezerwowej");
  });

  it("mark a new date in the calendar file as a change", () => {
    const content = workshopEmailContent("rescheduled", email, options);
    expect(content.ics).toContain("SEQUENCE:1");
    expect(content.intro).toContain("pełnym zwrotem");
  });
});
