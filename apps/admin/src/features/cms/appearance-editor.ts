import type { SiteAppearanceContent, SiteContentAdmin } from "@repo/contracts";
import type { ContentViewModel } from "./types";
import { mapContentViewModel } from "./view-model";

// Pure helpers for the site's shared settings (appearance-section.tsx):
// the draft as the form holds it, with each image's address to preview.

/** The settings as the form holds them: each image's address to preview. */
export type SiteAppearanceDraft = SiteAppearanceContent & {
  watercolorBackdropUrl: string | null;
  watercolorParallaxUrl: string | null;
};

export function mapSiteAppearanceViewModel(
  content: SiteContentAdmin<SiteAppearanceContent>,
  imageUrl: (path: string) => string,
): ContentViewModel<SiteAppearanceDraft> {
  const { watercolorBackdropPath, watercolorParallaxPath } = content.draft;
  return {
    ...mapContentViewModel(content),
    content: {
      ...content.draft,
      watercolorBackdropUrl: watercolorBackdropPath
        ? imageUrl(watercolorBackdropPath)
        : null,
      watercolorParallaxUrl: watercolorParallaxPath
        ? imageUrl(watercolorParallaxPath)
        : null,
    },
  };
}

/** The settings as saved: without the images' addresses (a preview only). */
export function toSiteAppearanceContent({
  watercolorBackdropUrl: _backdrop,
  watercolorParallaxUrl: _parallax,
  ...content
}: SiteAppearanceDraft): SiteAppearanceContent {
  return content;
}
