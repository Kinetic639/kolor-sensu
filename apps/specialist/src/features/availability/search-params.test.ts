import { describe, expect, it } from "vitest";
import { availabilityHref, loadAvailabilityParams } from "./search-params";

const load = (query: string) =>
  loadAvailabilityParams(new URLSearchParams(query));

describe("availability search params", () => {
  it("starts on the calendar with no filters", () => {
    expect(load("")).toEqual({
      widok: "kalendarz",
      tydzien: null,
      dzien: null,
      forma: null,
    });
  });

  it("reads the view, week and filters, ignoring malformed values", () => {
    expect(
      load("widok=reguly&tydzien=2030-01-07&dzien=3&forma=online"),
    ).toEqual({
      widok: "reguly",
      tydzien: "2030-01-07",
      dzien: 3,
      forma: "online",
    });
    expect(
      load("widok=lista&tydzien=2030-02-30&dzien=8&forma=telefon"),
    ).toEqual({
      widok: "kalendarz",
      tydzien: null,
      dzien: null,
      forma: null,
    });
  });

  it("links without the default view", () => {
    expect(
      availabilityHref({ widok: "kalendarz", tydzien: "2030-01-14" }),
    ).toBe("/dostepnosc?tydzien=2030-01-14");
    expect(availabilityHref({ widok: "reguly", dzien: 1 })).toBe(
      "/dostepnosc?widok=reguly&dzien=1",
    );
  });
});
