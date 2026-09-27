import { Slot } from "@radix-ui/react-slot";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "../lib/utils";
import { BotanicalAccent } from "./botanical-accent";

export interface SoftCardProps extends HTMLAttributes<HTMLDivElement> {
  asChild?: boolean;
  /** Lifts slightly on hover and focus-within (whole card is a link target). */
  interactive?: boolean;
  tone?: "surface" | "cream";
}

/**
 * The one "boxed" surface of the public site, for content that needs a
 * readable panel (forms, text panels). Soft radius, hairline edge and a
 * diffuse ink-tinted shadow; never a hard frame around a photo.
 */
export function SoftCard({
  asChild = false,
  interactive = false,
  tone = "surface",
  className,
  ...props
}: SoftCardProps) {
  const Comp = asChild ? Slot : "div";

  return (
    <Comp
      className={cn(
        "rounded-card border-border/70 shadow-card relative border",
        tone === "surface" ? "bg-surface" : "bg-cream",
        interactive &&
          "ease-soft focus-within:shadow-card-hover hover:shadow-card-hover transition-[box-shadow,transform] duration-300 hover:-translate-y-0.5",
        className,
      )}
      {...props}
    />
  );
}

const tileTones = {
  sage: {
    paint: "[--ks-paint-color:var(--color-primary-soft)]",
    icon: "text-primary-strong",
  },
  blush: {
    paint: "[--ks-paint-color:var(--color-pink-soft)]",
    icon: "text-pink",
  },
  cream: {
    paint: "[--ks-paint-color:var(--color-cream)]",
    icon: "text-primary-strong",
  },
} as const;

export interface PastelIconTileProps {
  icon: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  tone?: keyof typeof tileTones;
  /** Makes the whole tile a link; the round arrow marks it visually. */
  href?: string;
  headingLevel?: "h2" | "h3" | "h4";
  className?: string;
}

/**
 * Service tile from reference A ("Psychoterapia par"): a pastel patch of
 * paint instead of a card box, a thin line icon, a short title and one line
 * of copy.
 */
export function PastelIconTile({
  icon,
  title,
  description,
  tone = "sage",
  href,
  headingLevel: Heading = "h3",
  className,
}: PastelIconTileProps) {
  const palette = tileTones[tone];

  return (
    <article
      data-tone={tone}
      className={cn(
        "relative isolate flex h-full flex-col items-center px-5 pt-9 pb-6 text-center",
        className,
      )}
    >
      <span
        aria-hidden="true"
        className={cn("ks-paint ks-paint--tile inset-0", palette.paint)}
      />
      <span
        aria-hidden="true"
        className={cn("[&_svg]:size-9 [&_svg]:stroke-[1.25]", palette.icon)}
      >
        {icon}
      </span>
      <Heading className="font-body text-title text-ink mt-5 text-balance">
        {href ? (
          <Link
            href={href}
            className="rounded-card-lg after:rounded-card-lg focus-visible:after:outline-ring after:absolute after:inset-0 focus-visible:outline-none focus-visible:after:outline-2 focus-visible:after:outline-offset-2"
          >
            {title}
          </Link>
        ) : (
          title
        )}
      </Heading>
      {description ? (
        <p className="text-small text-text-muted mt-2 text-balance">
          {description}
        </p>
      ) : null}
      {href ? (
        <span
          aria-hidden="true"
          className="rounded-button bg-surface text-ink shadow-card mt-auto grid size-10 translate-y-2 place-items-center"
        >
          <ArrowRight className="size-4" strokeWidth={1.75} />
        </span>
      ) : null}
    </article>
  );
}

// One band, painted wet-on-wet: the pigment drifts from one colour into the
// other across the width instead of two patches meeting at an edge.
const bandTones = {
  "sage-blush":
    "[--ks-paint-image:linear-gradient(90deg,color-mix(in_oklab,var(--color-sage)_75%,var(--color-bg))_25%,color-mix(in_oklab,var(--color-blush)_70%,var(--color-bg))_78%)]",
  sage: "[--ks-paint-image:linear-gradient(90deg,color-mix(in_oklab,var(--color-sage)_75%,var(--color-bg))_30%,var(--color-primary-soft))]",
  blush:
    "[--ks-paint-image:linear-gradient(90deg,color-mix(in_oklab,var(--color-blush)_70%,var(--color-bg))_30%,var(--color-pink-soft))]",
  neutral:
    "[--ks-paint-image:linear-gradient(90deg,var(--color-beige)_30%,var(--color-cream))]",
} as const;

export interface WatercolorSectionBackgroundProps extends HTMLAttributes<HTMLElement> {
  as?: "section" | "div" | "aside";
  tone?: keyof typeof bandTones;
  /** Ink sprig on the right edge, as in reference A's closing band. */
  accent?: boolean;
}

/**
 * A full-width band of wet-on-wet paint behind a section (reference A's "Zrób
 * pierwszy krok" band). Keep text on it in ink: the pigments are chosen for
 * ≥ 8:1 with ink, not for muted grey.
 */
export function WatercolorSectionBackground({
  as: Tag = "section",
  tone = "sage-blush",
  accent = false,
  className,
  children,
  ...props
}: WatercolorSectionBackgroundProps) {
  return (
    <Tag className={cn("relative isolate", className)} {...props}>
      <span
        aria-hidden="true"
        className={cn("ks-paint ks-paint--band inset-0", bandTones[tone])}
      />
      {accent ? (
        <BotanicalAccent className="text-ink/80 pointer-events-none absolute right-[3%] bottom-[8%] hidden w-32 md:block lg:w-40" />
      ) : null}
      {children}
    </Tag>
  );
}
