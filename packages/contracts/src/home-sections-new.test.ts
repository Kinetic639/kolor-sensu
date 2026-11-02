import { describe, expect, it } from "vitest";
import {
  crisisHelpContentSchema,
  defaultCrisisHelp,
  defaultHomeHeaders,
  defaultHomeLocation,
  defaultNewsletterBand,
  defaultWhyUs,
  HOME_HEADER_SECTIONS,
  homeLocationContentSchema,
  newsletterBandContentSchema,
  whyUsContentSchema,
} from "./cms";

// The homepage's sections added on 18.10: "Dlaczego my" under the areas of
// help, the newsletter band, the crisis strip and "Gdzie jesteśmy".

const fact = (title: string) => ({ title, text: `${title}: krótko.` });

describe("Dlaczego my", () => {
  it("holds two to four facts", () => {
    for (const count of [2, 3, 4]) {
      const facts = Array.from({ length: count }, (_, i) => fact(`F${i}`));
      expect(
        whyUsContentSchema.safeParse({ visible: true, facts }).success,
      ).toBe(true);
    }
    for (const count of [1, 5]) {
      const facts = Array.from({ length: count }, (_, i) => fact(`F${i}`));
      expect(
        whyUsContentSchema.safeParse({ visible: true, facts }).success,
      ).toBe(false);
    }
  });

  it("refuses an empty title or an unknown field", () => {
    expect(
      whyUsContentSchema.safeParse({
        visible: true,
        facts: [fact(""), fact("Poufność")],
      }).success,
    ).toBe(false);
    expect(
      whyUsContentSchema.safeParse({ ...defaultWhyUs, colour: "red" }).success,
    ).toBe(false);
  });

  it("stays hidden until the admin publishes facts the centre stands by", () => {
    expect(defaultWhyUs.visible).toBe(false);
    expect(whyUsContentSchema.parse(defaultWhyUs)).toEqual(defaultWhyUs);
  });
});

describe("the newsletter band", () => {
  it("is only shown or hidden, and hidden until signing up works", () => {
    expect(newsletterBandContentSchema.parse({ visible: true })).toEqual({
      visible: true,
    });
    expect(
      newsletterBandContentSchema.safeParse({ visible: true, email: "x" })
        .success,
    ).toBe(false);
    expect(defaultNewsletterBand.visible).toBe(false);
  });
});

describe("Gdzie jesteśmy", () => {
  it("is shown or hidden, and shown from the start", () => {
    expect(homeLocationContentSchema.parse({ visible: false })).toEqual({
      visible: false,
    });
    expect(defaultHomeLocation.visible).toBe(true);
  });
});

describe("the crisis strip", () => {
  it("keeps older published payloads readable with editable intro and link defaults", () => {
    const legacy = {
      heading: "Pomoc",
      text: "Opis",
      lines: [{ number: "123", label: "Linia", detail: "" }],
    };
    const content = crisisHelpContentSchema.parse(legacy);
    expect(content).toMatchObject({
      eyebrow: "Pomoc w kryzysie",
      moreLabel: "Więcej o pomocy w kryzysie",
    });
  });
  it("lists one to six lines, each a number to call", () => {
    const line = { number: "116 123", label: "Telefon", detail: "" };
    expect(
      crisisHelpContentSchema.safeParse({
        ...defaultCrisisHelp,
        lines: [line],
      }).success,
    ).toBe(true);
    expect(
      crisisHelpContentSchema.safeParse({ ...defaultCrisisHelp, lines: [] })
        .success,
    ).toBe(false);
    expect(
      crisisHelpContentSchema.safeParse({
        ...defaultCrisisHelp,
        lines: Array.from({ length: 7 }, () => line),
      }).success,
    ).toBe(false);
  });

  it("takes only digits, spaces and a leading plus as a number", () => {
    for (const number of ["112", "800 702 222", "+48 22 123 45 67"]) {
      expect(
        crisisHelpContentSchema.safeParse({
          ...defaultCrisisHelp,
          lines: [{ number, label: "Linia", detail: "" }],
        }).success,
      ).toBe(true);
    }
    for (const number of ["", "zadzwoń", "112; DROP", "1+12"]) {
      expect(
        crisisHelpContentSchema.safeParse({
          ...defaultCrisisHelp,
          lines: [{ number, label: "Linia", detail: "" }],
        }).success,
      ).toBe(false);
    }
  });

  it("starts from the emergency number, then the support lines", () => {
    expect(defaultCrisisHelp.lines.map((line) => line.number)).toEqual([
      "112",
      "800 702 222",
      "116 123",
      "116 111",
    ]);
    expect(crisisHelpContentSchema.parse(defaultCrisisHelp)).toEqual(
      defaultCrisisHelp,
    );
  });
});

describe("the homepage's headers", () => {
  it("include the new sections, in the page's order", () => {
    expect(HOME_HEADER_SECTIONS.map((section) => section.key)).toEqual([
      "supportAreas",
      "whyUs",
      "firstSteps",
      "spotlight",
      "specialists",
      "rooms",
      "workshops",
      "story",
      "newsletter",
      "location",
    ]);
    expect(Object.keys(defaultHomeHeaders)).toEqual(
      HOME_HEADER_SECTIONS.map((section) => section.key),
    );
  });
});
