import type { PublishedEbook } from "@repo/contracts/education";
import type { Route } from "next";

// Edukacja's e-books as the site's pages show them: the addresses, a card,
// what Google shows, and the film as a player that sets no tracking
// cookies (YouTube's no-cookie domain, Vimeo with "do not track"). Pure:
// the pages and their tests share it.

export const EBOOKS_PATH = "/edukacja/ebooki";

export const ebookHref = (slug: string) => `${EBOOKS_PATH}/${slug}` as Route;

export interface EbookCardView {
  id: string;
  href: Route;
  title: string;
  description: string;
  coverPath: string;
  format: string;
}

export function ebookCard(ebook: PublishedEbook): EbookCardView {
  return {
    id: ebook.id,
    href: ebookHref(ebook.slug),
    title: ebook.title,
    description: ebook.shortDescription,
    coverPath: ebook.coverPath,
    format: ebook.format,
  };
}

/** An e-book's title and description for Google (the SEO fields first). */
export function ebookSeo(
  ebook: Pick<
    PublishedEbook,
    "title" | "shortDescription" | "seoTitle" | "seoDescription"
  >,
): { title: string; description: string } {
  return {
    title: ebook.seoTitle.trim() || ebook.title,
    description: ebook.seoDescription.trim() || ebook.shortDescription,
  };
}

export interface VideoEmbed {
  provider: "YouTube" | "Vimeo";
  /** The player, autoplaying (it loads on the visitor's click). */
  embedUrl: string;
}

const YOUTUBE =
  /^https:\/\/(?:www\.)?(?:youtube\.com\/watch\?(?:.*&)?v=|youtu\.be\/)([A-Za-z0-9_-]{6,20})/;
const VIMEO = /^https:\/\/(?:www\.)?vimeo\.com\/(\d{4,12})(?:\/|$|\?)/;

/** The film's player, from the link the admin pasted (else none). */
export function videoEmbed(url: string): VideoEmbed | null {
  const youtube = YOUTUBE.exec(url.trim());
  if (youtube)
    return {
      provider: "YouTube",
      embedUrl: `https://www.youtube-nocookie.com/embed/${youtube[1]}?autoplay=1&rel=0`,
    };
  const vimeo = VIMEO.exec(url.trim());
  if (vimeo)
    return {
      provider: "Vimeo",
      embedUrl: `https://player.vimeo.com/video/${vimeo[1]}?autoplay=1&dnt=1`,
    };
  return null;
}
