import { describe, expect, it } from "vitest";
import { pageHeader, pageHeaderSchema } from "./cms-shared";

// A page's header: a section's header (eyebrow, title lines with coloured
// words, a description with one link) whose title has two lines and which
// has no call to action.

const header = pageHeader({
  eyebrow: "Nasza oferta",
  title: "Oferta",
  accent: "Wsparcie w różnych obszarach życia",
  lead: "Terapia i konsultacje.",
});

describe("a page's header", () => {
  it("keeps the site's look: pink eyebrow, ink first line, green second", () => {
    expect(header).toEqual({
      eyebrow: { text: "Nasza oferta", tone: "pink" },
      title: [
        [{ text: "Oferta", tone: "default" }],
        [{ text: "Wsparcie w różnych obszarach życia", tone: "green" }],
      ],
      description: [{ text: "Terapia i konsultacje.", link: null }],
      cta: null,
    });
    expect(pageHeaderSchema.parse(header)).toEqual(header);
  });

  it("may leave its second line out, never its first", () => {
    expect(pageHeader({ title: "Kontakt" }).title).toHaveLength(1);
    expect(pageHeaderSchema.safeParse({ ...header, title: [] }).success).toBe(
      false,
    );
  });

  it("has at most two lines, any words in another colour", () => {
    const line = [
      { text: "Spokojnie, ", tone: "default" },
      { text: "uważnie", tone: "pink" },
    ];
    expect(
      pageHeaderSchema.safeParse({ ...header, title: [line, line] }).success,
    ).toBe(true);
    expect(
      pageHeaderSchema.safeParse({ ...header, title: [line, line, line] })
        .success,
    ).toBe(false);
  });

  it("has no call to action, and one link at most in its description", () => {
    expect(
      pageHeaderSchema.safeParse({
        ...header,
        cta: { label: "Umów", href: "/umow-wizyte", style: "button" },
      }).success,
    ).toBe(false);
    const link = { href: "/kontakt", tone: "green" } as const;
    expect(
      pageHeaderSchema.safeParse({
        ...header,
        description: [
          { text: "Napisz", link },
          { text: " albo ", link: null },
          { text: "zadzwoń", link },
        ],
      }).success,
    ).toBe(false);
  });
});
