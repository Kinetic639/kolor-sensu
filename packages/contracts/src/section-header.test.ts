import { describe, expect, it } from "vitest";
import {
  headerTitleText,
  plainHeader,
  sectionHeaderSchema,
  SITE_PAGES,
} from "./section-header";

const header = (overrides: Record<string, unknown> = {}) => ({
  eyebrow: { text: "Jak zacząć", tone: "pink" },
  title: [
    [
      { text: "Twoja droga do ", tone: "default" },
      { text: "lepszego", tone: "green" },
    ],
    [{ text: "samopoczucia", tone: "default" }],
  ],
  description: [
    { text: "Zacznij od ", link: null },
    { text: "rozmowy", link: { href: "/umow-wizyte", tone: "pink" } },
    { text: " z nami.", link: null },
  ],
  cta: { label: "Umów wizytę", href: "/umow-wizyte", style: "button" },
  ...overrides,
});

describe("section header", () => {
  it("accepts an eyebrow, a two-line title with coloured words, a link anywhere in the description and a call to action", () => {
    const parsed = sectionHeaderSchema.parse(header());
    expect(parsed.title).toHaveLength(2);
    expect(parsed.description[1]!.link).toEqual({
      href: "/umow-wizyte",
      tone: "pink",
    });
  });

  it("needs only a title; the rest defaults to nothing", () => {
    expect(
      sectionHeaderSchema.parse({
        title: [[{ text: "O nas", tone: "default" }]],
      }),
    ).toEqual({
      eyebrow: { text: "", tone: "default" },
      title: [[{ text: "O nas", tone: "default" }]],
      description: [],
      cta: null,
    });
  });

  it("keeps the title to one or two lines, none of them empty", () => {
    expect(sectionHeaderSchema.safeParse(header({ title: [] })).success).toBe(
      false,
    );
    const line = [{ text: "Słowo", tone: "default" }];
    expect(
      sectionHeaderSchema.safeParse(header({ title: [line, line, line] }))
        .success,
    ).toBe(false);
    expect(
      sectionHeaderSchema.safeParse(
        header({ title: [[{ text: "   ", tone: "default" }]] }),
      ).success,
    ).toBe(false);
  });

  it("takes only the theme's colours", () => {
    expect(
      sectionHeaderSchema.safeParse(
        header({ eyebrow: { text: "Hej", tone: "#ff0000" } }),
      ).success,
    ).toBe(false);
  });

  it("links only to the site's own pages, from the description and the call to action", () => {
    expect(
      sectionHeaderSchema.safeParse(
        header({
          description: [
            {
              text: "tutaj",
              link: { href: "https://example.com", tone: "default" },
            },
          ],
        }),
      ).success,
    ).toBe(false);
    expect(
      sectionHeaderSchema.safeParse(
        header({ cta: { label: "Zobacz", href: "/admin", style: "button" } }),
      ).success,
    ).toBe(false);
    expect(SITE_PAGES.map((page) => page.href)).toContain("/oferta");
  });

  it("allows one link in the description", () => {
    const link = { href: "/oferta", tone: "default" };
    expect(
      sectionHeaderSchema.safeParse(
        header({
          description: [
            { text: "jeden", link },
            { text: " i ", link: null },
            { text: "drugi", link },
          ],
        }),
      ).success,
    ).toBe(false);
  });

  it("limits the lengths: title, description, link and call to action", () => {
    const long = (n: number) => "a".repeat(n);
    expect(
      sectionHeaderSchema.safeParse(
        header({
          title: [
            [{ text: long(60), tone: "default" }],
            [{ text: long(41), tone: "default" }],
          ],
        }),
      ).success,
    ).toBe(false);
    expect(
      sectionHeaderSchema.safeParse(
        header({ description: [{ text: long(301), link: null }] }),
      ).success,
    ).toBe(false);
    expect(
      sectionHeaderSchema.safeParse(
        header({
          description: [
            { text: long(61), link: { href: "/oferta", tone: "default" } },
          ],
        }),
      ).success,
    ).toBe(false);
    expect(
      sectionHeaderSchema.safeParse(
        header({ cta: { label: long(41), href: "/oferta", style: "arrow" } }),
      ).success,
    ).toBe(false);
  });

  it("refuses fields it does not know", () => {
    expect(sectionHeaderSchema.safeParse(header({ level: "h1" })).success).toBe(
      false,
    );
  });
});

describe("plainHeader", () => {
  it("builds a header of plain words in the default colour", () => {
    expect(
      plainHeader({
        eyebrow: "Nasze gabinety",
        title: "Przestrzeń, która wspiera",
        description: "Jasne gabinety.",
      }),
    ).toEqual({
      eyebrow: { text: "Nasze gabinety", tone: "default" },
      title: [[{ text: "Przestrzeń, która wspiera", tone: "default" }]],
      description: [{ text: "Jasne gabinety.", link: null }],
      cta: null,
    });
  });

  it("takes a two-line title, and is valid", () => {
    const built = plainHeader({ title: ["Twoja droga do", "samopoczucia"] });
    expect(built.title).toHaveLength(2);
    expect(sectionHeaderSchema.safeParse(built).success).toBe(true);
  });
});

describe("headerTitleText", () => {
  it("reads the title as plain words, both lines", () => {
    expect(headerTitleText(sectionHeaderSchema.parse(header()))).toBe(
      "Twoja droga do lepszego samopoczucia",
    );
  });
});
