import { describe, expect, it } from "vitest";
import { visitIcs } from "./ics";

const event = {
  uid: "KS-20301002-1534@kolorsensu.pl",
  startsAt: "2030-10-02T09:00:00+00:00",
  endsAt: "2030-10-02T09:50:00+00:00",
  summary: "Konsultacja psychologiczna – Kolor Sensu",
  location: "Siedziba Główna, Plac Wolności 18/518, 61-739 Poznań",
  description:
    "Numer rezerwacji: KS-20301002-1534\nSpecjalista: Michał Stępień",
  url: "https://kolorsensu.pl/wizyta/abc",
  now: new Date("2030-09-29T20:00:00Z"),
};

describe("visitIcs", () => {
  const ics = visitIcs(event);
  const lines = ics.split("\r\n");

  it("is one calendar event, with CRLF line ends", () => {
    expect(lines[0]).toBe("BEGIN:VCALENDAR");
    expect(ics.endsWith("END:VCALENDAR\r\n")).toBe(true);
    expect(ics.replaceAll("\r\n", "")).not.toContain("\n");
    expect(lines).toContain("BEGIN:VEVENT");
    expect(lines).toContain("METHOD:PUBLISH");
  });

  it("puts the times in UTC", () => {
    expect(lines).toContain("DTSTART:20301002T090000Z");
    expect(lines).toContain("DTEND:20301002T095000Z");
    expect(lines).toContain("DTSTAMP:20300929T200000Z");
    expect(lines).toContain("UID:KS-20301002-1534@kolorsensu.pl");
  });

  it("escapes commas, semicolons and new lines in text", () => {
    const unfolded = ics.replaceAll("\r\n ", "");
    expect(unfolded).toContain(
      "LOCATION:Siedziba Główna\\, Plac Wolności 18/518\\, 61-739 Poznań",
    );
    expect(unfolded).toContain(
      "DESCRIPTION:Numer rezerwacji: KS-20301002-1534\\nSpecjalista: Michał Stępień",
    );
  });

  it("folds lines longer than 75 bytes, never inside a character", () => {
    for (const line of lines) {
      expect(new TextEncoder().encode(line).length).toBeLessThanOrEqual(75);
    }
    const long = visitIcs({ ...event, description: "ł".repeat(100) });
    expect(long.replaceAll("\r\n ", "")).toContain(
      `DESCRIPTION:${"ł".repeat(100)}`,
    );
    expect(long).not.toContain("�");
  });
});
