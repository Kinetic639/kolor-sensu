import {
  articleHeadings,
  type ArticleDocument,
} from "@repo/contracts/article-rich-text";
import type {
  ArticleCategory,
  PublishedArticle,
} from "@repo/contracts/education";
import {
  ArticleRenderer,
  ArticleTableOfContents,
} from "@repo/ui/article-renderer";
import {
  ArticleCover,
  ArticleGrid,
  ArticleHeader,
  ArticlePeople,
  ArticleServices,
  ArticleShare,
  ArticleSources,
  ArticleTrust,
  JsonLd,
} from "@repo/ui/public-site";
import { bookingHref } from "@/features/booking/search-params";
import { educationPage, siteUrl } from "@/content/site";
import { articleImageUrl } from "@/lib/education-data";
import type { PublicService, SpecialistWithMedia } from "@/lib/public-data";
import { serviceHref } from "@/lib/site-frame";
import {
  articleAuthor,
  articleCard,
  articleDate,
  articleHref,
  articleReviewer,
  categoryHref,
  readingLabel,
  relatedArticles,
  type ArticlePerson,
} from "./article-view";

// An article's page, the site's and the preview's: the header, the cover,
// the table of contents (3 main headings or more) and the text, sharing,
// the sources, who reviewed it and the word about therapy, the services and
// specialists it recommends, and what to read next.

export function toPeople(
  specialists: readonly SpecialistWithMedia[],
): ArticlePerson[] {
  return specialists.map((one) => ({
    specialistId: one.specialistId,
    publicSlug: one.publicSlug,
    displayName: one.displayName,
    professionalTitle: one.professionalTitle,
    portraitUrl: one.portraitUrl ?? one.photoUrl,
  }));
}

export function ArticlePageView({
  article,
  categories,
  people,
  services,
  links,
  all,
  therapyNote,
}: {
  article: PublishedArticle;
  categories: readonly ArticleCategory[];
  people: readonly ArticlePerson[];
  /** The site's services (the article's are picked by id). */
  services: readonly PublicService[];
  links: { serviceIds: readonly string[]; specialistIds: readonly string[] };
  /** Every published article, for the related ones. */
  all: readonly PublishedArticle[];
  /** The word about therapy under every article (the CMS's). */
  therapyNote: string;
}) {
  const category = categories.find((one) => one.id === article.categoryId);
  const author = articleAuthor(article, people);
  const reviewer = articleReviewer(article, people);
  const body = article.body as ArticleDocument;
  const headings = articleHeadings(body);
  const updated =
    article.contentUpdatedAt.slice(0, 10) > article.publishedAt.slice(0, 10)
      ? {
          label: `Zaktualizowano ${articleDate(article.contentUpdatedAt)}`,
          dateTime: article.contentUpdatedAt,
        }
      : null;
  const url = `${siteUrl}${articleHref(article.slug)}`;
  const related = relatedArticles(article, all).map((one) => ({
    ...articleCard(one, categories, people),
    coverUrl: one.coverPath ? articleImageUrl(one.coverPath) : null,
  }));

  return (
    <article className="grid gap-12 pb-16 lg:gap-16">
      <div>
        <ArticleHeader
          author={author}
          category={
            category
              ? { name: category.name, href: categoryHref(category.slug) }
              : null
          }
          date={articleDate(article.publishedAt)}
          dateTime={article.publishedAt}
          lead={article.lead}
          reading={readingLabel(body)}
          title={article.title}
          updated={updated}
        />
        {article.coverPath ? (
          <ArticleCover
            alt={article.coverAlt}
            url={articleImageUrl(article.coverPath)}
          />
        ) : null}
      </div>

      <ArticleTableOfContents
        className="px-gutter mx-auto w-full max-w-[46rem]"
        headings={headings}
      />
      <ArticleRenderer
        bookingHref={(service) =>
          bookingHref(service ? { usluga: service } : {})
        }
        className="px-gutter"
        document={body}
        imageUrl={articleImageUrl}
      />

      <div className="px-gutter mx-auto w-full max-w-[46rem]">
        <ArticleShare title={article.title} url={url} />
      </div>
      <ArticleSources sources={article.sources} />
      <ArticleTrust
        crisisHref="/pomoc-w-kryzysie"
        reviewer={reviewer}
        therapyNote={therapyNote}
      />
      <ArticleServices
        services={services
          .filter((one) => links.serviceIds.includes(one.id))
          .map((one) => ({
            name: one.name,
            href: serviceHref(one.slug),
            bookHref: bookingHref({ usluga: one.slug }),
          }))}
      />
      <ArticlePeople
        people={people
          .filter((one) => links.specialistIds.includes(one.specialistId))
          .map((one) => ({
            name: one.displayName,
            href: `/specjalisci/${one.publicSlug}`,
            title: one.professionalTitle,
            photoUrl: one.portraitUrl,
          }))}
      />

      {related.length ? (
        <section
          aria-labelledby="przeczytaj-tez"
          className="max-w-page px-gutter mx-auto grid w-full gap-6"
        >
          <h2 className="font-display text-h2 text-ink" id="przeczytaj-tez">
            {educationPage.relatedHeading}
          </h2>
          <ArticleGrid articles={related} />
        </section>
      ) : null}

      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Article",
          headline: article.title,
          description: article.lead,
          url,
          datePublished: article.publishedAt,
          dateModified: article.contentUpdatedAt,
          ...(article.coverPath && {
            image: articleImageUrl(article.coverPath),
          }),
          author: author.href
            ? {
                "@type": "Person",
                name: author.name,
                url: `${siteUrl}${author.href}`,
              }
            : { "@type": "Organization", name: author.name },
          ...(reviewer && {
            reviewedBy: { "@type": "Person", name: reviewer.name },
          }),
          publisher: {
            "@type": "Organization",
            name: "Kolor Sensu",
            url: siteUrl,
          },
          inLanguage: "pl-PL",
        }}
      />
    </article>
  );
}
