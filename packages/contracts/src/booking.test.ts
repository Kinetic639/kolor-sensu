import { describe, expect, it } from "vitest";
import {
  bookingDetailsSchema,
  centreBookingMessage,
  centreBookingSchema,
} from "./booking";

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

describe("centreBookingSchema", () => {
  const booking = {
    offerId: "10000000-0000-4000-8000-000000000001",
    mode: "in_person",
    date: "2030-10-02",
    time: "12:15",
    roomId: "20000000-0000-4000-8000-000000000001",
    name: " Ewa Klientka ",
    email: " Ewa@Example.com ",
    phone: "",
    notes: "",
  };
  const problems = (input: object) => {
    const result = centreBookingSchema.safeParse({ ...booking, ...input });
    return result.success
      ? {}
      : Object.fromEntries(
          result.error.issues.map((issue) => [issue.path[0], issue.message]),
        );
  };

  it("cleans a booking up", () => {
    expect(centreBookingSchema.parse(booking)).toEqual({
      ...booking,
      name: "Ewa Klientka",
      email: "ewa@example.com",
      phone: null,
      notes: null,
    });
  });

  it("needs the client's e-mail (the link to pay), a room in person and a real time", () => {
    expect(problems({ email: "", phone: "600 100 200" })).toEqual({
      email: "Podaj e-mail klienta: wyślemy na niego link do płatności.",
    });
    expect(problems({ email: "ewa@" })).toEqual({
      email: "Podaj poprawny adres e-mail.",
    });
    expect(problems({ roomId: null })).toEqual({ roomId: "Wybierz gabinet." });
    expect(problems({ mode: "online", roomId: null })).toEqual({});
    expect(problems({ time: "25:00", date: "2030-02-30" })).toEqual({
      date: "Podaj poprawną datę.",
      time: "Podaj godzinę (GG:MM).",
    });
    expect(problems({ offerId: "", name: "E" })).toEqual({
      offerId: "Wybierz usługę.",
      name: "Podaj imię i nazwisko.",
    });
  });
});

describe("centreBookingMessage", () => {
  it("says why in Polish, with a fallback", () => {
    expect(centreBookingMessage("room_busy")).toBe(
      "Gabinet jest wtedy zajęty.",
    );
    expect(centreBookingMessage("too_soon")).toMatch(/za mało czasu/);
    expect(centreBookingMessage("whatever")).toBe(
      "Nie udało się zapisać wizyty.",
    );
    expect(centreBookingMessage(undefined)).toBe(
      "Nie udało się zapisać wizyty.",
    );
  });
});
