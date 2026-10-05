import { describe, expect, it } from "vitest";
import {
  closingMessage,
  VISIT_TAGS,
  visitClosingSchema,
} from "./visit-closing";

describe("visitClosingSchema", () => {
  it("the outcome, the tags once each, a short note (blank: none)", () => {
    expect(
      visitClosingSchema.parse({
        outcome: "no_show",
        tags: ["late", "late"],
        note: "  ",
      }),
    ).toEqual({ outcome: "no_show", tags: ["late"], note: null });
  });

  it("only the known tags; the note at most 300 characters", () => {
    expect(
      visitClosingSchema.safeParse({ outcome: "attended", tags: ["health"] })
        .success,
    ).toBe(false);
    const long = visitClosingSchema.safeParse({
      outcome: "attended",
      tags: [],
      note: "x".repeat(301),
    });
    expect(long.error?.issues[0]?.message).toBe(
      "Najwyżej 300 znaków: krótka notatka organizacyjna.",
    );
  });

  it("each tag in words", () => {
    expect(VISIT_TAGS.map((tag) => tag.label)).toEqual([
      "Spóźnienie klienta",
      "Skrócona wizyta",
      "Trudny kontakt",
      "Do kontaktu z centrum",
      "Problem techniczny",
    ]);
    expect(closingMessage("not_closable")).toBe(
      "Zamknąć można tylko opłaconą wizytę, która już się zaczęła.",
    );
  });
});
