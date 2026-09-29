import { CheckCircle2 } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "../lib/utils";
import { PageLink as Link } from "../public-site/page-link";

// A choice in the wizard (a service, a form, a specialist): the whole card
// is one link that sets the choice in the address, so it works without
// JavaScript. Put the cards in a <ul>.

export interface BookingChoiceCardProps {
  href: string;
  title: string;
  /** Under the title (e.g. a specialist's professional title). */
  subtitle?: string;
  description?: ReactNode;
  /** An icon or a photo, top left. */
  media?: ReactNode;
  /** Short facts ("50 minut", "od 250 zł"). */
  facts?: ReactNode[];
  tags?: string[];
  selected?: boolean;
  headingLevel?: "h2" | "h3";
}

export function BookingChoiceCard({
  href,
  title,
  subtitle,
  description,
  media,
  facts,
  tags,
  selected = false,
  headingLevel: Heading = "h3",
}: BookingChoiceCardProps) {
  return (
    <li
      className={cn(
        "rounded-card-sm bg-surface ease-soft has-[a:focus-visible]:outline-ring relative flex flex-col gap-3 border p-4 transition-[border-color,box-shadow] duration-200 has-[a:focus-visible]:outline-2 has-[a:focus-visible]:outline-offset-2",
        selected
          ? "border-primary shadow-card ring-primary ring-1"
          : "border-border hover:border-border-strong hover:shadow-card",
      )}
    >
      <div className="flex items-start gap-3">
        {media ? (
          <span
            aria-hidden="true"
            className="bg-primary-soft text-primary-strong flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-full [&_svg]:size-6"
          >
            {media}
          </span>
        ) : null}
        <div className="min-w-0 flex-1">
          <Heading className="text-ink font-semibold">
            {/* The link covers the card; its name is the title. */}
            <Link
              aria-current={selected ? "true" : undefined}
              className="outline-none after:absolute after:inset-0"
              href={href}
            >
              {title}
            </Link>
          </Heading>
          {subtitle ? (
            <p className="text-small text-text-muted">{subtitle}</p>
          ) : null}
        </div>
        {selected ? (
          <CheckCircle2
            aria-hidden="true"
            className="text-primary size-6 shrink-0"
          />
        ) : null}
      </div>
      {description ? (
        <div className="text-small text-text-muted">{description}</div>
      ) : null}
      {facts?.length ? (
        <ul className="text-small text-ink flex flex-wrap gap-x-4 gap-y-1 font-semibold">
          {facts.map((fact, index) => (
            <li key={index}>{fact}</li>
          ))}
        </ul>
      ) : null}
      {tags?.length ? (
        <ul className="flex flex-wrap gap-1.5">
          {tags.map((tag) => (
            <li
              className="bg-primary-soft text-primary-strong rounded-full px-2.5 py-0.5 text-xs font-semibold"
              key={tag}
            >
              {tag}
            </li>
          ))}
        </ul>
      ) : null}
      <span
        aria-hidden={selected ? undefined : "true"}
        className={cn(
          "rounded-button text-small mt-auto flex h-10 items-center justify-center gap-2 font-semibold",
          selected
            ? "bg-primary text-on-primary"
            : "bg-bg text-ink border-border border",
        )}
      >
        {selected ? (
          <>
            <CheckCircle2 aria-hidden="true" className="size-4" /> Wybrana
          </>
        ) : (
          "Wybierz"
        )}
      </span>
    </li>
  );
}
