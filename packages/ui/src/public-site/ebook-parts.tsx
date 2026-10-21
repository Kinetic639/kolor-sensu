import type { RichTextDocument } from "@repo/contracts/rich-text";
import { Download, ExternalLink } from "lucide-react";
import Image from "next/image";
import type { ReactNode } from "react";
import { cn } from "../lib/utils";
import { RichTextRenderer } from "../rich-text-renderer";
import { PrimaryButton, SecondaryButton } from "./actions";
import { PageLink } from "./page-link";
import { SoftCard } from "./surfaces";

// Edukacja's e-books: a card (the list, under an article), and an e-book's
// page: the cover beside the one H1, what it is and the way to buy it on
// Naffy (we show no price: Naffy does) and to download the free sample;
// then the description, who it is for, what is inside. Server-safe; the
// film is the page's own island.

export interface EbookCardData {
  id: string;
  href: string;
  title: string;
  description: string;
  coverUrl: string | null;
  format: string;
}

export function EbookCard({
  ebook,
  headingLevel = "h3",
  eyebrow,
  className,
}: {
  ebook: EbookCardData;
  headingLevel?: "h2" | "h3";
  /** Above the title, e.g. `E-book` under an article. */
  eyebrow?: string;
  className?: string;
}) {
  const Heading = headingLevel;
  return (
    <SoftCard asChild interactive>
      <article
        className={cn(
          "group grid grid-cols-[6rem_1fr] items-start gap-5 p-5 sm:grid-cols-[8rem_1fr] lg:p-6",
          className,
        )}
      >
        <EbookCover alt="" sizes="8rem" url={ebook.coverUrl} />
        <div className="grid gap-2">
          {eyebrow ? (
            <p className="text-eyebrow text-primary-strong uppercase">
              {eyebrow}
            </p>
          ) : null}
          <Heading className="font-display text-h3 text-ink text-balance">
            <PageLink
              className="focus-visible:outline-ring group-hover:underline after:absolute after:inset-0 after:content-[''] focus-visible:outline-2"
              href={ebook.href}
            >
              {ebook.title}
            </PageLink>
          </Heading>
          <p className="text-body text-text-muted line-clamp-3">
            {ebook.description}
          </p>
          {ebook.format ? (
            <p className="text-small text-text-muted">{ebook.format}</p>
          ) : null}
        </div>
      </article>
    </SoftCard>
  );
}

export function EbookGrid({
  ebooks,
  headingLevel,
}: {
  ebooks: readonly EbookCardData[];
  headingLevel?: "h2" | "h3";
}) {
  return (
    <ul className="grid gap-6 lg:grid-cols-2">
      {ebooks.map((ebook) => (
        <li className="grid" key={ebook.id}>
          <EbookCard ebook={ebook} headingLevel={headingLevel} />
        </li>
      ))}
    </ul>
  );
}

/** A book's cover: portrait, with a soft shadow; a quiet block without one. */
export function EbookCover({
  url,
  alt,
  sizes,
  priority = false,
}: {
  url: string | null;
  alt: string;
  sizes: string;
  priority?: boolean;
}) {
  return (
    <div className="bg-cream shadow-card relative aspect-[2/3] w-full overflow-hidden rounded-[0.375rem]">
      {url ? (
        <Image
          alt={alt}
          className="object-cover"
          fill
          priority={priority}
          sizes={sizes}
          src={url}
        />
      ) : null}
    </div>
  );
}

export function EbookHero({
  title,
  description,
  format,
  coverUrl,
  coverAlt,
  naffyUrl,
  sampleHref,
}: {
  title: string;
  description: string;
  format: string;
  coverUrl: string | null;
  coverAlt: string;
  /** The product on Naffy; none: no way to buy yet. */
  naffyUrl: string | null;
  /** The free sample (a PDF); none: no sample. */
  sampleHref: string | null;
}) {
  return (
    <header className="max-w-page px-gutter mx-auto grid items-center gap-8 pt-8 pb-10 sm:grid-cols-[minmax(0,16rem)_1fr] lg:gap-14 lg:pt-12 lg:pb-14">
      <div className="mx-auto w-full max-w-[16rem]">
        <EbookCover
          alt={coverAlt}
          priority
          sizes="(min-width: 640px) 16rem, 70vw"
          url={coverUrl}
        />
      </div>
      <div className="grid gap-5">
        <p className="text-eyebrow text-pink-strong uppercase">E-book</p>
        <h1 className="font-display text-display text-ink text-balance">
          {title}
        </h1>
        <p className="text-lead text-text-muted max-w-copy text-pretty">
          {description}
        </p>
        {format ? <p className="text-small text-text-muted">{format}</p> : null}
        <div className="flex flex-wrap gap-3">
          {naffyUrl ? (
            <PrimaryButton asChild>
              <a href={naffyUrl} rel="noopener" target="_blank">
                Zobacz cenę i kup na Naffy
                <ExternalLink aria-hidden="true" className="size-4" />
                <span className="sr-only"> (otwiera się w nowej karcie)</span>
              </a>
            </PrimaryButton>
          ) : null}
          {sampleHref ? (
            <SecondaryButton asChild>
              <a download href={sampleHref}>
                <Download aria-hidden="true" className="size-4" />
                Pobierz darmowy fragment
                <span className="sr-only"> (PDF)</span>
              </a>
            </SecondaryButton>
          ) : null}
        </div>
      </div>
    </header>
  );
}

/** The description, who it is for and what is inside, in a reading column. */
export function EbookDetails({
  description,
  audience,
  contents,
  aside,
}: {
  description: RichTextDocument;
  audience: string;
  contents: readonly string[];
  /** Beside the text on a desktop (the film). */
  aside?: ReactNode;
}) {
  return (
    <div className="max-w-page px-gutter pb-section-sm mx-auto grid items-start gap-10 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:gap-16">
      <div className="grid gap-10">
        <RichTextRenderer
          className="text-body text-ink max-w-copy"
          document={description}
        />
        {audience ? (
          <section aria-labelledby="dla-kogo" className="grid gap-3">
            <h2 className="font-display text-h3 text-ink" id="dla-kogo">
              Dla kogo
            </h2>
            <p className="text-body text-ink max-w-copy whitespace-pre-line">
              {audience}
            </p>
          </section>
        ) : null}
        {contents.length ? (
          <section aria-labelledby="w-srodku" className="grid gap-3">
            <h2 className="font-display text-h3 text-ink" id="w-srodku">
              Co jest w środku
            </h2>
            <ul className="text-body text-ink max-w-copy grid list-disc gap-2 pl-6">
              {contents.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>
        ) : null}
      </div>
      {aside ? <div className="lg:sticky lg:top-24">{aside}</div> : null}
    </div>
  );
}
