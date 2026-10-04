import { describe, expect, it } from "vitest";
import {
  closureDates,
  closureInputSchema,
  missingHolidays,
  polishHolidays,
} from "./closures";

describe("polishHolidays", () => {
  it("the public holidays off work, Easter's with the year", () => {
    expect(polishHolidays(2026)).toEqual([
      { date: "2026-01-01", name: "Nowy Rok" },
      { date: "2026-01-06", name: "Trzech Króli" },
      { date: "2026-04-06", name: "Poniedziałek Wielkanocny" },
      { date: "2026-05-01", name: "Święto Pracy" },
      { date: "2026-05-03", name: "Święto Konstytucji 3 Maja" },
      { date: "2026-06-04", name: "Boże Ciało" },
      { date: "2026-08-15", name: "Wniebowzięcie NMP" },
      { date: "2026-11-01", name: "Wszystkich Świętych" },
      { date: "2026-11-11", name: "Święto Niepodległości" },
      { date: "2026-12-24", name: "Wigilia" },
      { date: "2026-12-25", name: "Boże Narodzenie" },
      { date: "2026-12-26", name: "Drugi dzień Bożego Narodzenia" },
    ]);
    // Easter moves: 28.03.2027, so its Monday and Corpus Christi too.
    const days = polishHolidays(2027).map((day) => day.date);
    expect(days).toContain("2027-03-29");
    expect(days).toContain("2027-05-27");
  });
});

describe("missingHolidays", () => {
  it("those of a year not closed yet, from a day on", () => {
    expect(
      missingHolidays(
        2026,
        [{ startsOn: "2026-12-24", endsOn: "2026-12-31" }],
        "2026-10-05",
      ),
    ).toEqual([
      { date: "2026-11-01", name: "Wszystkich Świętych" },
      { date: "2026-11-11", name: "Święto Niepodległości" },
    ]);
  });
});

describe("closureInputSchema", () => {
  it("its days and why", () => {
    expect(
      closureInputSchema.parse({
        startsOn: "2026-12-24",
        endsOn: "2026-12-31",
        reason: " Przerwa świąteczna ",
      }),
    ).toEqual({
      startsOn: "2026-12-24",
      endsOn: "2026-12-31",
      reason: "Przerwa świąteczna",
    });
  });

  it("says what is wrong", () => {
    const result = closureInputSchema.safeParse({
      startsOn: "2026-12-31",
      endsOn: "2026-12-24",
      reason: "",
    });
    expect(
      Object.fromEntries(
        result.error!.issues.map((issue) => [issue.path[0], issue.message]),
      ),
    ).toEqual({
      reason: "Napisz, dlaczego centrum jest zamknięte.",
      endsOn: "Koniec nie może być przed początkiem.",
    });
  });
});

describe("closureDates", () => {
  it("one day, or its first and last", () => {
    expect(closureDates({ startsOn: "2026-11-11", endsOn: "2026-11-11" })).toBe(
      "11.11.2026",
    );
    expect(closureDates({ startsOn: "2026-12-24", endsOn: "2026-12-31" })).toBe(
      "24.12–31.12.2026",
    );
    expect(closureDates({ startsOn: "2026-12-28", endsOn: "2027-01-02" })).toBe(
      "28.12.2026–02.01.2027",
    );
  });
});
