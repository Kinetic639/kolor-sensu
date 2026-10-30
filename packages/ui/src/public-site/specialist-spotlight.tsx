import type { ImageProps } from "next/image";
import type { ReactNode } from "react";
import { cn } from "../lib/utils";
import { PrimaryButton } from "./actions";
import { HanddrawnLink } from "./handdrawn-link";
import { PageLink } from "./page-link";
import { type SpecialistSplash, SpecialistArtwork } from "./specialist-artwork";
import { SpecialistReveal } from "./specialist-reveal";
import { EditorialHeading, SectionEyebrow } from "./typography";
import type { SectionHeaderContent } from "@repo/contracts/section-header";
import { SectionHeader } from "./section-header";

// Server-safe: "Z kim porozmawiasz", one specialist presented at length,
// for when the centre has one (Home → the CMS chooses whom; it shows instead
// of, or besides, the cards of "Poznaj nasz zespół"). The cards' own
// artwork, the cut-out portrait on its watercolor splash, only larger, with
// the same entrance (SpecialistReveal) when animationPreset asks for it.
//
//   section
//   ├── header: eyebrow, h2, caption (across the top)
//   ├── .ks-spotlight__art   the portrait on its splash (SpecialistArtwork),
//   │                        on the left from 64 rem
//   └── .ks-spotlight__body  name (h3), role, bio, facts, booking, profile
//
// The entrance waits until most of the portrait is on screen (the cards
// start sooner: they are small).

export interface SpecialistSpotlightProps {
  /**
   * The header as the CMS edits it (words and colours; the markup stays
   * this section's). When given, it replaces eyebrow, heading and
   * description.
   */
  header?: SectionHeaderContent;
  eyebrow?: ReactNode;
  heading?: ReactNode;
  /** The caption under the heading. */
  description?: ReactNode;
  specialist: {
    name: string;
    role: string;
    /** The full profile. */
    href: string;
    /** Cut-out portrait (transparent background), head and shoulders. */
    portraitSrc: ImageProps["src"];
    portraitAlt?: string;
    splash: SpecialistSplash;
    bio?: ReactNode;
    /** Short lists: "W czym pomagam", "Z kim pracuję"…; empty ones are left out. */
    facts?: readonly { label: string; items: readonly string[] }[];
  };
  booking: { href: string; label: ReactNode };
  bookingPanel?: ReactNode;
  profileLabel?: ReactNode;
  animationPreset?: "none" | "splash-reveal";
  id?: string;
  className?: string;
}

export function SpecialistSpotlight({
  header,
  eyebrow,
  heading,
  description,
  specialist,
  booking,
  bookingPanel,
  profileLabel = "Poznaj mnie bliżej",
  animationPreset = "none",
  id,
  className,
}: SpecialistSpotlightProps) {
  const headingId = `${id ?? "z-kim-porozmawiasz"}-heading`;
  const facts = (specialist.facts ?? []).filter(
    (fact) => fact.items.length > 0,
  );
  const artwork = (
    <SpecialistArtwork
      portraitSrc={specialist.portraitSrc}
      portraitAlt={
        specialist.portraitAlt ??
        `${specialist.name}, ${specialist.role.toLowerCase()}`
      }
      splash={specialist.splash}
      backdropSrc={
        bookingPanel
          ? "/watercolor/specialist-brush-green-pink.webp"
          : undefined
      }
      sizes={
        bookingPanel
          ? "(min-width: 64rem) 25vw, 80vw"
          : "(min-width: 64rem) 30rem, 90vw"
      }
    />
  );
  const portrait =
    animationPreset === "splash-reveal" ? (
      <SpecialistReveal
        as="div"
        matte="a"
        reducedMotionMode="static"
        delay={0}
        threshold={0.5}
        className="ks-sp ks-spotlight__art"
      >
        {artwork}
      </SpecialistReveal>
    ) : (
      <div className="ks-sp ks-spotlight__art">{artwork}</div>
    );
  const factList = facts.length ? (
    <dl className="ks-spotlight__facts grid gap-5">
      {facts.map((fact) => (
        <div key={fact.label} className="grid gap-2">
          <dt className="text-small text-text-muted font-semibold">
            {fact.label}
          </dt>
          <dd className="m-0 flex flex-wrap gap-2">
            {fact.items.map((item) => (
              <span
                key={item}
                className="ks-spotlight__chip text-small text-ink"
              >
                {item}
              </span>
            ))}
          </dd>
        </div>
      ))}
    </dl>
  ) : null;
  const name = (
    <div className="grid gap-1">
      <EditorialHeading as="h3" size="h3">
        {specialist.name}
      </EditorialHeading>
      <p className="text-small text-text-muted font-semibold tracking-wide uppercase">
        {specialist.role}
      </p>
    </div>
  );
  return (
    <section
      id={id}
      aria-labelledby={headingId}
      className={cn(
        "ks-spotlight py-section",
        bookingPanel && "ks-spotlight--booking",
        className,
      )}
    >
      <div className="ks-spotlight__grid max-w-page px-gutter mx-auto">
        {header ? (
          <SectionHeader
            content={header}
            id={headingId}
            align={bookingPanel ? "center" : "start"}
            className="ks-spotlight__header"
          />
        ) : (
          <header
            className={cn(
              "ks-spotlight__header grid gap-3",
              bookingPanel && "justify-items-center text-center",
            )}
          >
            {eyebrow ? <SectionEyebrow>{eyebrow}</SectionEyebrow> : null}
            <EditorialHeading id={headingId}>{heading}</EditorialHeading>
            {description ? (
              <p className="text-body text-text-muted max-w-copy">
                {description}
              </p>
            ) : null}
          </header>
        )}
        {bookingPanel ? (
          <>
            <div className="ks-spotlight__rail">
              {portrait}
              {factList}
            </div>
            <div className="ks-spotlight__main">
              <div className="ks-spotlight__body grid content-start gap-5">
                {name}
                <div className="ks-spotlight__bio-row">
                  {specialist.bio ? (
                    <p className="text-body text-ink">{specialist.bio}</p>
                  ) : null}
                  <HanddrawnLink href={specialist.href}>
                    {profileLabel}
                  </HanddrawnLink>
                </div>
              </div>
              <div className="ks-spotlight__booking">{bookingPanel}</div>
            </div>
          </>
        ) : (
          <>
            {portrait}
            <div className="ks-spotlight__body grid content-start gap-5">
              {name}
              {specialist.bio ? (
                <p className="text-body text-ink max-w-copy">
                  {specialist.bio}
                </p>
              ) : null}
              {factList}
              <div className="flex flex-wrap items-center gap-5">
                <PrimaryButton asChild arrow>
                  <PageLink href={booking.href}>{booking.label}</PageLink>
                </PrimaryButton>
                <HanddrawnLink href={specialist.href}>
                  {profileLabel}
                </HanddrawnLink>
              </div>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
