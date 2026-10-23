import {
  pageHeader,
  pageHeaderSchema,
  plainHeader,
  sectionHeaderSchema,
} from "@repo/contracts";
import { describe, expect, it } from "vitest";
import {
  descriptionToDraft,
  draftToDescription,
  draftToHeader,
  draftToLine,
  draftToPageHeader,
  headerToDraft,
  lineToDraft,
  linkOver,
  moveLink,
  NEXT_TONE,
  pageHeaderToDraft,
  retone,
} from "./header-editor";

describe("title lines", () => {
  it("reads a line as its text and a colour per word", () => {
    expect(
      lineToDraft([
        { text: "Twoja droga do ", tone: "default" },
        { text: "lepszego", tone: "green" },
        { text: " samopoczucia", tone: "pink" },
      ]),
    ).toEqual({
      text: "Twoja droga do lepszego samopoczucia",
      tones: ["default", "default", "default", "green", "pink"],
    });
  });

  it("writes words of one colour as one run, spaces with the run before", () => {
    expect(
      draftToLine({
        text: "Twoja droga do lepszego samopoczucia",
        tones: ["default", "default", "default", "green", "green"],
      }),
    ).toEqual([
      { text: "Twoja droga do ", tone: "default" },
      { text: "lepszego samopoczucia", tone: "green" },
    ]);
  });

  it("goes there and back unchanged (spaces ride with the run before them)", () => {
    const line = [
      { text: "W czym ", tone: "default" as const },
      { text: "możemy ", tone: "pink" as const },
      { text: "pomóc", tone: "default" as const },
    ];
    expect(draftToLine(lineToDraft(line))).toEqual(line);
  });

  it("trims the line's ends and collapses runs of spaces", () => {
    expect(
      draftToLine({ text: "  Dwa   słowa ", tones: ["pink", "pink"] }),
    ).toEqual([{ text: "Dwa słowa", tone: "pink" }]);
  });

  it("keeps the colour of words that stay when the text changes", () => {
    expect(
      retone(
        {
          text: "Twoja droga do zdrowia",
          tones: ["default", "default", "default", "green"],
        },
        "Twoja krótka droga do zdrowia",
      ).tones,
    ).toEqual(["default", "default", "default", "default", "green"]);
  });

  it("cycles a word's colour: plain, pink, green, plain", () => {
    expect(NEXT_TONE.default).toBe("pink");
    expect(NEXT_TONE.pink).toBe("green");
    expect(NEXT_TONE.green).toBe("default");
  });
});

describe("the description's link", () => {
  const text = "Zacznij od rozmowy z nami.";

  it("is a stretch of the text, there and back", () => {
    const parts = [
      { text: "Zacznij od ", link: null },
      {
        text: "rozmowy",
        link: { href: "/umow-wizyte" as const, tone: "pink" as const },
      },
      { text: " z nami.", link: null },
    ];
    const draft = descriptionToDraft(parts);
    expect(draft).toEqual({
      text,
      link: { start: 11, end: 18, href: "/umow-wizyte", tone: "pink" },
    });
    expect(draftToDescription(draft)).toEqual(parts);
  });

  it("can sit at the very start or end", () => {
    expect(
      draftToDescription({
        text: "Oferta i więcej",
        link: { start: 0, end: 6, href: "/oferta", tone: "default" },
      }),
    ).toEqual([
      { text: "Oferta", link: { href: "/oferta", tone: "default" } },
      { text: " i więcej", link: null },
    ]);
  });

  it("is made over a selection, without the spaces at its ends", () => {
    expect(linkOver(text, 10, 19, "/oferta")).toEqual({
      start: 11,
      end: 18,
      href: "/oferta",
      tone: "default",
    });
    expect(linkOver(text, 10, 11, "/oferta")).toBeNull();
  });

  it("follows its words when the text around them changes, and goes with them", () => {
    const link = {
      start: 11,
      end: 18,
      href: "/oferta" as const,
      tone: "default" as const,
    };
    expect(
      moveLink(text, "Zawsze zacznij od rozmowy z nami.", link),
    ).toMatchObject({
      start: 18,
      end: 25,
    });
    expect(moveLink(text, "Zacznij od telefonu.", link)).toBeNull();
  });

  it("is no description at all when the text is empty", () => {
    expect(draftToDescription({ text: "  ", link: null })).toEqual([]);
  });
});

describe("a whole header", () => {
  it("goes there and back, and is valid", () => {
    const header = sectionHeaderSchema.parse({
      eyebrow: { text: "Jak zacząć", tone: "green" },
      title: [
        [
          { text: "Twoja droga do ", tone: "default" },
          { text: "lepszego", tone: "pink" },
        ],
        [{ text: "samopoczucia", tone: "default" }],
      ],
      description: [
        { text: "Zobacz ", link: null },
        { text: "ofertę", link: { href: "/oferta", tone: "green" } },
      ],
      cta: { label: "Umów wizytę", href: "/umow-wizyte", style: "button" },
    });
    const back = draftToHeader(headerToDraft(header));
    expect(back).toEqual(header);
    expect(sectionHeaderSchema.safeParse(back).success).toBe(true);
  });

  it("keeps a plain header plain", () => {
    const header = plainHeader({ eyebrow: "O nas", title: "Kim jesteśmy" });
    expect(draftToHeader(headerToDraft(header))).toEqual(header);
  });
});

describe("a page's header", () => {
  it("always shows the title's two lines, the second empty if unused", () => {
    const draft = pageHeaderToDraft(pageHeader({ title: "Kontakt" }));
    expect(draft.lines).toEqual([
      { text: "Kontakt", tones: ["default"] },
      { text: "", tones: [] },
    ]);
    expect(draft.cta).toBeNull();
  });

  it("stores an empty second line as no line, and never a call to action", () => {
    const draft = pageHeaderToDraft(pageHeader({ title: "Kontakt" }));
    const header = draftToPageHeader({
      ...draft,
      cta: { label: "Umów", href: "/umow-wizyte", style: "button" },
    });
    expect(header.title).toEqual([[{ text: "Kontakt", tone: "default" }]]);
    expect(header.cta).toBeNull();
    expect(pageHeaderSchema.safeParse(header).success).toBe(true);
  });

  it("keeps the site's two-line header as it is", () => {
    const header = pageHeader({
      eyebrow: "Nasza oferta",
      title: "Oferta",
      accent: "Wsparcie w różnych obszarach życia",
      lead: "Terapia i konsultacje.",
    });
    expect(draftToPageHeader(pageHeaderToDraft(header))).toEqual(header);
  });

  it("leaves the first line empty for the check to flag", () => {
    const draft = pageHeaderToDraft(pageHeader({ title: "Oferta" }));
    const header = draftToPageHeader({
      ...draft,
      lines: [
        { text: "", tones: [] },
        { text: "Drugi", tones: ["green"] },
      ],
    });
    expect(pageHeaderSchema.safeParse(header).success).toBe(false);
  });
});
