import type { ClaimedWorkshopEmail } from "@repo/supabase/workshops";
import { describe, expect, it } from "vitest";
import {
  workshopEmailContent,
  workshopTransferContent,
  workshopTransferUrl,
} from "./content";

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
  confirmBy: null,
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

describe("a workshop's e-mails, columns 8 to 10", () => {
  it("tell of a new leader: anyone may leave, with a full refund (Warsztat · 9, card 5)", () => {
    const content = workshopEmailContent(
      "leader_changed",
      { ...email, waitlistPosition: null, offerExpiresAt: null },
      options,
    );
    expect(content.subject).toBe("Zmiana prowadzenia warsztatu – Uważność");
    expect(content.intro).toContain("oddamy całą wpłatę");
    expect(content.rows).toContainEqual(["Prowadzi", email.leaders]);
    const waiting = workshopEmailContent(
      "leader_changed",
      { ...email, waitlistPosition: 2 },
      options,
    );
    expect(waiting.intro).toContain("zostać na liście rezerwowej");
  });

  it("let whoever did not sign up walk away when nothing is paid (Warsztat · 10, card 6)", () => {
    const notYou = "Jeśli to nie Ty zapisujesz się na ten warsztat";
    const unpaid = { ...email, paidMinor: 0 };
    for (const kind of ["reserved", "waitlisted", "offered"] as const)
      expect(workshopEmailContent(kind, unpaid, options).intro).toContain(
        notYou,
      );
    expect(
      workshopEmailContent("confirmation", unpaid, options).intro,
    ).toContain(notYou);
    expect(
      workshopEmailContent(
        "confirmation",
        { ...email, paidMinor: 15000 },
        options,
      ).intro,
    ).not.toContain(notYou);
  });

  it("invite whoever a seat is passed on to, to accept the rules first (Warsztat · 8, card 4)", () => {
    const content = workshopTransferContent(
      {
        reference: "W2611-004",
        firstName: "Ewa",
        lastName: "Nowak",
        email: "ewa@example.invalid",
        fromName: "Ola Lis",
        workshopTitle: "Uważność",
        workshopSlug: "uwaznosc",
        modality: "online",
        startsAt: "2030-11-12T16:00:00Z",
        endsAt: "2030-11-12T18:00:00Z",
        open: true,
      },
      "invite-token",
      options,
    );
    expect(content.subject).toBe("Ola Lis przekazuje Ci miejsce – Uważność");
    expect(content.greeting).toBe("Dzień dobry, Ewa Nowak!");
    expect(content.intro).toContain("zaakceptuj przed warsztatem regulamin");
    expect(content.intro).toContain("miejsce zostaje przy osobie");
    expect(content.manageUrl).toBe(
      workshopTransferUrl(options.siteUrl, "invite-token"),
    );
    expect(content.manageUrl).toMatch(
      /\/warsztaty\/przekazanie\/invite-token$/,
    );
    expect(content.buttonLabel).toBe("Przyjmij miejsce");
  });
});

describe("a seat waiting for its confirming (#269, Warsztat · 5, card 5)", () => {
  it("asks to confirm it by its time, then to pay, with no calendar file", () => {
    const content = workshopEmailContent(
      "reserved",
      {
        ...email,
        paidMinor: 0,
        paymentDueAt: "2030-11-01T10:30:00Z",
        confirmBy: "2030-11-01T10:30:00Z",
      },
      options,
    );
    expect(content.subject).toBe("Potwierdź zapis W2611-004 – Uważność");
    expect(content.buttonLabel).toBe("Potwierdź zapis");
    expect(content.rows).toContainEqual([
      "Potwierdź do",
      "1 listopada 2030, godz. 11:30",
    ]);
    expect(content.rows.map(([label]) => label)).not.toContain(
      "Termin płatności",
    );
    expect(content.intro).toContain("Bez potwierdzenia miejsce wróci do puli.");
    expect(content.intro).toContain("7 dni przed warsztatem");
    expect(content.note).toBeNull();
  });

  it("says nothing of money for a free seat", () => {
    const content = workshopEmailContent(
      "reserved",
      {
        ...email,
        priceMinor: 0,
        paidMinor: 0,
        confirmBy: "2030-11-01T10:30:00Z",
      },
      options,
    );
    expect(content.rows.map(([label]) => label)).not.toContain("Do zapłaty");
    expect(content.intro).not.toContain("opłać");
  });
});
