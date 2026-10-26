import Image from "next/image";
import type { ReactNode } from "react";
import { cn } from "../lib/utils";
import { ArrowLink } from "./actions";
import { PageLink } from "./page-link";
import { SoftCard } from "./surfaces";

// An article's page around its text (the article renderer): the header
// (category, the one H1, the lead, who wrote it, when, how long to read),
// the cover, and under the text the sources, who reviewed it, the word
// about therapy, and what to do next (the services, the specialists).
// Server-safe; sharing is a small client island (ArticleShare).

export interface ArticlePersonData {
  name: string;
  /** Their profile; none for the team. */
  href: string | null;
  title: string | null;
  photoUrl: string | null;
}

export function ArticleHeader({
  category,
  title,
  lead,
  author,
  date,
  dateTime,
  updated,
  reading,
}: {
  category: { name: string; href: string } | null;
  title: string;
  lead: string;
  author: ArticlePersonData;
  date: string;
  dateTime: string;
  /** `Zaktualizowano 3 listopada 2026`, when the text changed later. */
  updated?: { label: string; dateTime: string } | null;
  reading: string;
}) {
  return (
    <header className="px-gutter mx-auto grid max-w-[46rem] gap-5 pt-10 pb-8 lg:pt-16">
      {category ? (
        <p className="text-eyebrow text-primary-strong uppercase">
          <PageLink
            className="focus-visible:outline-ring hover:underline focus-visible:outline-2"
            href={category.href}
          >
            {category.name}
          </PageLink>
        </p>
      ) : null}
      <h1 className="font-display text-display text-ink text-balance">
        {title}
      </h1>
      <p className="text-lead text-text-muted text-pretty">{lead}</p>
      <div className="flex items-center gap-3">
        <PersonPhoto person={author} size="size-11" />
        <div className="text-small grid">
          <span className="text-ink font-semibold">
            <PersonName person={author} />
          </span>
          <span className="text-text-muted">
            <time dateTime={dateTime}>{date}</time> · {reading}
            {updated ? (
              <>
                {" "}
                · <time dateTime={updated.dateTime}>{updated.label}</time>
              </>
            ) : null}
          </span>
        </div>
      </div>
    </header>
  );
}

/** The cover under the header, wider than the text. */
export function ArticleCover({ url, alt }: { url: string; alt: string }) {
  return (
    <div className="px-gutter mx-auto max-w-[64rem]">
      <div className="rounded-card relative aspect-[3/2] overflow-hidden">
        <Image
          alt={alt}
          className="object-cover"
          fill
          priority
          sizes="(min-width: 1024px) 64rem, 100vw"
          src={url}
        />
      </div>
    </div>
  );
}

export function PersonPhoto({
  person,
  size,
}: {
  person: ArticlePersonData;
  size: string;
}) {
  if (!person.photoUrl) return null;
  return (
    <span
      className={cn("relative shrink-0 overflow-hidden rounded-full", size)}
    >
      <Image
        alt=""
        className="object-cover"
        fill
        sizes="3rem"
        src={person.photoUrl}
      />
    </span>
  );
}

function PersonName({ person }: { person: ArticlePersonData }) {
  return person.href ? (
    <PageLink
      className="focus-visible:outline-ring underline-offset-4 hover:underline focus-visible:outline-2"
      href={person.href}
    >
      {person.name}
    </PageLink>
  ) : (
    <>{person.name}</>
  );
}

/** A labelled part under the text, in the text's column. */
export function ArticleEndSection({
  id,
  title,
  children,
  className,
}: {
  id: string;
  title: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      aria-labelledby={id}
      className={cn("px-gutter mx-auto grid max-w-[46rem] gap-4", className)}
    >
      <h2 className="font-display text-h3 text-ink" id={id}>
        {title}
      </h2>
      {children}
    </section>
  );
}

export function ArticleSources({
  sources,
}: {
  sources: readonly { title: string; url: string }[];
}) {
  if (sources.length === 0) return null;
  return (
    <ArticleEndSection id="zrodla" title="Źródła">
      <ol className="text-small text-text-muted grid list-decimal gap-2 pl-5">
        {sources.map((source) => (
          <li key={source.url}>
            <a
              className="focus-visible:outline-ring break-words underline underline-offset-4 focus-visible:outline-2"
              href={source.url}
              rel="noopener noreferrer"
              target="_blank"
            >
              {source.title}
              <span className="sr-only"> (otwiera się w nowej karcie)</span>
            </a>
          </li>
        ))}
      </ol>
    </ArticleEndSection>
  );
}

/** "Sprawdzone przez" and the word about therapy, in one quiet card. */
export function ArticleTrust({
  reviewer,
  therapyNote,
  crisisHref,
}: {
  reviewer: ArticlePersonData | null;
  therapyNote: string;
  crisisHref: string;
}) {
  return (
    <div className="px-gutter mx-auto max-w-[46rem]">
      <SoftCard className="grid gap-4 p-5 lg:p-6" tone="cream">
        {reviewer ? (
          <div className="flex items-center gap-3">
            <PersonPhoto person={reviewer} size="size-10" />
            <p className="text-small text-text-muted">
              Sprawdzone przez:{" "}
              <span className="text-ink font-semibold">
                <PersonName person={reviewer} />
              </span>
              {reviewer.title ? `, ${reviewer.title}` : null}
            </p>
          </div>
        ) : null}
        <p className="text-small text-text-muted">{therapyNote}</p>
        <ArrowLink href={crisisHref}>Pomoc w kryzysie</ArrowLink>
      </SoftCard>
    </div>
  );
}

export interface ArticleServiceData {
  name: string;
  href: string;
  bookHref: string;
  /** "Umów wizytę" (booking), or e.g. "Zapytaj o termin" (Kontakt). */
  bookLabel?: string;
}

/** The services the article recommends, each with a way to book. */
export function ArticleServices({
  services,
}: {
  services: readonly ArticleServiceData[];
}) {
  if (services.length === 0) return null;
  return (
    <ArticleEndSection id="uslugi" title="Jak możemy pomóc">
      <ul className="grid gap-3 sm:grid-cols-2">
        {services.map((service) => (
          <li key={service.href}>
            <SoftCard className="grid gap-3 p-5">
              <p className="font-display text-ink text-[1.25rem] leading-snug">
                <PageLink
                  className="focus-visible:outline-ring hover:underline focus-visible:outline-2"
                  href={service.href}
                >
                  {service.name}
                </PageLink>
              </p>
              <ArrowLink href={service.bookHref}>
                {service.bookLabel ?? "Umów wizytę"}
              </ArrowLink>
            </SoftCard>
          </li>
        ))}
      </ul>
    </ArticleEndSection>
  );
}

/** The specialists the article recommends. */
export function ArticlePeople({
  people,
}: {
  people: readonly ArticlePersonData[];
}) {
  if (people.length === 0) return null;
  return (
    <ArticleEndSection id="specjalisci" title="Specjaliści, którzy pomagają">
      <ul className="grid gap-3 sm:grid-cols-2">
        {people.map((person) => (
          <li className="flex items-center gap-3" key={person.name}>
            <PersonPhoto person={person} size="size-12" />
            <p className="text-small grid">
              <span className="text-ink font-semibold">
                <PersonName person={person} />
              </span>
              {person.title ? (
                <span className="text-text-muted">{person.title}</span>
              ) : null}
            </p>
          </li>
        ))}
      </ul>
    </ArticleEndSection>
  );
}
