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
      gabinet: null,
    });
  });

  it("reads the view, week and filters, ignoring malformed values", () => {
    expect(
      load(
        "widok=reguly&tydzien=2030-01-07&dzien=3&forma=online&gabinet=7f6ecfde-56dc-4045-91e1-a0b3cb71abd2",
      ),
    ).toEqual({
      widok: "reguly",
      tydzien: "2030-01-07",
      dzien: 3,
      forma: "online",
      gabinet: "7f6ecfde-56dc-4045-91e1-a0b3cb71abd2",
    });
    expect(load("gabinet=brak").gabinet).toBe("brak");
    expect(
      load(
        "widok=lista&tydzien=2030-02-30&dzien=8&forma=telefon&gabinet=zielony",
      ),
    ).toEqual({
      widok: "kalendarz",
      tydzien: null,
      dzien: null,
      forma: null,
      gabinet: null,
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
