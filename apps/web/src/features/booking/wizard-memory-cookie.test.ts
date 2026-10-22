import { describe, expect, it } from "vitest";
import { memoryCookie } from "./wizard-memory-cookie";

describe("memoryCookie", () => {
  it("a day, only for the wizard, secure on https", () => {
    expect(memoryCookie("usluga=konsultacja&forma=online", true)).toBe(
      "ks_wybory=usluga%3Dkonsultacja%26forma%3Donline; Path=/umow-wizyte; Max-Age=86400; SameSite=Lax; Secure",
    );
    expect(memoryCookie("forma=online", false)).not.toContain("Secure");
  });
});
