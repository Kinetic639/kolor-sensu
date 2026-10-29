import { describe, expect, it } from "vitest";
import { EXPIRED_HREF } from "./booking-step";
import { loadBookingParams } from "./search-params";
import {
  memoryValue,
  readMemory,
  rememberedHref,
  resumeValue,
  type WizardRequest,
} from "./wizard-memory";

const request = (
  search: string,
  memory: string | null,
  referer: string | null = null,
): WizardRequest => ({
  searchParams: new URLSearchParams(search),
  memory,
  referer,
  origin: "https://kolorsensu.pl",
});

const saved = memoryValue(
  loadBookingParams(
    new URLSearchParams(
      "usluga=konsultacja&specjalista=anna&forma=stacjonarnie&lokalizacja=centrum&termin=2030-10-07T10:00",
    ),
  ),
);

describe("memoryValue", () => {
  it("keeps the choices and the chosen time's week, never the time itself", () => {
    expect(readMemory(saved)).toEqual({
      usluga: "konsultacja",
      specjalista: "anna",
      forma: "stacjonarnie",
      lokalizacja: "centrum",
      tydzien: "2030-10-07",
    });
  });

  it("nothing to keep without a choice", () => {
    expect(
      memoryValue(
        loadBookingParams(new URLSearchParams("uwaga=termin-zajety")),
      ),
    ).toBeNull();
    expect(
      memoryValue(loadBookingParams(new URLSearchParams("tydzien=2030-10-07"))),
    ).toBeNull();
  });

  it("drops what is not a valid choice", () => {
    expect(
      readMemory(
        memoryValue(
          loadBookingParams(
            new URLSearchParams("usluga=Zła wartość&forma=online"),
          ),
        ),
      ),
    ).toEqual({ forma: "online" });
  });
});

describe("readMemory", () => {
  it("nothing from nothing or nonsense", () => {
    expect(readMemory(null)).toEqual({});
    expect(readMemory("%%%")).toEqual({});
  });
});

describe("rememberedHref", () => {
  it("coming to an empty wizard brings the choices back", () => {
    expect(rememberedHref(request("", saved))).toBe(
      "/umow-wizyte?usluga=konsultacja&forma=stacjonarnie&lokalizacja=centrum&specjalista=anna&tydzien=2030-10-07",
    );
  });

  it("keeps a notice the address had", () => {
    expect(
      rememberedHref(request("uwaga=rezerwacja-wygasla", saved)),
    ).toContain("uwaga=rezerwacja-wygasla");
  });

  it("the address wins: a link's own choice is kept, the rest filled in when it fits", () => {
    expect(rememberedHref(request("usluga=konsultacja", saved))).toBe(
      "/umow-wizyte?usluga=konsultacja&forma=stacjonarnie&lokalizacja=centrum&specjalista=anna&tydzien=2030-10-07",
    );
    // Another service: what was chosen for the first may not fit it.
    expect(rememberedHref(request("usluga=terapia", saved))).toBeNull();
  });

  it("nothing to add: no redirect", () => {
    expect(
      rememberedHref(
        request(
          "usluga=konsultacja&forma=stacjonarnie&lokalizacja=centrum&specjalista=anna&tydzien=2030-10-07",
          saved,
        ),
      ),
    ).toBeNull();
    expect(rememberedHref(request("", null))).toBeNull();
  });

  it("a chosen time in the address is left alone", () => {
    expect(
      rememberedHref(
        request("usluga=konsultacja&termin=2030-10-08T09:00", saved),
      ),
    ).toBeNull();
  });

  it("inside the wizard (a choice cleared with „Zmień”) nothing comes back", () => {
    expect(
      rememberedHref(
        request(
          "",
          saved,
          "https://kolorsensu.pl/umow-wizyte?usluga=konsultacja",
        ),
      ),
    ).toBeNull();
    // From the site's other pages, or another site, it does.
    expect(
      rememberedHref(
        request("", saved, "https://kolorsensu.pl/oferta/konsultacja"),
      ),
    ).not.toBeNull();
    expect(
      rememberedHref(request("", saved, "https://example.com/umow-wizyte")),
    ).not.toBeNull();
  });
});

describe("back after the hold expired (card 14)", () => {
  it("the details step sends to the wizard, which gets the choices back and asks for a time anew", () => {
    // Where the details and payment steps send a guest whose hold expired.
    const expired = new URL(EXPIRED_HREF, "https://kolorsensu.pl");
    expect(expired.pathname).toBe("/umow-wizyte");
    expect(expired.searchParams.get("uwaga")).toBe("rezerwacja-wygasla");
    // The redirect comes from the details step, not from the wizard.
    const href = rememberedHref(
      request(
        expired.search.slice(1),
        saved,
        "https://kolorsensu.pl/umow-wizyte/dane",
      ),
    );
    const back = loadBookingParams(
      new URL(href!, "https://kolorsensu.pl").searchParams,
    );
    expect(back).toMatchObject({
      usluga: "konsultacja",
      forma: "stacjonarnie",
      lokalizacja: "centrum",
      specjalista: "anna",
      tydzien: "2030-10-07",
      termin: null,
      uwaga: "rezerwacja-wygasla",
    });
  });
});

describe("resumeValue (card 11)", () => {
  it("the wizard with the choices, without the time; nothing without a choice", () => {
    expect(
      resumeValue(
        loadBookingParams(
          new URLSearchParams(
            "usluga=konsultacja&forma=online&specjalista=anna&termin=2030-10-07T10:00",
          ),
        ),
      ),
    ).toBe(
      "/umow-wizyte?usluga=konsultacja&forma=online&specjalista=anna&tydzien=2030-10-07",
    );
    expect(resumeValue(loadBookingParams(new URLSearchParams()))).toBeNull();
  });
});
