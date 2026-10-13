import { z } from "zod";

/**
 * The public website's routes/layout/structure are code-owned in Next.js.
 * The CMS only edits predefined content fields inside fixed pages — it can
 * never create pages, sections, or routes. `homePageContentSchema` is the
 * one typed content contract for the one page that currently has editable
 * CMS content (Home). Unknown fields are rejected, not silently stripped.
 */
export const homePageContentSchema = z.strictObject({
  heading: z.string().trim().min(1).max(200),
  body: z.string().trim().min(1).max(2000),
  buttonLabel: z.string().trim().max(100).nullable().default(null),
});

export type HomePageContent = z.infer<typeof homePageContentSchema>;

export type HomeContentAdmin = SiteContentAdmin<HomePageContent>;

/**
 * /gabinety: the page's structure (title, rooms per location) is code-owned;
 * the CMS only switches its optional sections on and off.
 */
export const roomsPageContentSchema = z.strictObject({
  /** "Co u nas znajdziesz" under the title. */
  showAmenitiesSection: z.boolean(),
  /** Each location's address, description and amenities above its rooms. */
  showLocationDetails: z.boolean(),
});

export type RoomsPageContent = z.infer<typeof roomsPageContentSchema>;

export const defaultRoomsPageContent: RoomsPageContent = {
  showAmenitiesSection: true,
  showLocationDetails: true,
};

/**
 * Home → the areas of help ("Obszary wsparcia"): small circles around a large
 * one, each area shown in the large one when chosen. The section is
 * code-owned; the CMS edits the list of areas only.
 */
export const SUPPORT_AREAS_MAX = 10;

/** A path within the public site ("/oferta", "/umow-wizyte#termin"). */
const sitePathSchema = z
  .string()
  .trim()
  .max(200)
  .refine(
    (href) =>
      href.startsWith("/") && !href.startsWith("//") && !/\s/.test(href),
    "Podaj adres na stronie, zaczynający się od /",
  );

export const supportAreaSchema = z.strictObject({
  /** Stable while the area is edited or moved (also the key on the site). */
  id: z.string().trim().min(1).max(64),
  title: z.string().trim().min(1).max(60),
  /** A sentence or two, shown in the large circle. */
  lead: z.string().trim().min(1).max(240),
  /** The photo, a file in the public site-media bucket (none: paint only). */
  imagePath: z.string().trim().min(1).max(300).nullable().default(null),
  imageAlt: z.string().trim().max(200).default(""),
  /** Where the large circle leads (none: to booking). */
  link: z
    .strictObject({
      href: sitePathSchema,
      label: z.string().trim().min(1).max(40),
    })
    .nullable()
    .default(null),
});

export type SupportArea = z.infer<typeof supportAreaSchema>;

export const supportAreasContentSchema = z.strictObject({
  areas: z
    .array(supportAreaSchema)
    .min(1)
    .max(SUPPORT_AREAS_MAX)
    .refine(
      (areas) => new Set(areas.map((area) => area.id)).size === areas.length,
      "Każdy obszar musi mieć inny identyfikator",
    ),
});

export type SupportAreasContent = z.infer<typeof supportAreasContentSchema>;

export interface SiteContentAdmin<Content> {
  draft: Content;
  published: Content | null;
  publishedAt: string | null;
  updatedAt: string;
}
