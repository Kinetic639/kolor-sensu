import { describe, expect, it } from "vitest";
import { serviceFailure } from "./action-errors";

describe("serviceFailure", () => {
  it("puts a taken address on its field", () => {
    expect(serviceFailure({ code: "23505" })).toEqual({
      ok: false,
      message: "Usługa z takim adresem już istnieje.",
      field: "slug",
    });
  });

  it("keeps other failures on the form", () => {
    expect(serviceFailure({ name: "ZodError" })).toEqual({
      ok: false,
      message: "Sprawdź poprawność danych formularza.",
    });
    expect(serviceFailure(new Error("network"))).toEqual({
      ok: false,
      message: "Nie udało się zapisać usługi. Spróbuj ponownie.",
    });
  });
});
