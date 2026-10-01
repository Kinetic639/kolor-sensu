import type { ReactNode } from "react";
import { cn } from "../lib/utils";

// A quiet, always-visible note for someone in crisis: we are not an
// emergency service, and these numbers answer now. Plain text and tel:
// links, no motion beyond the page's own text reveal.

export interface CrisisLine {
  number: string;
  label: ReactNode;
}

export interface CrisisBandProps {
  heading: ReactNode;
  description?: ReactNode;
  lines: readonly CrisisLine[];
  className?: string;
}

export function CrisisBand({
  heading,
  description,
  lines,
  className,
}: CrisisBandProps) {
  return (
    <aside
      aria-label="Pomoc w kryzysie"
      className={cn("max-w-page px-gutter mx-auto", className)}
    >
      <div className="ks-crisis grid gap-6 lg:grid-cols-[minmax(0,4fr)_minmax(0,8fr)] lg:items-center lg:gap-12">
        <div className="grid gap-2" data-motion="text">
          <h2 className="font-display text-h3 text-ink">{heading}</h2>
          {description ? (
            <p className="text-small text-text-muted">{description}</p>
          ) : null}
        </div>
        <ul
          className="grid grid-cols-2 gap-x-6 gap-y-5 md:grid-cols-4"
          data-motion="text"
        >
          {lines.map((line) => (
            <li key={line.number} className="grid gap-1">
              <a
                href={`tel:${line.number.replace(/\s/g, "")}`}
                className="font-display text-ink hover:text-primary-strong text-[1.5rem] leading-none underline-offset-4 hover:underline"
              >
                {line.number}
              </a>
              <span className="text-small text-text-muted">{line.label}</span>
            </li>
          ))}
        </ul>
      </div>
    </aside>
  );
}
