import { Phone } from "lucide-react";
import { useId } from "react";
import { cn } from "../lib/utils";
import { ArrowLink } from "./actions";

// Server-safe: the crisis strip, where to call right now. Its heading, its
// sentence and the lines are the CMS's (the admin approves them; the strip
// is always shown). Every number is a link that dials it, written as it
// is read.
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
      className={cn("max-w-page px-gutter py-section-sm mx-auto", className)}
      id={id}
    >
      <div className="rounded-card border-pink/40 bg-pink/10 grid gap-4 border p-6 lg:p-8">
        <h2 className="font-display text-h3 text-ink" id={headingId}>
          {heading}
        </h2>
        {text ? <p className="text-body text-ink max-w-copy">{text}</p> : null}
        <ul className="grid gap-3 sm:grid-cols-2">
          {lines.map((line) => (
            <li className="flex items-start gap-3" key={line.number}>
              <Phone
                aria-hidden="true"
                className="text-pink-strong mt-1 size-5 shrink-0"
                strokeWidth={1.75}
              />
              <span className="text-body">
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
          <ArrowLink className="justify-self-start" href={more.href}>
            {more.label}
          </ArrowLink>
        ) : null}
      </div>
    </aside>
  );
}
