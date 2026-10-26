import { describe, expect, it } from "vitest";
import { clientDetailsSchema, clientMessage } from "./clients";

describe("clientDetailsSchema", () => {
  it("tidies what was typed: trimmed, the address lowercase, blanks as none", () => {
    expect(
      clientDetailsSchema.parse({
        firstName: "  Jan ",
        lastName: " Kowalski ",
        email: " Jan@Example.INVALID ",
        phone: "  ",
        notes: "",
      }),
    ).toEqual({
      firstName: "Jan",
      lastName: "Kowalski",
      email: "jan@example.invalid",
      phone: null,
      notes: null,
    });
  });

  it("says what is wrong, field by field", () => {
    const result = clientDetailsSchema.safeParse({
      firstName: "",
      lastName: "",
      email: "not an e-mail",
      phone: "12",
      notes: "x".repeat(5001),
    });
    expect(result.success).toBe(false);
    expect(
      Object.fromEntries(
        result.error!.issues.map((issue) => [issue.path[0], issue.message]),
      ),
    ).toEqual({
      firstName: "Podaj imię.",
      lastName: "Podaj nazwisko.",
      email: "Podaj poprawny adres e-mail.",
      phone: "Podaj numer telefonu (3–40 znaków).",
      notes: "Notatka może mieć najwyżej 5000 znaków.",
    });
  });
});

describe("clientMessage", () => {
  it("explains the database's refusals", () => {
    expect(clientMessage("email_taken")).toMatch(
      /Inny klient ma już ten adres/,
    );
    expect(clientMessage("whatever")).toBe("Nie udało się zapisać zmian.");
  });
});
