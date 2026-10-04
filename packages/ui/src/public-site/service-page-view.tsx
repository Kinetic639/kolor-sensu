import type { ReactNode } from "react";
import { cn } from "../lib/utils";
import { ArrowLink } from "./actions";
import { SoftCard } from "./surfaces";

// A service's page as the site shows it, under its heading: the time and
// the price, the description, the way to book, and who leads it at what
// price. The site's page renders it, and the admin's preview too, so the
// preview is the page. Server-safe.

/** Shown on a service's page when it has no description of its own. */
export const SERVICE_FALLBACK_DESCRIPTION =
  "Szczegóły tej formy wsparcia omówimy podczas pierwszego kontaktu. Zadzwoń lub napisz do nas, a pomożemy dobrać specjalistę i termin.";

/** The description's paragraphs (blank lines between); none: the fallback. */
export function serviceParagraphs(description: string | null) {
  return (description?.trim() ? description : SERVICE_FALLBACK_DESCRIPTION)
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
}

/** Under the heading: how long, and for how much. */
export function ServiceFacts({
  duration,
  price,
}: {
  /** `50 min` */
  duration: string;
  /** `od 200 zł`; none: left out. */
  price?: string | null;
}) {
  return (
    <dl className="text-small text-text-muted flex flex-wrap gap-x-8 gap-y-2">
      <div className="flex gap-2">
        <dt>Czas spotkania:</dt>
        <dd className="text-ink font-semibold">{duration}</dd>
      </div>
      {price ? (
        <div className="flex gap-2">
          <dt>Cena:</dt>
          <dd className="text-ink font-semibold">{price}</dd>
        </div>
      ) : null}
    </dl>
  );
}

export interface ServiceTeamRow {
  key: string;
  name: string;
  /** Their profile. */
  href: string;
  /** `220 zł · 50 min · w gabinecie lub online` */
  meta: string;
}

export function ServicePageView({
  paragraphs,
  team,
  action,
  className,
}: {
  paragraphs: string[];
  /** Who leads it (published specialists only). */
  team: ServiceTeamRow[];
  /** The way to book, under the description. */
  action?: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "grid items-start gap-10 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:gap-16",
        className,
      )}
    >
      <div className="text-body text-ink max-w-copy grid gap-4">
        {paragraphs.map((paragraph) => (
          <p key={paragraph}>{paragraph}</p>
        ))}
        {action ? (
          <div className="mt-2 justify-self-start">{action}</div>
        ) : null}
      </div>

      <SoftCard className="grid gap-5 p-6 lg:p-8">
        <h2 className="font-display text-h3 text-ink">Kto prowadzi</h2>
        {team.length === 0 ? (
          <p className="text-small text-text-muted">
            Skontaktuj się z nami, a dobierzemy specjalistę i termin.
          </p>
        ) : (
          <ul className="divide-border grid divide-y">
            {team.map((row) => (
              <li
                className="grid gap-1 py-4 first:pt-0 last:pb-0"
                key={row.key}
              >
                <ArrowLink className="justify-self-start" href={row.href}>
                  {row.name}
                </ArrowLink>
                <p className="text-small text-text-muted">{row.meta}</p>
              </li>
            ))}
          </ul>
        )}
      </SoftCard>
    </section>
  );
}
