import { Phone } from "lucide-react";
import { useId } from "react";
import { cn } from "../lib/utils";
import { ArrowLink } from "./actions";

// Server-safe: the crisis strip, where to call right now. Its heading, its
// sentence and the lines are the CMS's (the admin approves them; the strip
// is always shown). Every number is a link that dials it, written as it
// is read.
//
// A compact band across the whole width (fresh sage on paper grain), its
// words in the page's column: heading, sentence and the link on the left,
// the numbers two by two on the right from wide screens.
//
//   aside     aria-labelledby → the heading (a landmark a screen reader
//   │         can jump to)
//   ├── h2    heading
//   ├── p     sentence
//   └── ul    one line each: the number (tel: link), whom it reaches, when

export interface CrisisLine {
  number: string;
  label: string;
  detail: string;
}

export interface CrisisStripProps {
  heading: string;
  text: string;
  lines: readonly CrisisLine[];
  /** A link to the page about help in a crisis, under the numbers. */
  more?: { href: string; label: string };
  id?: string;
  className?: string;
}

/** The number as a phone dials it: no spaces. */
export function crisisLineHref(number: string): string {
  return `tel:${number.replace(/\s+/g, "")}`;
}

export function CrisisStrip({
  heading,
  text,
  lines,
  more,
  id,
  className,
}: CrisisStripProps) {
  const headingId = useId();
  return (
    <aside
      aria-labelledby={headingId}
      className={cn("ks-crisis my-section-sm", className)}
      id={id}
    >
      {/* The numbers come right after the words, before the link to the
          page about it: the first link is 112. On wide screens the link
          moves under the words, beside the numbers. */}
      <div className="max-w-page px-gutter mx-auto grid gap-x-12 gap-y-5 py-9 lg:grid-cols-[minmax(0,4fr)_minmax(0,7fr)] lg:grid-rows-[auto_auto] lg:py-10">
        <div className="grid content-start gap-3 lg:self-end">
          <h2 className="font-display text-h3 text-ink" id={headingId}>
            {heading}
          </h2>
          {text ? (
            <p className="text-small text-ink max-w-copy">{text}</p>
          ) : null}
        </div>
        <ul className="grid gap-x-8 gap-y-3 sm:grid-cols-2 lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:self-center">
          {lines.map((line) => (
            <li className="flex items-start gap-3" key={line.number}>
              <Phone
                aria-hidden="true"
                className="text-pink-strong mt-1 size-5 shrink-0"
                strokeWidth={1.75}
              />
              <span className="text-small">
                <a
                  className="text-ink font-semibold underline-offset-4 hover:underline"
                  href={crisisLineHref(line.number)}
                >
                  {line.number}
                </a>
                <span className="text-ink"> · {line.label}</span>
                {line.detail ? (
                  <span className="text-text-muted"> ({line.detail})</span>
                ) : null}
              </span>
            </li>
          ))}
        </ul>
        {more ? (
          <ArrowLink
            className="justify-self-start lg:col-start-1 lg:row-start-2 lg:self-start"
            href={more.href}
          >
            {more.label}
          </ArrowLink>
        ) : null}
      </div>
    </aside>
  );
}
