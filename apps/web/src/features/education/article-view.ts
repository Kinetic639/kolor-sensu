import {
  articleReadingMinutes,
  type ArticleDocument,
} from "@repo/contracts/article-rich-text";
import {
  TEAM_AUTHOR_NAME,
  type ArticleCategory,
  type PublishedArticle,
} from "@repo/contracts/education";
import type { PageHeaderContent } from "@repo/contracts";
import type { Route } from "next";

// Edukacja's articles as the site's pages show them: the addresses, a card
// on the lists (title, lead, cover, category, author, date, reading time),
// the byline of an article's page, and the related articles. Pure: the
// pages and their tests share it.

export const EDUCATION_PATH = "/edukacja";
export const ARTICLES_PATH = "/edukacja/artykuly";

export const articleHref = (slug: string) =>
  `${ARTICLES_PATH}/${slug}` as Route;

export const categoryHref = (slug: string) =>
  `${ARTICLES_PATH}/kategoria/${slug}` as Route;

/**
 * A recommended service's button: booking, when the service is booked
 * online (a specialist offers it, its booking is on), else a question
 * through Kontakt, as its page in Oferta does.
 */
export function articleServiceAction(
  slug: string,
  bookable: ReadonlySet<string>,
  bookHref: string,
) {
  return bookable.has(slug)
    ? { href: bookHref, label: "Umów wizytę" }
    : { href: "/kontakt", label: "Zapytaj o termin" };
}

const DATE = new Intl.DateTimeFormat("pl-PL", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "Europe/Warsaw",
});

/** `21 października 2026` */
export const articleDate = (iso: string) => DATE.format(new Date(iso));

/** `5 min czytania` */
export const readingLabel = (body: ArticleDocument) =>
  `${articleReadingMinutes(body)} min czytania`;

/** A specialist as an article names them. */
export interface ArticlePerson {
  specialistId: string;
  publicSlug: string;
  displayName: string;
  professionalTitle: string | null;
  portraitUrl: string | null;
}

export interface ArticleByline {
  name: string;
  /** Their profile; the team has none. */
  href: Route | null;
  title: string | null;
  photoUrl: string | null;
}

/** Who signs an article: a published specialist, else the team. */
export function articleAuthor(
  article: Pick<PublishedArticle, "authorKind" | "authorSpecialistId">,
  people: readonly ArticlePerson[],
): ArticleByline {
  const person =
    article.authorKind === "specialist"
      ? people.find((one) => one.specialistId === article.authorSpecialistId)
      : undefined;
  return person ? byline(person) : team;
}

/** Who reviewed it, if anyone (published specialists only). */
export function articleReviewer(
  article: Pick<PublishedArticle, "reviewerSpecialistId">,
  people: readonly ArticlePerson[],
): ArticleByline | null {
  const person = people.find(
    (one) => one.specialistId === article.reviewerSpecialistId,
  );
  return person ? byline(person) : null;
}

const team: ArticleByline = {
  name: TEAM_AUTHOR_NAME,
  href: null,
  title: null,
  photoUrl: null,
};

function byline(person: ArticlePerson): ArticleByline {
  return {
    name: person.displayName,
    href: `/specjalisci/${person.publicSlug}` as Route,
    title: person.professionalTitle,
    photoUrl: person.portraitUrl,
  };
}

export interface ArticleCardView {
  id: string;
  href: Route;
  title: string;
  lead: string;
  coverPath: string;
  coverAlt: string;
  category: { name: string; href: Route } | null;
  author: string;
  authorAvatarUrl: string | null;
  date: string;
  dateTime: string;
  reading: string;
}

export function articleCard(
  article: PublishedArticle,
  categories: readonly ArticleCategory[],
  people: readonly ArticlePerson[],
): ArticleCardView {
  const category = categories.find((one) => one.id === article.categoryId);
  return {
    id: article.id,
    href: articleHref(article.slug),
    title: article.title,
    lead: article.lead,
    coverPath: article.coverPath,
    coverAlt: article.coverAlt,
    category: category
      ? { name: category.name, href: categoryHref(category.slug) }
      : null,
    author: articleAuthor(article, people).name,
    authorAvatarUrl: articleAuthor(article, people).photoUrl,
    date: articleDate(article.publishedAt),
    dateTime: article.publishedAt,
    reading: readingLabel(article.body),
  };
}

/**
 * What to read next: the same category's newest first, then the newest
 * of the rest; never the article itself.
 */
export function relatedArticles(
  article: Pick<PublishedArticle, "id" | "categoryId">,
  all: readonly PublishedArticle[],
  limit = 3,
): PublishedArticle[] {
  const others = all.filter((one) => one.id !== article.id);
  const same = others.filter((one) => one.categoryId === article.categoryId);
  const rest = others.filter((one) => one.categoryId !== article.categoryId);
  return [...same, ...rest].slice(0, limit);
}

/** The categories that have articles, in the admin's order. */
export function usedCategories(
  categories: readonly ArticleCategory[],
  articles: readonly Pick<PublishedArticle, "categoryId">[],
): ArticleCategory[] {
  return categories.filter((category) =>
    articles.some((article) => article.categoryId === category.id),
  );
}

/** An article's title and description for Google (the SEO fields first). */
export function articleSeo(
  article: Pick<
    PublishedArticle,
    "title" | "lead" | "seoTitle" | "seoDescription"
  >,
): { title: string; description: string } {
  return {
    title: article.seoTitle.trim() || article.title,
    description: article.seoDescription.trim() || article.lead,
  };
}

/** A CMS header's lead as plain words (a page's description). */
export function headerLead(header: PageHeaderContent): string {
  return header.description
    .map((part) => part.text)
    .join("")
    .trim();
}
