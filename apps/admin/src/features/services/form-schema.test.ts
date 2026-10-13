import { describe, expect, it } from "vitest";
import { serviceFormSchema } from "./form-schema";

const valid = {
  name: "Psychoterapia indywidualna",
  slug: "psychoterapia-indywidualna",
  shortDescription: null,
  description: null,
  category: "psychotherapy",
  defaultDurationMinutes: 50,
  active: true,
  publiclyVisible: true,
  bookingEnabled: false,
  sortOrder: 0,
};

// The first message of each field, as the form shows it.
const messages = (input: object) => {
  const result = serviceFormSchema.safeParse({ ...valid, ...input });
  const shown: Record<string, string> = {};
  for (const issue of result.success ? [] : result.error.issues) {
    shown[String(issue.path[0])] ??= issue.message;
  }
  return shown;
};

describe("serviceFormSchema", () => {
  it("accepts a service as the catalogue does", () => {
    expect(serviceFormSchema.safeParse(valid).success).toBe(true);
  });

  it("says what is wrong in Polish (#43)", () => {
    expect(messages({ name: " " })).toEqual({ name: "Podaj nazwę usługi." });
    expect(messages({ slug: "" })).toEqual({
      slug: "Podaj adres na stronie (co najmniej 3 znaki).",
    });
    expect(messages({ slug: "Psychoterapia Indywidualna" })).toEqual({
      slug: "Tylko małe litery bez polskich znaków, cyfry i myślniki, np. psychoterapia-indywidualna.",
    });
    expect(messages({ defaultDurationMinutes: Number.NaN })).toEqual({
      defaultDurationMinutes: "Podaj czas w minutach.",
    });
    expect(messages({ defaultDurationMinutes: 10 })).toEqual({
      defaultDurationMinutes: "Od 15 do 300 minut.",
    });
    expect(messages({ sortOrder: -1 })).toEqual({
      sortOrder: "Kolejność od 0 do 10 000.",
    });
  });
});
