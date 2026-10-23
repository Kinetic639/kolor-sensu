import { describe, expect, it } from "vitest";
import { defaultLegalPages } from "./cms-legal-content";
import { LEGAL_PAGES, legalPageContentSchema } from "./cms-legal";
import { plainTextFromRichText } from "./rich-text";

// The legal documents: each page's header, its document as rich text and
// the date it applies from; the site's samples stand in until published.

describe("the legal pages", () => {
  it("each start from a valid sample that says it is one", () => {
    for (const { key } of LEGAL_PAGES) {
      const page = defaultLegalPages[key];
      expect(legalPageContentSchema.parse(page)).toEqual(page);
      expect(plainTextFromRichText(page.body)).toMatch(/przykładowa treść/);
    }
  });

  it("are titled as the site's footer names them", () => {
    expect(
      LEGAL_PAGES.map(
        ({ key }) => defaultLegalPages[key].intro.title[0]![0]!.text,
      ),
    ).toEqual(["Regulamin", "Polityka prywatności", "Pliki cookies"]);
  });

  it("link only within the site", () => {
    for (const { key } of LEGAL_PAGES) {
      const hrefs = JSON.stringify(defaultLegalPages[key].body).match(
        /"href":"([^"]+)"/g,
      );
      for (const href of hrefs ?? []) expect(href).toMatch(/"href":"\//);
    }
  });

  it("refuse a document that is not rich text, and an unsafe link", () => {
    const page = defaultLegalPages.legal_terms;
    expect(
      legalPageContentSchema.safeParse({ ...page, body: "<p>Regulamin</p>" })
        .success,
    ).toBe(false);
    expect(
      legalPageContentSchema.safeParse({
        ...page,
        body: {
          type: "doc",
          content: [
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  text: "klik",
                  marks: [
                    { type: "link", attrs: { href: "javascript:alert(1)" } },
                  ],
                },
              ],
            },
          ],
        },
      }).success,
    ).toBe(false);
  });
});
