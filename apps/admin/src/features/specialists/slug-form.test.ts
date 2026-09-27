import { describe, expect, it } from "vitest";
import { publicSlugFormSchema, suggestPublicSlug } from "./slug-form";

describe("suggestPublicSlug", () => {
  it("builds the address from the specialist's name", () => {
    expect(suggestPublicSlug("Anna Maria Kłobuchowska")).toBe(
      "anna-maria-klobuchowska",
    );
  });

  it("gives nothing for names too short to be an address", () => {
    expect(suggestPublicSlug("Ó")).toBe("");
  });
});

describe("publicSlugFormSchema", () => {
  it("accepts a lower-case address with hyphens", () => {
    expect(
      publicSlugFormSchema.safeParse({ slug: "anna-kowalska" }).success,
    ).toBe(true);
  });

  it("explains what is wrong with an address", () => {
    const message = (slug: string) =>
      publicSlugFormSchema.safeParse({ slug }).error?.issues[0]?.message;
    expect(message("ab")).toBe("Adres musi mieć od 3 do 100 znaków.");
    expect(message("Anna Kowalska")).toBe(
      "Używaj małych liter bez polskich znaków, cyfr i pojedynczych myślników.",
    );
    expect(message("anna--kowalska")).toBe(
      "Używaj małych liter bez polskich znaków, cyfr i pojedynczych myślników.",
    );
  });
});
