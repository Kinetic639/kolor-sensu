import { describe, expect, it } from "vitest";
import {
  bookingHref,
  bookingNoticeHref,
  changeBookingHref,
  intakeHref,
  loadBookingParams,
  selectBookingHref,
} from "./search-params";

function load(query: string) {
  return loadBookingParams(new URLSearchParams(query));
}

describe("booking search params", () => {
  it("reads every wizard choice from the URL", () => {
    expect(
      load(
        "usluga=konsultacja&forma=online&lokalizacja=centrum&specjalista=anna-nowak&tydzien=2026-10-05&termin=2026-10-07T10:00",
      ),
    ).toEqual({
      usluga: "konsultacja",
      forma: "online",
      lokalizacja: "centrum",
      specjalista: "anna-nowak",
      tydzien: "2026-10-05",
      termin: "2026-10-07T10:00",
      uwaga: null,
    });
  });

  it("ignores values that are not well formed instead of failing", () => {
    expect(
      load(
        "usluga=Konsultacja!&forma=telefon&specjalista=../x&tydzien=2026-13-40&termin=jutro",
      ),
    ).toEqual({
      usluga: null,
      forma: null,
      lokalizacja: null,
      specjalista: null,
      tydzien: null,
      termin: null,
      uwaga: null,
    });
  });

  it("rejects impossible calendar dates and times", () => {
    expect(load("tydzien=2026-02-30").tydzien).toBeNull();
    expect(load("termin=2026-10-07T24:30").termin).toBeNull();
  });

  it("links to the wizard with only the chosen values", () => {
    expect(bookingHref({ specjalista: "anna-nowak" })).toBe(
      "/umow-wizyte?specjalista=anna-nowak",
    );
    expect(bookingHref({})).toBe("/umow-wizyte");
  });

  it("the test before a consultation keeps the choices, to come back to", () => {
    expect(
      intakeHref({ usluga: "konsultacja-psychologiczna", forma: "online" }),
    ).toBe("/umow-wizyte/test?usluga=konsultacja-psychologiczna&forma=online");
  });

  it("selecting a choice keeps the others but drops the chosen time", () => {
    const params = load(
      "usluga=konsultacja&forma=online&specjalista=anna-nowak&termin=2026-10-07T10:00",
    );
    expect(selectBookingHref(params, "forma", "stacjonarnie")).toBe(
      "/umow-wizyte?usluga=konsultacja&forma=stacjonarnie&specjalista=anna-nowak",
    );
  });

  it("choosing a time keeps everything else", () => {
    const params = load("usluga=konsultacja&forma=online&specjalista=a-b");
    expect(selectBookingHref(params, "termin", "2026-10-07T10:00")).toBe(
      "/umow-wizyte?usluga=konsultacja&forma=online&specjalista=a-b&termin=2026-10-07T10:00",
    );
  });

  it("changing a choice removes it and the chosen time", () => {
    const params = load(
      "usluga=konsultacja&forma=online&specjalista=a-b&tydzien=2026-10-05&termin=2026-10-07T10:00",
    );
    expect(changeBookingHref(params, "specjalista")).toBe(
      "/umow-wizyte?usluga=konsultacja&forma=online",
    );
  });
});

describe("a notice after a refused hold", () => {
  it("is shown once: links from that page leave it out", () => {
    const params = load(
      "usluga=konsultacja&forma=online&specjalista=anna&termin=2026-10-07T10:00",
    );
    const notice = bookingNoticeHref(params, "termin-zajety");
    expect(notice).toBe(
      "/umow-wizyte?usluga=konsultacja&forma=online&specjalista=anna&tydzien=2026-10-07&uwaga=termin-zajety",
    );
    const shown = load(notice.split("?")[1]!);
    expect(shown.uwaga).toBe("termin-zajety");
    expect(bookingHref(shown)).not.toContain("uwaga");
    expect(bookingNoticeHref(params, "weryfikacja", true)).toContain(
      "termin=2026-10-07T10:00&uwaga=weryfikacja",
    );
    expect(
      selectBookingHref(shown, "termin", "2026-10-08T10:00"),
    ).not.toContain("uwaga");
  });
});
