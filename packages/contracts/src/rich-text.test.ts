import { describe, expect, it } from "vitest";
import {
  emptyRichTextDocument,
  isRichTextEmpty,
  plainTextFromRichText,
  richTextDocumentSchema,
  type RichTextDocument,
} from "./rich-text";

const validDocument = {
  type: "doc",
  content: [
    {
      type: "heading",
      attrs: { level: 2 },
      content: [{ type: "text", text: "Bezpieczna treść" }],
    },
    {
      type: "paragraph",
      content: [
        { type: "text", text: "Czytaj " },
        {
          type: "text",
          text: "więcej",
          marks: [{ type: "link", attrs: { href: "/oferta" } }],
        },
      ],
    },
  ],
} satisfies RichTextDocument;

describe("richTextDocumentSchema", () => {
  it("accepts a valid constrained document", () => {
    expect(richTextDocumentSchema.safeParse(validDocument).success).toBe(true);
  });

  it("rejects unknown nodes, unsupported marks, and malformed documents", () => {
    expect(
      richTextDocumentSchema.safeParse({
        type: "doc",
        content: [{ type: "image", attrs: { src: "x" } }],
      }).success,
    ).toBe(false);
    expect(
      richTextDocumentSchema.safeParse({
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [
              { type: "text", text: "x", marks: [{ type: "highlight" }] },
            ],
          },
        ],
      }).success,
    ).toBe(false);
    expect(richTextDocumentSchema.safeParse({}).success).toBe(false);
  });

  it("accepts safe relative and HTTPS links and rejects javascript links", () => {
    const withHref = (href: string) => ({
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            {
              type: "text",
              text: "link",
              marks: [{ type: "link", attrs: { href } }],
            },
          ],
        },
      ],
    });
    expect(
      richTextDocumentSchema.safeParse(withHref("/specjalisci")).success,
    ).toBe(true);
    expect(
      richTextDocumentSchema.safeParse(withHref("https://example.com")).success,
    ).toBe(true);
    expect(
      richTextDocumentSchema.safeParse(withHref("javascript:alert(1)")).success,
    ).toBe(false);
  });

  it("rejects heading levels outside H2 and H3", () => {
    expect(
      richTextDocumentSchema.safeParse({
        type: "doc",
        content: [{ type: "heading", attrs: { level: 1 } }],
      }).success,
    ).toBe(false);
  });
});

describe("rich text helpers", () => {
  it("uses one canonical empty document", () => {
    expect(isRichTextEmpty(emptyRichTextDocument)).toBe(true);
    expect(isRichTextEmpty(validDocument)).toBe(false);
  });

  it("extracts deterministic plain text from nested content", () => {
    expect(plainTextFromRichText(validDocument)).toBe(
      "Bezpieczna treść\nCzytaj więcej",
    );
  });
});

