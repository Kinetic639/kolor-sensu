import { describe, expect, it } from "vitest";
import { bookingDetailsSchema } from "./booking";

const valid = {
  name: "  Anna Nowak ",
  email: " Anna@Example.com ",
  phone: "+48 600 100 200",
  notes: "",
  acceptTerms: true,
  acceptPrivacy: true,
};

function errors(input: object) {
  const result = bookingDetailsSchema.safeParse({ ...valid, ...input });
  return result.success
    ? {}
    : Object.fromEntries(
        result.error.issues.map((issue) => [issue.path[0], issue.message]),
      );
}

describe("bookingDetailsSchema", () => {
  it("tidies the details: trimmed, e-mail in lower case, no empty notes", () => {
    expect(bookingDetailsSchema.parse(valid)).toEqual({
      name: "Anna Nowak",
      email: "anna@example.com",
      phone: "+48 600 100 200",
      notes: null,
      acceptTerms: true,
      acceptPrivacy: true,
    });
  });

  it("asks for a name, a real e-mail and a phone number", () => {
    expect(errors({ name: " " })).toEqual({ name: "Podaj imię i nazwisko." });
    expect(errors({ email: "anna@" })).toEqual({
      email: "Podaj poprawny adres e-mail.",
    });
    expect(errors({ phone: "12" })).toEqual({
      phone: "Podaj numer telefonu (9–15 cyfr).",
    });
    expect(errors({ phone: "600-100-200x" })).toEqual({
      phone: "Podaj numer telefonu (9–15 cyfr).",
    });
  });

  it("keeps notes short", () => {
    expect(errors({ notes: "a".repeat(1001) })).toEqual({
      notes: "Uwagi mogą mieć najwyżej 1000 znaków.",
    });
  });

  it("needs both consents", () => {
    expect(errors({ acceptTerms: false, acceptPrivacy: false })).toEqual({
      acceptTerms: "Zaakceptuj regulamin, aby zarezerwować wizytę.",
      acceptPrivacy:
        "Zaakceptuj politykę prywatności, aby zarezerwować wizytę.",
    });
  });
});
