import { emptyRichTextDocument, richTextDocumentSchema } from "@repo/contracts";

// Stored rich text is validated again on read; an unreadable document shows
// as empty instead of breaking the page.
export function readRichText(value: unknown) {
  const parsed = richTextDocumentSchema.safeParse(value);
  return parsed.success ? parsed.data : emptyRichTextDocument;
}
