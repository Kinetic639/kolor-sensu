import { describe, expect, it } from "vitest";
import {
  articleDocumentSchema,
  articleHeadings,
  articleImages,
  articlePlainText,
  articleReadingMinutes,
  headingSlug,
  isArticleEmpty,
  emptyArticleDocument,
  type ArticleBlockNode,
  type ArticleDocument,
} from "./article-rich-text";
import { richTextDocumentSchema } from "./rich-text";

// The article profile: the base blocks and an article's own (images, boxes,
// quotes, tables, the booking button), each with fixed choices only.

const text = (value: string) => ({ type: "text" as const, text: value });
const paragraph = (value: string) => ({
  type: "paragraph" as const,
  content: [text(value)],
});
const heading = (value: string, level: 2 | 3 = 2) => ({
  type: "heading" as const,
  attrs: { level },
  content: [text(value)],
});
const image = {
  src: "articles/0b8c2f2e-5c4f-4c0a-9a1e-3f6c2d1b7a90.webp",
  alt: "Gabinet z fotelem przy oknie",
  width: 1600,
  height: 1067,
};
const doc = (...content: ArticleBlockNode[]): ArticleDocument => ({
  type: "doc",
  content,
});

const everyBlock = doc(
  heading("Czym jest lęk"),
  paragraph("Lęk to naturalna reakcja."),
  {
    type: "articleImage",
    attrs: { ...image, caption: "Gabinet", size: "wide" },
  },
  {
    type: "articleImagePair",
    attrs: { images: [image, { ...image, alt: "Fotel" }], caption: null },
  },
  {
    type: "callout",
    attrs: { kind: "important" },
    content: [paragraph("Zadzwoń pod 112.")],
  },
  {
    type: "pullQuote",
    attrs: { author: "Ola" },
    content: [paragraph("Pomogło mi.")],
  },
  {
    type: "table",
    content: [
      {
        type: "tableRow",
        content: [
          {
            type: "tableHeader",
            attrs: { colspan: 1, rowspan: 1, colwidth: null },
            content: [paragraph("Objaw")],
          },
          {
            type: "tableHeader",
            attrs: { colspan: 1, rowspan: 1, colwidth: null },
            content: [paragraph("Jak często")],
          },
        ],
      },
      {
        type: "tableRow",
        content: [
          {
            type: "tableCell",
            attrs: { colspan: 1, rowspan: 1, colwidth: null },
            content: [paragraph("Bezsenność")],
          },
          {
            type: "tableCell",
            attrs: { colspan: 1, rowspan: 1, colwidth: null },
            content: [paragraph("Często")],
          },
        ],
      },
    ],
  },
  { type: "horizontalRule" },
  {
    type: "bookingButton",
    attrs: { label: "Umów wizytę", service: "konsultacja-psychologiczna" },
  },
);

describe("the article profile", () => {
  it("takes every block an article has", () => {
    expect(articleDocumentSchema.parse(everyBlock)).toEqual(everyBlock);
  });

  it("is not the base profile: bios, rooms and documents refuse its blocks", () => {
    expect(richTextDocumentSchema.safeParse(everyBlock).success).toBe(false);
  });

  it("refuses an image without its text for people who cannot see it", () => {
    const result = articleDocumentSchema.safeParse(
      doc({
        type: "articleImage",
        attrs: { ...image, alt: " ", caption: null, size: "text" },
      }),
    );
    expect(result.success).toBe(false);
  });

  it("refuses an image that is not one of the site's files, and a fourth width", () => {
    for (const attrs of [
      {
        ...image,
        src: "https://example.com/a.png",
        caption: null,
        size: "text",
      },
      { ...image, src: "../articles/x.png", caption: null, size: "text" },
      { ...image, caption: null, size: "huge" },
    ]) {
      expect(
        articleDocumentSchema.safeParse(
          doc({ type: "articleImage", attrs } as never),
        ).success,
      ).toBe(false);
    }
  });

  it("refuses colours, classes and unknown blocks", () => {
    expect(
      articleDocumentSchema.safeParse(
        doc({
          type: "callout",
          attrs: { kind: "important", color: "red" },
          content: [paragraph("x")],
        } as never),
      ).success,
    ).toBe(false);
    expect(
      articleDocumentSchema.safeParse(
        doc({ type: "youtube", attrs: { src: "x" } } as never),
      ).success,
    ).toBe(false);
    expect(
      articleDocumentSchema.safeParse(
        doc({
          type: "callout",
          attrs: { kind: "danger" },
          content: [paragraph("x")],
        } as never),
      ).success,
    ).toBe(false);
  });

  it("keeps the booking button to a label and, at most, a service", () => {
    expect(
      articleDocumentSchema.safeParse(
        doc({ type: "bookingButton", attrs: { label: "", service: null } }),
      ).success,
    ).toBe(false);
    expect(
      articleDocumentSchema.safeParse(
        doc({
          type: "bookingButton",
          attrs: { label: "Umów", service: "/admin" },
        }),
      ).success,
    ).toBe(false);
  });

  it("keeps tables to a reasonable size", () => {
    const cell = { type: "tableCell" as const, content: [paragraph("x")] };
    const wide = {
      type: "tableRow" as const,
      content: Array.from({ length: 9 }, () => cell),
    };
    expect(
      articleDocumentSchema.safeParse(doc({ type: "table", content: [wide] }))
        .success,
    ).toBe(false);
  });
});

describe("an article's words", () => {
  it("are read from every block, images left out", () => {
    const words = articlePlainText(everyBlock);
    for (const part of [
      "Czym jest lęk",
      "Zadzwoń pod 112.",
      "Pomogło mi.",
      "Bezsenność",
    ]) {
      expect(words).toContain(part);
    }
    expect(words).not.toContain("Gabinet z fotelem");
  });

  it("take about a minute per 200 words, never less than one", () => {
    expect(articleReadingMinutes(doc(paragraph("krótko")))).toBe(1);
    const long = Array.from({ length: 1000 }, () => "słowo").join(" ");
    expect(articleReadingMinutes(doc(paragraph(long)))).toBe(5);
  });

  it("start empty", () => {
    expect(isArticleEmpty(emptyArticleDocument)).toBe(true);
    expect(isArticleEmpty(doc({ type: "horizontalRule" }))).toBe(false);
  });

  it("list their images", () => {
    expect(articleImages(everyBlock)).toHaveLength(3);
  });
});

describe("an article's headings", () => {
  it("have ids from their words, Polish letters folded, each unique", () => {
    expect(headingSlug("Źródła i łagodne ćwiczenia")).toBe(
      "zrodla-i-lagodne-cwiczenia",
    );
    expect(
      articleHeadings(
        doc(heading("Objawy"), heading("Leczenie", 3), heading("Objawy")),
      ),
    ).toEqual([
      { level: 2, text: "Objawy", id: "objawy" },
      { level: 3, text: "Leczenie", id: "leczenie" },
      { level: 2, text: "Objawy", id: "objawy-2" },
    ]);
  });

  it("leave empty headings out", () => {
    expect(
      articleHeadings(doc({ type: "heading", attrs: { level: 2 } })),
    ).toEqual([]);
  });
});
