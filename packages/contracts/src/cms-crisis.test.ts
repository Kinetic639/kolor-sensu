import { describe, expect, it } from "vitest";
import { crisisHelpContentSchema, defaultCrisisHelp } from "./cms";

describe("crisis section heading styles", () => {
  it("keeps existing text-only CMS content valid", () => {
    expect(crisisHelpContentSchema.parse(defaultCrisisHelp)).toEqual(
      defaultCrisisHelp,
    );
  });
  it("preserves independent word and eyebrow colors without changing the contacts", () => {
    const content = {
      ...defaultCrisisHelp,
      header: {
        eyebrow: { text: "Pomoc", tone: "green" },
        title: [
          [
            { text: "Potrzebujesz ", tone: "default" },
            { text: "pomocy", tone: "pink" },
          ],
          [{ text: "teraz?", tone: "green" }],
        ],
      },
    };
    expect(crisisHelpContentSchema.parse(content)).toEqual(content);
  });
  it("rejects colors outside the shared heading palette", () => {
    expect(
      crisisHelpContentSchema.safeParse({
        ...defaultCrisisHelp,
        header: {
          eyebrow: { text: "Pomoc", tone: "blue" },
          title: [[{ text: "Tytuł", tone: "default" }]],
        },
      }).success,
    ).toBe(false);
  });
});
