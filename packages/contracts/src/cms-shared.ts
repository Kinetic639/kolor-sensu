import { z } from "zod";
import {
  descriptionPartSchema,
  headerEyebrowSchema,
  titleLineSchema,
  type SectionHeaderContent,
} from "@repo/contracts/section-header";

// Pieces shared by the CMS's content contracts (cms.ts, cms-pages.ts,
// cms-offer.ts).

/** A path within the public site ("/oferta", "/umow-wizyte#termin"). */
export const sitePathSchema = z
  .string()
  .trim()
  .max(200)
  .refine(
    (href) =>
      href.startsWith("/") && !href.startsWith("//") && !/\s/.test(href),
    "Podaj adres na stronie, zaczynający się od /",
  );

export const PAGE_HEADER_LIMITS = {
  /** Both lines of the title together. */
  title: 200,
  description: 600,
} as const;

const length = (parts: readonly { text: string }[]) =>
  parts.reduce((sum, part) => sum + part.text.length, 0);

/**
 * The top of a page: a section's header (@repo/contracts/section-header)
 * with the page's h1 for its title, in two lines (the second may be left
 * empty), and no call to action. The eyebrow and any words of the title
 * take the theme's colours; the description is the lead, with at most one
 * link in it.
 */
export const pageHeaderSchema = z.strictObject({
  eyebrow: headerEyebrowSchema.default({ text: "", tone: "default" }),
  title: z
    .array(titleLineSchema)
    .min(1, "Wpisz tytuł strony")
    .max(2)
    .refine(
      (lines) =>
        lines.reduce((sum, line) => sum + length(line), 0) <=
        PAGE_HEADER_LIMITS.title,
      `Tytuł może mieć najwyżej ${PAGE_HEADER_LIMITS.title} znaków`,
    ),
  description: z
    .array(descriptionPartSchema)
    .default([])
    .refine(
      (parts) => length(parts) <= PAGE_HEADER_LIMITS.description,
      `Opis może mieć najwyżej ${PAGE_HEADER_LIMITS.description} znaków`,
    )
    .refine(
      (parts) => parts.filter((part) => part.link).length <= 1,
      "Opis może mieć jeden link",
    ),
  cta: z.null().default(null),
});

export type PageHeaderContent = z.infer<typeof pageHeaderSchema> &
  SectionHeaderContent;

/**
 * A page's header from plain words, as the site's pages had them: the
 * eyebrow in pink, the title's first line in the ink colour and its
 * second in green, the lead plain.
 */
export function pageHeader({
  eyebrow = "",
  title,
  accent = "",
  lead = "",
}: {
  eyebrow?: string;
  title: string;
  accent?: string;
  lead?: string;
}): PageHeaderContent {
  return {
    eyebrow: { text: eyebrow, tone: eyebrow ? "pink" : "default" },
    title: [
      [{ text: title, tone: "default" }],
      ...(accent ? [[{ text: accent, tone: "green" as const }]] : []),
    ],
    description: lead ? [{ text: lead, link: null }] : [],
    cta: null,
  };
}
