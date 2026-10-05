import { describe, expect, it } from "vitest";
import { emailHref, loadEmailParams } from "./search-params";

describe("E-maile in the address", () => {
  it("the e-mail shown, as it looks unless asked for its text", () => {
    expect(loadEmailParams(new URLSearchParams("?mail=refunded"))).toEqual({
      mail: "refunded",
      widok: "wyglad",
    });
    expect(emailHref({ mail: "refunded" })).toBe("/maile?mail=refunded");
    expect(emailHref({ mail: "refunded", widok: "tekst" })).toBe(
      "/maile?mail=refunded&widok=tekst",
    );
  });
});
