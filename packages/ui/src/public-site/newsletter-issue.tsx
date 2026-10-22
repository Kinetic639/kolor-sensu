import Image from "next/image";
import { cn } from "../lib/utils";
import { PageLink } from "./page-link";
import { SoftCard } from "./surfaces";

// The newsletter's archive on the site (/newsletter): the issues gone out,
// newest first, each with its number, date, subject and the line under it;
// and an issue's cards (an article, an e-book, an own card from the
// centre), each with its cover, a few words and a link. Server-safe.

export interface NewsletterCardData {
  eyebrow: string;
  title: string;
  text: string;
  /** The site's own path or an address; null: a card without a link. */
  href: string | null;
  label: string;
  imageUrl: string | null;
}

export function NewsletterIssueCards({
  cards,
  className,
}: {
  cards: readonly NewsletterCardData[];
  className?: string;
}) {
  if (!cards.length) return null;
  return (
    <ul className={cn("grid gap-6 sm:grid-cols-2", className)}>
      {cards.map((card, index) => (
        <li className="grid" key={`${card.title}-${index}`}>
          <SoftCard asChild interactive={Boolean(card.href)}>
            <article className="group grid grid-rows-[auto_1fr] overflow-hidden">
              {card.imageUrl ? (
                <div className="bg-cream relative aspect-[3/2]">
                  <Image
                    alt=""
                    className="object-cover"
                    fill
                    sizes="(min-width: 640px) 50vw, 100vw"
                    src={card.imageUrl}
                  />
                </div>
              ) : (
                <div aria-hidden="true" />
              )}
              <div className="flex flex-col gap-3 p-5 lg:p-6">
                <p className="text-eyebrow text-primary-strong uppercase">
                  {card.eyebrow}
                </p>
                <h2 className="font-display text-h3 text-ink text-balance">
                  {card.href ? (
                    <PageLink
                      className="focus-visible:outline-ring group-hover:underline after:absolute after:inset-0 after:content-[''] focus-visible:outline-2"
                      href={card.href}
                    >
                      {card.title}
                    </PageLink>
                  ) : (
                    card.title
                  )}
                </h2>
                {card.text ? (
                  <p className="text-body text-text-muted">{card.text}</p>
                ) : null}
                {card.href ? (
                  <p
                    aria-hidden="true"
                    className="text-small text-primary-strong mt-auto font-medium"
                  >
                    {card.label} →
                  </p>
                ) : null}
              </div>
            </article>
          </SoftCard>
        </li>
      ))}
    </ul>
  );
}

export interface NewsletterArchiveEntry {
  number: number;
  href: string;
  subject: string;
  previewText: string;
  /** `22 października 2026` */
  date: string;
  dateTime: string;
}

export function NewsletterArchiveList({
  issues,
  empty,
  className,
}: {
  issues: readonly NewsletterArchiveEntry[];
  /** Said while nothing has gone out yet. */
  empty: string;
  className?: string;
}) {
  if (!issues.length) {
    return (
      <p className={cn("text-body text-text-muted max-w-copy", className)}>
        {empty}
      </p>
    );
  }
  return (
    <ol className={cn("grid gap-4", className)}>
      {issues.map((issue) => (
        <li key={issue.number}>
          <SoftCard asChild interactive>
            <article className="group grid gap-2 p-5 lg:p-6">
              <p className="text-small text-text-muted">
                Nr {issue.number} ·{" "}
                <time dateTime={issue.dateTime}>{issue.date}</time>
              </p>
              <h2 className="font-display text-h3 text-ink text-balance">
                <PageLink
                  className="focus-visible:outline-ring group-hover:underline after:absolute after:inset-0 after:content-[''] focus-visible:outline-2"
                  href={issue.href}
                >
                  {issue.subject}
                </PageLink>
              </h2>
              {issue.previewText ? (
                <p className="text-body text-text-muted">{issue.previewText}</p>
              ) : null}
            </article>
          </SoftCard>
        </li>
      ))}
    </ol>
  );
}
