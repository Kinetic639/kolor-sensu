import { z } from "zod";

export const RICH_TEXT_MAX_CHARACTERS = 100_000;
export const RICH_TEXT_MAX_DOCUMENT_BYTES = 500_000;
export const RICH_TEXT_MAX_NESTING_DEPTH = 12;
export const RICH_TEXT_MAX_LINK_LENGTH = 2_048;

export type RichTextSimpleMarkType =
  "bold" | "italic" | "underline" | "strike" | "code";

export interface RichTextSimpleMark {
  type: RichTextSimpleMarkType;
}

export interface RichTextLinkMark {
  type: "link";
  attrs: { href: string };
}

export type RichTextMark = RichTextSimpleMark | RichTextLinkMark;

export interface RichTextTextNode {
  type: "text";
  text: string;
  marks?: RichTextMark[];
}

export interface RichTextHardBreakNode {
  type: "hardBreak";
}

export type RichTextInlineNode = RichTextTextNode | RichTextHardBreakNode;

export interface RichTextParagraphNode {
  type: "paragraph";
  content?: RichTextInlineNode[];
}

export interface RichTextHeadingNode {
  type: "heading";
  attrs: { level: 2 | 3 };
  content?: RichTextInlineNode[];
}

export interface RichTextBulletListNode {
  type: "bulletList";
  content: RichTextListItemNode[];
}

export interface RichTextOrderedListNode {
  type: "orderedList";
  content: RichTextListItemNode[];
}

export interface RichTextListItemNode {
  type: "listItem";
  content: RichTextBlockNode[];
}

export interface RichTextBlockquoteNode {
  type: "blockquote";
  content: RichTextBlockNode[];
}

export interface RichTextHorizontalRuleNode {
  type: "horizontalRule";
}

export type RichTextBlockNode =
  | RichTextParagraphNode
  | RichTextHeadingNode
  | RichTextBulletListNode
  | RichTextOrderedListNode
  | RichTextBlockquoteNode
  | RichTextHorizontalRuleNode;

export interface RichTextDocument {
  type: "doc";
  content: RichTextBlockNode[];
}

export const emptyRichTextDocument: RichTextDocument = Object.freeze({
  type: "doc",
  content: [Object.freeze({ type: "paragraph" as const })],
});

const simpleMarkSchema = z
  .object({
    type: z.enum(["bold", "italic", "underline", "strike", "code"]),
  })
  .strict();

export function isSafeRichTextHref(href: string): boolean {
  if (
    href.length === 0 ||
    href.length > RICH_TEXT_MAX_LINK_LENGTH ||
    href !== href.trim() ||
    /[\u0000-\u001f\u007f]/.test(href)
  ) {
    return false;
  }

  if (href.startsWith("//") || href.startsWith("\\")) return false;
  if (
    href.startsWith("/") ||
    href.startsWith("./") ||
    href.startsWith("../") ||
    href.startsWith("#")
  ) {
    return true;
  }

  if (/^(mailto|tel):/i.test(href)) {
    return !/\s/.test(href) && href.slice(href.indexOf(":") + 1).length > 0;
  }

  try {
    const url = new URL(href);
    return (
      (url.protocol === "https:" || url.protocol === "http:") &&
      Boolean(url.hostname)
    );
  } catch {
    return false;
  }
}

const linkMarkSchema = z
  .object({
    type: z.literal("link"),
    attrs: z
      .object({
        href: z
          .string()
          .max(RICH_TEXT_MAX_LINK_LENGTH)
          .refine(isSafeRichTextHref, "Use a safe link URL."),
      })
      .strict(),
  })
  .strict();

const richTextMarkSchema: z.ZodType<RichTextMark> = z.union([
  simpleMarkSchema,
  linkMarkSchema,
]);

const textNodeSchema: z.ZodType<RichTextTextNode> = z
  .object({
    type: z.literal("text"),
    text: z.string().min(1).max(RICH_TEXT_MAX_CHARACTERS),
    marks: z.array(richTextMarkSchema).max(12).optional(),
  })
  .strict();

const hardBreakNodeSchema: z.ZodType<RichTextHardBreakNode> = z
  .object({ type: z.literal("hardBreak") })
  .strict();

export const richTextInlineNodeSchema: z.ZodType<RichTextInlineNode> = z.union([
  textNodeSchema,
  hardBreakNodeSchema,
]);

export const richTextBlockNodeSchema: z.ZodType<RichTextBlockNode> = z.lazy(
  () =>
    z.union([
      z
        .object({
          type: z.literal("paragraph"),
          content: z.array(richTextInlineNodeSchema).optional(),
        })
        .strict(),
      z
        .object({
          type: z.literal("heading"),
          attrs: z
            .object({ level: z.union([z.literal(2), z.literal(3)]) })
            .strict(),
          content: z.array(richTextInlineNodeSchema).optional(),
        })
        .strict(),
      z
        .object({
          type: z.literal("bulletList"),
          content: z.array(listItemNodeSchema).min(1),
        })
        .strict(),
      z
        .object({
          type: z.literal("orderedList"),
          content: z.array(listItemNodeSchema).min(1),
        })
        .strict(),
      z
        .object({
          type: z.literal("blockquote"),
          content: z.array(richTextBlockNodeSchema).min(1),
        })
        .strict(),
      z.object({ type: z.literal("horizontalRule") }).strict(),
    ]),
);

const listItemNodeSchema: z.ZodType<RichTextListItemNode> = z.lazy(() =>
  z
    .object({
      type: z.literal("listItem"),
      content: z.array(richTextBlockNodeSchema).min(1),
    })
    .strict(),
);

function documentDepth(value: unknown, depth = 0): number {
  if (!value || typeof value !== "object") return depth;
  const content = "content" in value ? value.content : undefined;
  if (!Array.isArray(content) || content.length === 0) return depth;
  return Math.max(...content.map((child) => documentDepth(child, depth + 1)));
}

function documentByteLength(value: unknown): number {
  return new TextEncoder().encode(JSON.stringify(value)).byteLength;
}

export const richTextDocumentSchema: z.ZodType<RichTextDocument> = z
  .object({
    type: z.literal("doc"),
    content: z.array(richTextBlockNodeSchema).min(1),
  })
  .strict()
  .superRefine((document, context) => {
    if (plainTextFromRichText(document).length > RICH_TEXT_MAX_CHARACTERS) {
      context.addIssue({
        code: "custom",
        message: `Rich text exceeds ${RICH_TEXT_MAX_CHARACTERS} characters.`,
      });
    }
    if (documentByteLength(document) > RICH_TEXT_MAX_DOCUMENT_BYTES) {
      context.addIssue({
        code: "custom",
        message: `Rich text exceeds ${RICH_TEXT_MAX_DOCUMENT_BYTES} bytes.`,
      });
    }
    if (documentDepth(document) > RICH_TEXT_MAX_NESTING_DEPTH) {
      context.addIssue({
        code: "custom",
        message: `Rich text exceeds nesting depth ${RICH_TEXT_MAX_NESTING_DEPTH}.`,
      });
    }
  });

export function parseRichText(value: unknown): RichTextDocument {
  return richTextDocumentSchema.parse(value);
}

export function serializeRichText(document: RichTextDocument): string {
  return JSON.stringify(richTextDocumentSchema.parse(document));
}

export function plainTextFromRichText(document: RichTextDocument): string {
  const read = (
    node:
      | RichTextDocument
      | RichTextBlockNode
      | RichTextListItemNode
      | RichTextInlineNode,
  ): string => {
    if (node.type === "text") return node.text;
    if (node.type === "hardBreak") return "\n";
    if (node.type === "horizontalRule") return "";
    return (node.content ?? [])
      .map(read)
      .join(shouldSeparate(node) ? "\n" : "");
  };
  return read(document)
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function isRichTextEmpty(document: RichTextDocument): boolean {
  return (
    plainTextFromRichText(document).length === 0 &&
    !containsHorizontalRule(document)
  );
}

export function richTextDocumentWithMaxCharacters(maxCharacters: number) {
  return richTextDocumentSchema.refine(
    (document) => plainTextFromRichText(document).length <= maxCharacters,
    `Rich text exceeds ${maxCharacters} characters.`,
  );
}

function shouldSeparate(
  node: RichTextDocument | RichTextBlockNode | RichTextListItemNode,
): boolean {
  return node.type !== "paragraph" && node.type !== "heading";
}

function containsHorizontalRule(
  node: RichTextDocument | RichTextBlockNode,
): boolean {
  if (node.type === "horizontalRule") return true;
  if (!("content" in node) || !node.content) return false;
  return node.content.some((child) =>
    child.type === "text" || child.type === "hardBreak"
      ? false
      : child.type === "listItem"
        ? child.content.some(containsHorizontalRule)
        : containsHorizontalRule(child),
  );
}
