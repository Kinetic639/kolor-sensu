import { isRichTextEmpty, type RichTextDocument } from "@repo/contracts";
import type { ElementType, ReactNode } from "react";
import { cn } from "../lib/utils";
import { RichTextRenderer } from "../rich-text-renderer";
import { SpecialistArtwork, type SpecialistSplash } from "./specialist-artwork";
import { SoftCard } from "./surfaces";

// A specialist's profile as the site shows it, under its heading: the
// portrait on its watercolor, the bio, the services with their prices,
// who they work with and how, their qualifications, the way to book. The
// site's page renders it, and the admin's preview of the profile too, so
// the preview is the page. Server-safe.

export interface ProfileOfferRow {
  key: string;
  name: string;
  /** The service's page (none: no link). */
  href?: string;
  /** `50 min · w gabinecie lub online` */
  meta: string;
  /** `240 zł` */
  price: string;
}

export interface SpecialistProfileViewProps {
  name: string;
  role: string;
  portraitSrc: string;
  splash: SpecialistSplash;
  longBio: RichTextDocument | null;
  shortBio: string | null;
  offers: ProfileOfferRow[];
  /** `Z kim pracuję`, `Specjalizacje`, …: each shown when it has items. */
  facts: { title: string; items: string[] }[];
  /** Education and certificates, as one list. */
  qualifications: string[];
  /** The buttons under it (book, all specialists). */
  actions?: ReactNode;
  /** The link component for the services (e.g. next/link). */
  linkAs?: ElementType;
  priority?: boolean;
  className?: string;
}

/** What a profile lists, each in its own group, in the site's order. */
export function profileFacts(profile: {
  /** Already as labels (`Dorośli`). */
  clientGroups: string[];
  specializations: string[];
  therapyApproaches: string[];
  modalities: string[];
  languages: string[];
}) {
  return [
    { title: "Z kim pracuję", items: profile.clientGroups },
    { title: "Specjalizacje", items: profile.specializations },
    { title: "Podejście", items: profile.therapyApproaches },
    { title: "Formy pracy", items: profile.modalities },
    { title: "Języki", items: profile.languages },
  ];
}

function Facts({ title, items }: { title: string; items: string[] }) {
  if (items.length === 0) return null;
  return (
    <div className="grid gap-3">
      <h2 className="text-title text-ink font-body">{title}</h2>
      <ul className="flex flex-wrap gap-2">
        {items.map((item) => (
          <li
            className="bg-primary-soft text-ink text-small rounded-full px-3.5 py-1.5"
            key={item}
          >
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function SpecialistProfileView({
  name,
  role,
  portraitSrc,
  splash,
  longBio,
  shortBio,
  offers,
  facts,
  qualifications,
  actions,
  linkAs: Link = "a",
  priority = false,
  className,
}: SpecialistProfileViewProps) {
  return (
    <section
      className={cn(
        "grid items-start gap-10 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-16",
        className,
      )}
    >
      <div className="mx-auto w-full max-w-96">
        <SpecialistArtwork
          portraitAlt={`${name}, ${role}`}
          portraitSrc={portraitSrc}
          priority={priority}
          sizes="(min-width: 1024px) 384px, 90vw"
          splash={splash}
        />
      </div>
      <div className="grid content-start gap-8">
        {/* The full bio is rich text; without one the short bio stands in. */}
        {longBio && !isRichTextEmpty(longBio) ? (
          <RichTextRenderer
            className="text-body text-ink max-w-copy [&_a]:text-primary-strong [&_blockquote]:border-primary [&_h2]:font-display [&_h2]:text-h3 [&_h3]:font-display [&_h3]:text-title [&>:first-child]:mt-0"
            document={longBio}
          />
        ) : shortBio ? (
          <p className="text-body text-ink max-w-copy">{shortBio}</p>
        ) : null}
        {offers.length > 0 ? (
          <SoftCard asChild className="grid gap-4 p-6">
            <section aria-labelledby="offers-heading">
              <h2 className="text-title text-ink font-body" id="offers-heading">
                Usługi i ceny
              </h2>
              <ul className="divide-border grid divide-y">
                {offers.map((offer) => (
                  <li
                    className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 py-3 first:pt-0 last:pb-0"
                    key={offer.key}
                  >
                    <div className="grid gap-0.5">
                      {offer.href ? (
                        <Link
                          className="text-ink hover:text-primary-strong font-semibold underline-offset-4 hover:underline"
                          href={offer.href}
                        >
                          {offer.name}
                        </Link>
                      ) : (
                        <span className="text-ink font-semibold">
                          {offer.name}
                        </span>
                      )}
                      <span className="text-small text-text-muted">
                        {offer.meta}
                      </span>
                    </div>
                    <span className="text-ink font-semibold whitespace-nowrap">
                      {offer.price}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          </SoftCard>
        ) : null}
        {facts.map((fact) => (
          <Facts items={fact.items} key={fact.title} title={fact.title} />
        ))}
        {qualifications.length > 0 ? (
          <SoftCard className="grid gap-3 p-6">
            <h2 className="text-title text-ink font-body">
              Wykształcenie i kwalifikacje
            </h2>
            <ul className="text-small text-text-muted grid list-disc gap-1.5 pl-5">
              {qualifications.map((entry) => (
                <li key={entry}>{entry}</li>
              ))}
            </ul>
          </SoftCard>
        ) : null}
        {actions ? (
          <div className="flex flex-wrap items-center gap-3">{actions}</div>
        ) : null}
      </div>
    </section>
  );
}
