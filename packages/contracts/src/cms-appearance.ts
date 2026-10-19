import { z } from "zod";

/**
 * The site's shared settings (one site_content row, `site_appearance`;
 * docs/architecture/cms-domain.md): how components used on many pages look.
 * For now the painted photo (WatercolorImage): its watercolor backdrop and
 * an optional parallax layer over it, each a transparent image in the
 * public site-media bucket. No backdrop is the site's own; no parallax
 * layer, none.
 */

export const SITE_APPEARANCE_KEY = "site_appearance";

const imagePath = z.string().trim().min(1).max(300).nullable().default(null);

export const siteAppearanceContentSchema = z.strictObject({
  /** The painted photo's backdrop (none: the site's own). */
  watercolorBackdropPath: imagePath,
  /** A layer over the backdrop that moves on scroll (none: no layer). */
  watercolorParallaxPath: imagePath,
});

export type SiteAppearanceContent = z.infer<typeof siteAppearanceContentSchema>;

/** Until anything is published: the site's own look. */
export const defaultSiteAppearance: SiteAppearanceContent = {
  watercolorBackdropPath: null,
  watercolorParallaxPath: null,
};
