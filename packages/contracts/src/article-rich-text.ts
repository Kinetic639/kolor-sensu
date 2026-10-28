import { z } from "zod";
import {
  RICH_TEXT_MAX_CHARACTERS,
  RICH_TEXT_MAX_NESTING_DEPTH,
  richTextBlockNodeSchema,
  richTextInlineNodeSchema,
  type RichTextBlockNode,
  type RichTextParagraphNode,
} from "@repo/contracts/rich-text";

// The article profile of the rich text (docs/architecture/rich-text-
// platform.md): the base blocks plus what an article needs, for articles
// and e-books only (bios, rooms and legal documents keep the base set).
// The author chooses a block; the page's template decides its look: no
// colours, sizes or classes are stored, only fixed choices.
//
//   articleImage      a photo, graphic or chart: the file, its text for
//                     people who cannot see it (required), an optional
//                     caption, and one of three widths
//   articleImagePair  two photos side by side (one under the other on a
//                     phone), each with its text, and one caption
//   callout           a box: Ważne, Wskazówka or Uwaga, around paragraphs
//                     and lists
//   pullQuote         a quotation set apart, with who said it
//   table             rows of header and body cells (Tiptap's table JSON)
//   bookingButton     "Umów wizytę" in the text, optionally for a service
//
// Images are stored by their path in the public site-media bucket
// (articles/… or ebooks/…), with their size, so the page reserves their
// space before they load.

export const ARTICLE_IMAGE_WIDTHS = ["text", "wide", "full"] as const;
export type ArticleImageWidth = (typeof ARTICLE_IMAGE_WIDTHS)[number];

export const CALLOUT_KINDS = ["important", "tip", "warning"] as const;
export type CalloutKind = (typeof CALLOUT_KINDS)[number];

/** Each callout's label, as the page and the editor show it. */
export const CALLOUT_LABELS: Record<CalloutKind, string> = {
  important: "Ważne",
  tip: "Wskazówka",
  warning: "Uwaga",
};

export const ARTICLE_LIMITS = {
  alt: 300,
  caption: 300,
  quoteAuthor: 120,
  buttonLabel: 40,
  tableRows: 60,
  tableColumns: 8,
} as const;

// The editor's photos: an article's, an e-book's or a workshop's description
// (#280), each in its folder of site-media.
const ARTICLE_IMAGE_PATH =
  /^(articles|ebooks|workshops)\/[0-9a-f-]{36}\.(jpg|png|webp)$/;

const imageFileSchema = z
  .object({
    src: z.string().regex(ARTICLE_IMAGE_PATH, "Nieznany plik zdjęcia."),
    alt: z
      .string()
      .trim()
      .min(1, "Opisz zdjęcie dla osób niewidomych.")
      .max(ARTICLE_LIMITS.alt),
    width: z.number().int().min(1).max(10_000),
    height: z.number().int().min(1).max(10_000),
  })
  .strict();

export type ArticleImageFile = z.infer<typeof imageFileSchema>;

const captionSchema = z.string().trim().max(ARTICLE_LIMITS.caption).nullable();

export interface ArticleImageNode {
  type: "articleImage";
  attrs: ArticleImageFile & {
    caption: string | null;
    size: ArticleImageWidth;
  };
}

export interface ArticleImagePairNode {
  type: "articleImagePair";
  attrs: {
    images: [ArticleImageFile, ArticleImageFile];
    caption: string | null;
  };
}

export interface CalloutNode {
  type: "callout";
  attrs: { kind: CalloutKind };
  content: RichTextBlockNode[];
}

export interface PullQuoteNode {
  type: "pullQuote";
  attrs: { author: string | null };
  content: RichTextParagraphNode[];
}

export interface TableCellNode {
  type: "tableCell" | "tableHeader";
  attrs?: { colspan?: number; rowspan?: number; colwidth?: number[] | null };
  content: RichTextParagraphNode[];
}

export interface TableRowNode {
  type: "tableRow";
  content: TableCellNode[];
}

export interface TableNode {
  type: "table";
  content: TableRowNode[];
}

export interface BookingButtonNode {
  type: "bookingButton";
  attrs: { label: string; service: string | null };
}

export type ArticleBlockNode =
  | RichTextBlockNode
  | ArticleImageNode
  | ArticleImagePairNode
  | CalloutNode
  | PullQuoteNode
  | TableNode
  | BookingButtonNode;

export interface ArticleDocument {
  type: "doc";
  content: ArticleBlockNode[];
}

export const emptyArticleDocument: ArticleDocument = Object.freeze({
  type: "doc",
  content: [Object.freeze({ type: "paragraph" as const })],
});

const paragraphSchema: z.ZodType<RichTextParagraphNode> = z
  .object({
    type: z.literal("paragraph"),
    content: z.array(richTextInlineNodeSchema).optional(),
  })
  .strict();

const cellSpan = z.number().int().min(1).max(ARTICLE_LIMITS.tableColumns);

const tableCellSchema: z.ZodType<TableCellNode> = z
  .object({
    type: z.enum(["tableCell", "tableHeader"]),
    attrs: z
      .object({
        colspan: cellSpan.optional(),
        rowspan: z
          .number()
          .int()
          .min(1)
          .max(ARTICLE_LIMITS.tableRows)
          .optional(),
        colwidth: z
          .array(z.number().int().min(1).max(2000))
          .nullable()
          .optional(),
      })
      .strict()
      .optional(),
    content: z.array(paragraphSchema).min(1),
  })
  .strict();

const tableSchema: z.ZodType<TableNode> = z
  .object({
    type: z.literal("table"),
    content: z
      .array(
        z
          .object({
            type: z.literal("tableRow"),
            content: z
              .array(tableCellSchema)
              .min(1)
              .max(ARTICLE_LIMITS.tableColumns),
          })
          .strict(),
      )
      .min(1)
      .max(ARTICLE_LIMITS.tableRows),
  })
  .strict();

const SERVICE_SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const articleBlockSchema: z.ZodType<ArticleBlockNode> = z.union([
  richTextBlockNodeSchema,
  z
    .object({
      type: z.literal("articleImage"),
      attrs: imageFileSchema
        .extend({
          caption: captionSchema,
          size: z.enum(ARTICLE_IMAGE_WIDTHS),
        })
        .strict(),
    })
    .strict(),
  z
    .object({
      type: z.literal("articleImagePair"),
      attrs: z
        .object({
          images: z.tuple([imageFileSchema, imageFileSchema]),
          caption: captionSchema,
        })
        .strict(),
    })
    .strict(),
  z
    .object({
      type: z.literal("callout"),
      attrs: z.object({ kind: z.enum(CALLOUT_KINDS) }).strict(),
      content: z.array(richTextBlockNodeSchema).min(1),
    })
    .strict(),
  z
    .object({
      type: z.literal("pullQuote"),
      attrs: z
        .object({
          author: z.string().trim().max(ARTICLE_LIMITS.quoteAuthor).nullable(),
        })
        .strict(),
      content: z.array(paragraphSchema).min(1),
    })
    .strict(),
  tableSchema,
  z
    .object({
      type: z.literal("bookingButton"),
      attrs: z
        .object({
          label: z.string().trim().min(1).max(ARTICLE_LIMITS.buttonLabel),
          service: z.string().regex(SERVICE_SLUG).nullable(),
        })
        .strict(),
    })
    .strict(),
]);

export const articleDocumentSchema: z.ZodType<ArticleDocument> = z
  .object({
    type: z.literal("doc"),
    content: z.array(articleBlockSchema).min(1),
  })
  .strict()
  .superRefine((document, context) => {
    if (articlePlainText(document).length > RICH_TEXT_MAX_CHARACTERS) {
      context.addIssue({
        code: "custom",
        message: `Tekst może mieć najwyżej ${RICH_TEXT_MAX_CHARACTERS} znaków.`,
      });
    }
    if (depth(document) > RICH_TEXT_MAX_NESTING_DEPTH) {
      context.addIssue({
        code: "custom",
        message: "Zbyt głęboko zagnieżdżony tekst.",
      });
    }
  });

function depth(value: unknown, level = 0): number {
  if (!value || typeof value !== "object") return level;
  const content = "content" in value ? value.content : undefined;
  if (!Array.isArray(content) || content.length === 0) return level;
  return Math.max(...content.map((child) => depth(child, level + 1)));
}

type AnyNode = { type: string; text?: string; content?: AnyNode[] };

/** The text of a node and what it holds, blocks on their own lines. */
function textOf(node: AnyNode): string {
  if (node.type === "text") return node.text ?? "";
  if (node.type === "hardBreak") return "\n";
  const inline = node.type === "paragraph" || node.type === "heading";
  return (node.content ?? []).map(textOf).join(inline ? "" : "\n");
}

/** The article's words (headings, paragraphs, lists, boxes, quotes, tables). */
export function articlePlainText(document: ArticleDocument): string {
  return textOf(document as unknown as AnyNode)
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** Whether the article has no words and no blocks yet. */
export function isArticleEmpty(document: ArticleDocument): boolean {
  return (
    articlePlainText(document).length === 0 &&
    document.content.every((node) => node.type === "paragraph")
  );
}

/** Minutes to read, at about 200 words a minute; at least one. */
export function articleReadingMinutes(document: ArticleDocument): number {
  const words = articlePlainText(document).split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}

/** A heading's address in the page, from its words (Polish letters folded). */
export function headingSlug(text: string): string {
  return (
    text
      .toLowerCase()
      .replace(/ł/g, "l")
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80) || "sekcja"
  );
}

export interface ArticleHeading {
  level: 2 | 3;
  text: string;
  /** Unique within the article: the renderer gives the heading this id. */
  id: string;
}

/** The article's headings, top level only, with unique ids, in order. */
export function articleHeadings(document: ArticleDocument): ArticleHeading[] {
  const used = new Map<string, number>();
  return document.content.flatMap((node) => {
    if (node.type !== "heading") return [];
    const text = textOf(node as unknown as AnyNode).trim();
    if (!text) return [];
    const base = headingSlug(text);
    const seen = used.get(base) ?? 0;
    used.set(base, seen + 1);
    return [
      {
        level: node.attrs.level,
        text,
        id: seen === 0 ? base : `${base}-${seen + 1}`,
      },
    ];
  });
}

/** A table of contents is shown from this many top-level h2 headings. */
export const TABLE_OF_CONTENTS_MIN = 3;

/** Every image the article shows (for the editor's checks and clean-up). */
export function articleImages(document: ArticleDocument): ArticleImageFile[] {
  return document.content.flatMap((node) => {
    if (node.type === "articleImage") {
      const { src, alt, width, height } = node.attrs;
      return [{ src, alt, width, height }];
    }
    if (node.type === "articleImagePair") return [...node.attrs.images];
    return [];
  });
}
