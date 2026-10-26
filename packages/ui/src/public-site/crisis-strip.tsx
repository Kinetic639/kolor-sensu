import { Phone } from "lucide-react";
import Image from "next/image";
import { useId } from "react";
import { cn } from "../lib/utils";
import { HanddrawnLink } from "./handdrawn-link";
import { CrisisCardFrame } from "./crisis-card-frame";
import { crisisCardArt } from "./crisis-card-art";
import { InkReveal } from "./ink-reveal";
import { EditorialHeading, SectionEyebrow } from "./typography";

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
  eyebrow?: string;
  heading: string;
  text: string;
  lines: readonly CrisisLine[];
  /** A link to the page about help in a crisis, in the intro. */
  more?: { href: string; label: string };
  id?: string;
  className?: string;
}

/** The number as a phone dials it: no spaces. */
export function crisisLineHref(number: string): string {
  return `tel:${number.replace(/\s+/g, "")}`;
}

export function CrisisStrip({
  eyebrow,
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
      className={cn(
        "ks-crisis max-w-page px-gutter py-section-sm mx-auto",
        className,
      )}
      id={id}
    >
      <header className="ks-crisis__intro">
        {eyebrow ? (
          <SectionEyebrow className="text-pink-strong">
            {eyebrow}
          </SectionEyebrow>
        ) : null}
        <EditorialHeading size="h2" id={headingId}>
          {heading}
        </EditorialHeading>
        {text ? <p className="ks-crisis__description">{text}</p> : null}
        {more ? (
          <HanddrawnLink href={more.href}>{more.label}</HanddrawnLink>
        ) : null}
      </header>
      <ul className="ks-crisis__list" data-count={lines.length}>
        {lines.map((line, index) => {
          const art = crisisCardArt[index % crisisCardArt.length]!;
          return (
            <li key={line.number}>
              <InkReveal className="ks-crisis__card" delay={(index % 4) * 0.16}>
                <Image
                  className="ks-crisis__fill"
                  src={`/crisis/crisis-fill-${art.name}.webp`}
                  width={960}
                  height={640}
                  sizes="(max-width: 679px) 100vw, (max-width: 1119px) 50vw, 380px"
                  alt=""
                />
                <span
                  className="ks-crisis__frame-layer"
                  data-tone={art.name.startsWith("pink") ? "pink" : "green"}
                >
                  <CrisisCardFrame index={index} />
                </span>
                <Phone
                  aria-hidden="true"
                  className="ks-crisis__phone"
                  strokeWidth={1.4}
                />
                <h3 className="ks-crisis__label">{line.label}</h3>
                <a
                  className="ks-crisis__number"
                  href={crisisLineHref(line.number)}
                >
                  {line.number}
                </a>
                {line.detail ? (
                  <span className="ks-crisis__detail">{line.detail}</span>
                ) : null}
              </InkReveal>
            </li>
          );
        })}
      </ul>
    </aside>
  );
}
