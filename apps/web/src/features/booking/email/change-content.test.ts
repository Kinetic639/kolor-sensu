import type { ClaimedBookingEmail } from "@repo/supabase";
import { describe, expect, it } from "vitest";
import { cancelledContent, rescheduledContent } from "./change-content";

const visit: ClaimedBookingEmail = {
  reference: "KS-20301002-1534",
  mode: "online",
  startsAt: "2030-10-03T09:00:00+00:00",
  endsAt: "2030-10-03T09:50:00+00:00",
  serviceName: "Konsultacja psychologiczna",
  specialistName: "Michał Stępień",
  roomName: null,
  locationName: null,
  locationAddress: null,
  priceMinor: 20000,
  currencyCode: "PLN",
  clientName: "Jan Kowalski",
  clientEmail: "jan@example.com",
  manageToken: null,
  cancelledBy: null,
  bookedBy: "client",
  paid: true,
  paymentDueAt: null,
};

const options = {
  siteUrl: "https://kolorsensu.pl",
  timeZone: "Europe/Warsaw",
  contact: { phone: "+48 600 100 200" },
  manageToken: "link-token",
};

describe("rescheduledContent", () => {
  const content = rescheduledContent(visit, { ...options, sequence: 1 });

  it("gives the new time, with the client's own link", () => {
    expect(content.subject).toBe(
      "Nowy termin wizyty KS-20301002-1534 – czwartek, 3 października 2030, godz. 11:00",
    );
    expect(content.heading).toBe("Twoja wizyta ma nowy termin");
    expect(content.rows).toContainEqual([
      "Nowy termin",
      "czwartek, 3 października 2030, godz. 11:00–11:50",
    ]);
    expect(content.manageUrl).toBe("https://kolorsensu.pl/wizyta/link-token");
    expect(content.text).toContain("https://kolorsensu.pl/wizyta/link-token");
  });

  it("updates the visit in the client's calendar", () => {
    expect(content.ics).toContain("SEQUENCE:1");
    expect(content.ics).toContain("DTSTART:20301003T090000Z");
    expect(content.ics).toContain("UID:KS-20301002-1534@kolorsensu.pl");
  });
});

describe("cancelledContent", () => {
  it("says the money is on its way back", () => {
    const content = cancelledContent(visit, {
      ...options,
      sequence: 1,
      refundMinor: 20000,
    });
    expect(content.subject).toBe("Wizyta KS-20301002-1534 została odwołana");
    expect(content.heading).toBe("Twoja wizyta została odwołana");
    expect(content.rows).toContainEqual(["Zwrot", "200 zł"]);
    expect(content.intro).toContain("Zwrócimy 200 zł");
    expect(content.ics).toContain("STATUS:CANCELLED");
    expect(content.ics).toContain("SEQUENCE:1");
  });

  it("apologises when the centre cancelled, with all the money back", () => {
    const content = cancelledContent(
      { ...visit, cancelledBy: "centre" },
      { ...options, sequence: 1, refundMinor: 20000 },
    );
    expect(content.intro).toBe(
      "Przepraszamy, musieliśmy odwołać Twoją wizytę. Zwrócimy 200 zł tą samą metodą, którą zapłacono. Pieniądze zwykle wracają w ciągu kilku dni roboczych.",
    );
    expect(content.text).toContain("Przepraszamy");
  });

  it("says plainly when there is no refund", () => {
    const content = cancelledContent(visit, {
      ...options,
      sequence: 0,
      refundMinor: 0,
    });
    expect(content.rows).toContainEqual(["Zwrot", "Bez zwrotu"]);
    expect(content.intro).toContain("opłata nie podlega zwrotowi");
    expect(content.text).toContain("opłata nie podlega zwrotowi");
  });

  it("a reservation cancelled before paying: nothing to give back", () => {
    const content = cancelledContent(
      { ...visit, paid: false },
      { ...options, sequence: 0, refundMinor: 0 },
    );
    expect(content.rows).toContainEqual(["Zwrot", "Nie dotyczy"]);
    expect(content.intro).toBe(
      "Odwołaliśmy Twoją rezerwację. Nie była opłacona, więc nie ma nic do zwrotu.",
    );
  });
});
