import Image from "next/image";
import { cn } from "../lib/utils";
import { PageLink } from "./page-link";
import { Clock3 } from "lucide-react";
import { InkReveal } from "./ink-reveal";
import { CrisisCardFrame } from "./crisis-card-frame";
import { HanddrawnLink } from "./handdrawn-link";
import { HoverPaint } from "./hover-paint";
import { educationStyles as styles } from "./education-styles";

// Edukacja's article cards (the lists, a category, related articles, an
// author's or a service's articles): the cover, the category, the title as
// the card's one link (the whole card is clickable through it), the lead,
// and who wrote it, when, for how long. Server-safe.

export interface ArticleCardData {
  id: string;
  href: string;
  title: string;
  lead: string;
  coverUrl: string | null;
  coverAlt: string;
  category: { name: string; href: string } | null;
  author: string;
  authorAvatarUrl?: string | null;
  /** `21 października 2026` */
  date: string;
  /** The ISO date, for <time>. */
  dateTime: string;
  /** `5 min czytania` */
  reading: string;
}

export function ArticleCard({
  article,
  headingLevel = "h3",
  priority = false,
}: {
  article: Omit<ArticleCardData, "author" | "date" | "dateTime"> &
    Partial<Pick<ArticleCardData, "author" | "date" | "dateTime">>;
  headingLevel?: "h2" | "h3";
  /** The first card above the fold: its cover loads first. */
  priority?: boolean;
}) {
  const Heading = headingLevel;
  return (
    <article className={styles.article}>
      <InkReveal className={styles.articleFrame}>
        <CrisisCardFrame index={1} />
      </InkReveal>
      <div className={styles.articleContent}>
        <div className={cn(styles.articlePhoto, "bg-cream")}>
          {article.coverUrl ? (
            <Image
              alt=""
              className="object-cover"
              fill
              priority={priority}
              sizes="(min-width: 1024px) 24rem, (min-width: 640px) 50vw, 100vw"
              src={article.coverUrl}
            />
          ) : null}
        </div>
        <div className={styles.articleBody}>
          <div className="ks-education-article-topline">
            <span className={styles.meta}>
              <Clock3 size={15} aria-hidden="true" />
              {article.reading.replace(/\s+czytania\s*$/, "")}
            </span>
            {article.date ? (
              <time
                className="ks-education-article-date"
                dateTime={article.dateTime}
              >
                {article.date}
              </time>
            ) : null}
          </div>
          {article.category ? (
            <p className={styles.kicker}>
              {article.category.href ? (
                <PageLink
                  className="ks-education-article-category focus-visible:outline-ring hover:underline focus-visible:outline-2"
                  href={article.category.href}
                >
                  {article.category.name}
                </PageLink>
              ) : (
                article.category.name
              )}
            </p>
          ) : null}
          <Heading className={styles.materialTitle}>
            <PageLink
              className="ks-education-article-title focus-visible:outline-ring after:absolute after:inset-0 after:z-10 after:content-[''] focus-visible:outline-2"
              href={article.href}
            >
              <span className="ks-wk__title-label">{article.title}</span>
            </PageLink>
          </Heading>
          <p className={styles.excerpt}>{article.lead}</p>
          <div className={styles.articleFoot}>
            <HoverPaint />
            {article.author ? (
              <div className="ks-education-article-author">
                {article.authorAvatarUrl ? (
                  <Image
                    src={article.authorAvatarUrl}
                    alt=""
                    width={36}
                    height={36}
                    className="ks-education-article-avatar"
                  />
                ) : null}
                <span>{article.author}</span>
              </div>
            ) : null}
            <div className="ks-education-article-actions">
              <HanddrawnLink href={article.href}>Przeczytaj</HanddrawnLink>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}

/** Cards in a grid: one column on a phone, two, three on a desktop. */
export function ArticleGrid({
  articles,
  headingLevel,
  className,
  priorityFirst = false,
}: {
  articles: readonly ArticleCardData[];
  headingLevel?: "h2" | "h3";
  className?: string;
  priorityFirst?: boolean;
}) {
  return (
    <ul className={cn("grid gap-6 sm:grid-cols-2 lg:grid-cols-3", className)}>
      {articles.map((article, index) => (
        <li className="grid" key={article.id}>
          <ArticleCard
            article={article}
            headingLevel={headingLevel}
            priority={priorityFirst && index === 0}
          />
        </li>
      ))}
    </ul>
  );
}
