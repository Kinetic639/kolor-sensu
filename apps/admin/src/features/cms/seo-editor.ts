import {
  resolvePageSeo,
  type PageSeoContent,
  type SeoPage,
  type SiteContentAdmin,
} from "@repo/contracts";
import type { ContentViewModel } from "./types";
import { mapContentViewModel } from "./view-model";

// Pure helpers for a page's search and sharing settings (seo-section.tsx):
// the draft as the form holds it, the counters and the two previews.

/** The settings as the form holds them: the picture's address to preview. */
export type PageSeoDraft = PageSeoContent & { ogImageUrl: string | null };

export function mapPageSeoViewModel(
  content: SiteContentAdmin<PageSeoContent>,
  imageUrl: (path: string) => string,
): ContentViewModel<PageSeoDraft> {
  const model = mapContentViewModel(content);
  const { ogImagePath } = content.draft;
  return {
    ...model,
    content: {
      ...content.draft,
      ogImageUrl: ogImagePath ? imageUrl(ogImagePath) : null,
    },
  };
}

/** The settings as saved: without the picture's address (a preview only). */
export function toPageSeoContent({
  ogImageUrl: _preview,
  ...content
}: PageSeoDraft): PageSeoContent {
  return content;
}

export interface CharacterCount {
  /** "48 / 60" */
  label: string;
  /** Over what Google shows: it cuts the rest. */
  tooLong: boolean;
}

/** How long a text is against what Google shows of it (spaces at the ends aside). */
export function characterCount(
  text: string,
  recommended: number,
): CharacterCount {
  const count = text.trim().length;
  return { label: `${count} / ${recommended}`, tooLong: count > recommended };
}

/** Cut to what a result shows, with an ellipsis, at a word when it can. */
export function shorten(text: string, max: number): string {
  if (text.length <= max) return text;
  const cut = text.slice(0, max - 1);
  const space = cut.lastIndexOf(" ");
  return `${(space > max * 0.6 ? cut.slice(0, space) : cut).trimEnd()}…`;
}

export interface SeoPreview {
  /** As Google writes it above the title: "kolorsensu.pl › o-nas". */
  breadcrumb: string;
  /** The site's domain, as a shared link shows it. */
  domain: string;
  title: string;
  description: string;
  ogTitle: string;
  ogDescription: string;
}

/**
 * What a search result and a shared link would show for the draft, the
 * page's own words where it leaves a field empty (as the site does).
 */
export function seoPreview(
  page: SeoPage,
  draft: PageSeoContent,
  webUrl: string,
): SeoPreview {
  const seo = resolvePageSeo(page, draft);
  const domain = new URL(webUrl).host.replace(/^www\./, "");
  const segments = seo.path.split("/").filter(Boolean);
  return {
    breadcrumb: [domain, ...segments].join(" › "),
    domain,
    title: shorten(seo.title, 65),
    description: shorten(seo.description, 165),
    ogTitle: shorten(seo.ogTitle, 90),
    ogDescription: shorten(seo.ogDescription, 120),
  };
}
