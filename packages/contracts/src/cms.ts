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

export interface SiteContentAdmin<Content> {
  draft: Content;
  published: Content | null;
  publishedAt: string | null;
  updatedAt: string;
}
