import type {
  PublishedArticle,
  PublishedEbook,
} from "@repo/contracts/education";
import type { NewsletterItem } from "@repo/contracts/newsletter-issue";
import { articleHref } from "@/features/education/article-view";
import { ebookHref } from "@/features/education/ebook-view";

// An issue's cards as they show (in the e-mail and the archive): an
// article or an e-book from what is published now, with its cover and its
// page; an own card as written. One no longer published is left out.

export interface NewsletterCardView {
  eyebrow: string;
  title: string;
  text: string;
  /** Absolute in the e-mail, the site's own path on the site. */
  href: string | null;
  label: string;
  imageUrl: string | null;
  imageAlt: string;
}

export interface CardSources {
  articles: readonly PublishedArticle[];
  ebooks: readonly PublishedEbook[];
  imageUrl: (path: string) => string;
  /** Put before a site path ("" keeps the path; the e-mail gives the site). */
  origin: string;
}

const absolute = (href: string, origin: string) =>
  href.startsWith("/") ? `${origin}${href}` : href;

export function newsletterCards(
  items: readonly NewsletterItem[],
  sources: CardSources,
): NewsletterCardView[] {
  return items.flatMap((item): NewsletterCardView[] => {
    if (item.kind === "article") {
      const article = sources.articles.find((one) => one.id === item.id);
      if (!article) return [];
      return [
        {
          eyebrow: "Artykuł",
          title: article.title,
          text: article.lead,
          href: absolute(articleHref(article.slug), sources.origin),
          label: "Przeczytaj",
          imageUrl: article.coverPath
            ? sources.imageUrl(article.coverPath)
            : null,
          imageAlt: article.coverAlt,
        },
      ];
    }
    if (item.kind === "ebook") {
      const ebook = sources.ebooks.find((one) => one.id === item.id);
      if (!ebook) return [];
      return [
        {
          eyebrow: "E-book",
          title: ebook.title,
          text: ebook.shortDescription,
          href: absolute(ebookHref(ebook.slug), sources.origin),
          label: "Zobacz e-book",
          imageUrl: ebook.coverPath ? sources.imageUrl(ebook.coverPath) : null,
          imageAlt: ebook.coverAlt,
        },
      ];
    }
    return [
      {
        eyebrow: "Z centrum",
        title: item.title,
        text: item.text,
        href: item.href ? absolute(item.href, sources.origin) : null,
        label: item.label || "Dowiedz się więcej",
        imageUrl: null,
        imageAlt: "",
      },
    ];
  });
}
