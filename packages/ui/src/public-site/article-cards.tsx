import Image from "next/image";
import { cn } from "../lib/utils";
import { PageLink } from "./page-link";
import { SoftCard } from "./surfaces";

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
  article: ArticleCardData;
  headingLevel?: "h2" | "h3";
  /** The first card above the fold: its cover loads first. */
  priority?: boolean;
}) {
  const Heading = headingLevel;
  return (
    <SoftCard asChild interactive>
      <article className="group grid grid-rows-[auto_1fr] overflow-hidden">
        <div className="bg-cream relative aspect-[3/2]">
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
        <div className="flex flex-col gap-3 p-5 lg:p-6">
          {article.category ? (
            <p className="text-eyebrow text-primary-strong relative z-10 uppercase">
              <PageLink
                className="focus-visible:outline-ring hover:underline focus-visible:outline-2"
                href={article.category.href}
              >
                {article.category.name}
              </PageLink>
            </p>
          ) : null}
          <Heading className="font-display text-h3 text-ink text-balance">
            <PageLink
              className="focus-visible:outline-ring group-hover:underline after:absolute after:inset-0 after:content-[''] focus-visible:outline-2"
              href={article.href}
            >
              {article.title}
            </PageLink>
          </Heading>
          <p className="text-body text-text-muted line-clamp-3">
            {article.lead}
          </p>
          <p className="text-small text-text-muted mt-auto">
            {article.author} ·{" "}
            <time dateTime={article.dateTime}>{article.date}</time> ·{" "}
            {article.reading}
          </p>
        </div>
      </article>
    </SoftCard>
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
