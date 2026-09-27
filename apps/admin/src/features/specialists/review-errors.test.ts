import { describe, expect, it } from "vitest";
import { reviewErrorMessage } from "./review-errors";

describe("reviewErrorMessage", () => {
  it("explains a missing admin role", () => {
    expect(
      reviewErrorMessage({ code: "42501", message: "Admin role required" }),
    ).toBe("Brak uprawnień administratora.");
  });

  it("explains a draft that is no longer waiting", () => {
    expect(
      reviewErrorMessage({ code: "P0002", message: "Pending draft not found" }),
    ).toBe(
      "Ten szkic nie czeka już na weryfikację. Odśwież stronę, aby zobaczyć aktualny stan.",
    );
  });

  it("falls back to a generic message", () => {
    expect(reviewErrorMessage(new Error("boom"))).toBe(
      "Nie udało się zakończyć weryfikacji. Spróbuj ponownie.",
    );
  });
});
