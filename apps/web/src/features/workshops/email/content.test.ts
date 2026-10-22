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
  roomName: "Sala duża",
  leaders: "Anna Nowak",
  priceMinor: 15000,
  paidMinor: 15000,
  currencyCode: "PLN",
  paymentDueAt: null,
  waitlistPosition: null,
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
});
