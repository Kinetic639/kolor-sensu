import { z } from "zod";
import { pageHeaderSchema } from "@repo/contracts/cms-shared";
import { richTextDocumentSchema } from "@repo/contracts/rich-text";

// The CMS's legal documents (docs/architecture/cms-domain.md): Regulamin,
// Polityka prywatności and Pliki cookies, one site_content key each. Each
// is the page's header, the document itself as rich text (headings,
// paragraphs, lists, links: the editor the portals already use) and the
// date it applies from. The site's sample documents (cms-legal-content.ts)
// stand in until the centre publishes its own.

export const LEGAL_PAGES = [
  { key: "legal_terms", path: "/regulamin", label: "Regulamin" },
  {
    key: "legal_privacy",
    path: "/polityka-prywatnosci",
    label: "Polityka prywatności",
  },
  { key: "legal_cookies", path: "/cookies", label: "Pliki cookies" },
] as const;

export type LegalPageKey = (typeof LEGAL_PAGES)[number]["key"];

export const legalPageContentSchema = z.strictObject({
  intro: pageHeaderSchema,
  /** The document: headings (h2, h3), paragraphs, lists, links. */
  body: richTextDocumentSchema,
  /** "1 listopada 2026": shown as "Obowiązuje od …"; empty: not shown. */
  effectiveFrom: z.string().trim().max(60),
});

export type LegalPageContent = z.infer<typeof legalPageContentSchema>;
