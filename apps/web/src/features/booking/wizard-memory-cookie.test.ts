import { describe, expect, it } from "vitest";
import { memoryCookie, resumeCookie } from "./wizard-memory-cookie";

describe("memoryCookie", () => {
  it("a day, only for the wizard, secure on https", () => {
    expect(memoryCookie("usluga=konsultacja&forma=online", true)).toBe(
      "ks_wybory=usluga%3Dkonsultacja%26forma%3Donline; Path=/umow-wizyte; Max-Age=86400; SameSite=Lax; Secure",
    );
    expect(memoryCookie("forma=online", false)).not.toContain("Secure");
  });
});

describe("resumeCookie", () => {
  it("the link back, on every page, for a day; cleared with null", () => {
    expect(resumeCookie("/umow-wizyte?usluga=konsultacja", true)).toBe(
      "ks_rezerwacja=%2Fumow-wizyte%3Fusluga%3Dkonsultacja; Path=/; Max-Age=86400; SameSite=Lax; Secure",
    );
    expect(resumeCookie(null, false)).toBe(
      "ks_rezerwacja=; Path=/; Max-Age=0; SameSite=Lax",
    );
  });
});
