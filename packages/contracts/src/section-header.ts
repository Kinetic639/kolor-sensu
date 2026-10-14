import { z } from "zod";

/**
 * A section's header on the public site, as the CMS edits it: the eyebrow
 * over the title, the title (one or two lines, any words in another
 * colour), the description under it (with, anywhere in it, at most one
 * link to another page of the site) and, optionally, a call to action
 * under the description.
 *
 * Only words and colours: the markup (which heading level, which size,
 * where the header stands) is the section's own, in code. Colours and
 * pages are fixed lists, so nothing the CMS stores can break the design,
 * the contrast or a link.
 */

/** The colours a header's words can take: the theme's own. */
export const HEADER_TONES = ["default", "green", "pink"] as const;
export const headerToneSchema = z.enum(HEADER_TONES);
export type HeaderTone = z.infer<typeof headerToneSchema>;

/** The pages a header can link to, with their names for the CMS. */
export const SITE_PAGES = [
  { href: "/oferta", label: "Oferta" },
  { href: "/specjalisci", label: "Specjaliści" },
  { href: "/gabinety", label: "Gabinety" },
  { href: "/warsztaty", label: "Warsztaty" },
  { href: "/edukacja", label: "Edukacja" },
  { href: "/cennik", label: "Cennik" },
  { href: "/o-nas", label: "O nas" },
  { href: "/kontakt", label: "Kontakt" },
  { href: "/umow-wizyte", label: "Umów wizytę" },
] as const;

export type SitePage = (typeof SITE_PAGES)[number]["href"];

export const sitePageSchema = z.enum(
  SITE_PAGES.map((page) => page.href) as [SitePage, ...SitePage[]],
);

export const HEADER_LIMITS = {
  eyebrow: 60,
  /** Both lines of the title together. */
  title: 100,
  description: 300,
  linkLabel: 60,
  ctaLabel: 40,
} as const;

const length = (parts: readonly { text: string }[]) =>
  parts.reduce((sum, part) => sum + part.text.length, 0);

export const headerEyebrowSchema = z.strictObject({
  text: z.string().trim().max(HEADER_LIMITS.eyebrow).default(""),
  tone: headerToneSchema.default("default"),
});

/** A run of a title line's words in one colour (spaces included). */
export const titleSegmentSchema = z.strictObject({
  text: z.string().min(1).max(HEADER_LIMITS.title),
  tone: headerToneSchema,
});

export const titleLineSchema = z
  .array(titleSegmentSchema)
  .min(1)
  .refine(
    (line) =>
      line
        .map((segment) => segment.text)
        .join("")
        .trim() !== "",
    "Wiersz tytułu nie może być pusty",
  );

/** A run of the description: plain text, or the one link. */
export const descriptionPartSchema = z.strictObject({
  text: z.string().min(1).max(HEADER_LIMITS.description),
  link: z
    .strictObject({ href: sitePageSchema, tone: headerToneSchema })
    .nullable()
    .default(null),
});

export const CTA_STYLES = ["button", "outline", "arrow"] as const;

export const headerCtaSchema = z.strictObject({
  label: z.string().trim().min(1).max(HEADER_LIMITS.ctaLabel),
  href: sitePageSchema,
  style: z.enum(CTA_STYLES),
});

export const sectionHeaderSchema = z.strictObject({
  eyebrow: headerEyebrowSchema.default({ text: "", tone: "default" }),
  title: z
    .array(titleLineSchema)
    .min(1)
    .max(2)
    .refine(
      (lines) =>
        lines.reduce((sum, line) => sum + length(line), 0) <=
        HEADER_LIMITS.title,
      `Tytuł może mieć najwyżej ${HEADER_LIMITS.title} znaków`,
    ),
  description: z
    .array(descriptionPartSchema)
    .default([])
    .refine(
      (parts) => length(parts) <= HEADER_LIMITS.description,
      `Opis może mieć najwyżej ${HEADER_LIMITS.description} znaków`,
    )
    .refine(
      (parts) => parts.filter((part) => part.link).length <= 1,
      "Opis może mieć jeden link",
    )
    .refine(
      (parts) =>
        parts.every(
          (part) =>
            !part.link || part.text.trim().length <= HEADER_LIMITS.linkLabel,
        ),
      `Tekst linku może mieć najwyżej ${HEADER_LIMITS.linkLabel} znaków`,
    )
    .refine(
      (parts) => parts.every((part) => !part.link || part.text.trim() !== ""),
      "Link musi mieć tekst",
    ),
  cta: headerCtaSchema.nullable().default(null),
});

export type HeaderEyebrow = z.infer<typeof headerEyebrowSchema>;
export type TitleSegment = z.infer<typeof titleSegmentSchema>;
export type DescriptionPart = z.infer<typeof descriptionPartSchema>;
export type HeaderCta = z.infer<typeof headerCtaSchema>;
export type CtaStyle = HeaderCta["style"];
export type SectionHeaderContent = z.infer<typeof sectionHeaderSchema>;

/** The title as plain words (both lines), e.g. for a page's outline. */
export function headerTitleText(header: SectionHeaderContent): string {
  return header.title
    .map((line) => line.map((segment) => segment.text).join(""))
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * A header from plain words, every one in the default colour: the site's
 * own headers until the CMS publishes others.
 */
export function plainHeader({
  eyebrow = "",
  title,
  description = "",
  cta = null,
}: {
  eyebrow?: string;
  /** One line, or two. */
  title: string | readonly [string, string];
  description?: string;
  cta?: HeaderCta | null;
}): SectionHeaderContent {
  const lines = typeof title === "string" ? [title] : [...title];
  return {
    eyebrow: { text: eyebrow, tone: "default" },
    title: lines.map((text) => [{ text, tone: "default" as const }]),
    description: description ? [{ text: description, link: null }] : [],
    cta,
  };
}
