import type {
  CtaStyle,
  DescriptionPart,
  HeaderTone,
  SectionHeaderContent,
} from "@repo/contracts/section-header";
import { Fragment } from "react";
import { cn } from "../lib/utils";
import { PrimaryButton, SecondaryButton } from "./actions";
import { HanddrawnLink } from "./handdrawn-link";
import { PageLink } from "./page-link";
import { EditorialHeading, SectionEyebrow } from "./typography";

// Server-safe: the header of a public section, as the CMS edits it
// (@repo/contracts/section-header): the eyebrow, the title (one or two
// lines, any words in another colour), the description (with at most one
// link, anywhere in it) and an optional call to action under it.
//
// The CMS gives only words and colours. The markup is the section's: it
// says which heading level the title is (`as`), its size, where the header
// stands (`align`) and the heading's id. Coloured words are spans inside
// the one heading, and a second line is a line break in it, so the outline
// of the page and what a screen reader reads stay one plain title.
//
//   header
//   ├── p        eyebrow (not a heading: it does not enter the outline)
//   ├── h2       title (level and size from the section)
//   ├── p        description, the link inside it
//   └── a        call to action: a button, an outlined button or a link

// Each colour in the size it is used at: the eyebrow and the link are
// small text, where the light pink and green would not read (WCAG AA), so
// they take the strong shades; the title is large and takes the light ones.
const eyebrowTones: Record<HeaderTone, string> = {
  default: "",
  green: "text-primary-strong",
  pink: "text-pink-strong",
};

const titleTones: Record<HeaderTone, string> = {
  default: "",
  green: "text-primary",
  pink: "text-pink",
};

const linkTones: Record<HeaderTone, string> = {
  default: "text-ink",
  green: "text-primary-strong",
  pink: "text-pink-strong",
};

export interface SectionHeaderProps {
  content: SectionHeaderContent;
  /** The title's heading level: the section's, never the CMS's. */
  as?: "h1" | "h2" | "h3";
  /** The title's size, independent of its level. */
  size?: "display" | "h2" | "h3";
  /** The heading's id, for the section's aria-labelledby. */
  id?: string;
  align?: "start" | "center";
  /**
   * "page": the top of a page (its h1): more room, and the description is
   * the page's lead, in the lead's size.
   */
  variant?: "section" | "page";
  className?: string;
}

export function SectionHeader({
  content,
  as = "h2",
  size,
  id,
  align = "start",
  variant = "section",
  className,
}: SectionHeaderProps) {
  const { description, cta } = content;
  const centred = align === "center";
  return (
    <header
      className={cn(
        "grid content-start",
        variant === "page" ? "gap-5" : "gap-3",
        centred && "justify-items-center text-center",
        className,
      )}
    >
      <SectionTitle content={content} as={as} size={size} id={id} />
      {description.length > 0 ? (
        <p
          className={cn(
            "max-w-copy text-text-muted",
            variant === "page" ? "text-lead" : "text-body",
          )}
        >
          {description.map((part, at) => (
            <DescriptionRun key={at} part={part} />
          ))}
        </p>
      ) : null}
      {cta ? (
        <HeaderCta
          href={cta.href}
          label={cta.label}
          style={cta.style}
          className={cn(
            "mt-2",
            centred ? "justify-self-center" : "justify-self-start",
          )}
        />
      ) : null}
    </header>
  );
}

function DescriptionRun({ part }: { part: DescriptionPart }) {
  if (!part.link) return <>{part.text}</>;
  return (
    <PageLink
      href={part.link.href}
      className={cn(
        "focus-visible:outline-ring rounded-sm font-semibold underline decoration-current/40 decoration-1 underline-offset-4 transition-colors hover:decoration-current focus-visible:outline-2 focus-visible:outline-offset-2",
        linkTones[part.link.tone],
      )}
    >
      {part.text}
    </PageLink>
  );
}

export function HeaderCta({
  href,
  label,
  style,
  className,
}: {
  href: string;
  label: string;
  style: CtaStyle;
  className?: string;
}) {
  if (style === "arrow") {
    return (
      <HanddrawnLink href={href} className={className}>
        {label}
      </HanddrawnLink>
    );
  }
  const Button = style === "button" ? PrimaryButton : SecondaryButton;
  return (
    <Button asChild arrow className={className}>
      <PageLink href={href}>{label}</PageLink>
    </Button>
  );
}

/** The same CMS title rendering, without introducing a nested header landmark. */
export function SectionTitle({
  content,
  as = "h2",
  size,
  id,
}: Pick<SectionHeaderProps, "as" | "size" | "id"> & {
  content: Pick<SectionHeaderContent, "eyebrow" | "title">;
}) {
  const { eyebrow, title } = content;
  return (
    <>
      {eyebrow.text ? (
        <SectionEyebrow className={eyebrowTones[eyebrow.tone]}>
          {eyebrow.text}
        </SectionEyebrow>
      ) : null}
      <EditorialHeading as={as} size={size} id={id}>
        {title.map((line, index) => (
          <Fragment key={index}>
            {/* The space keeps the last word of one line and the first of
                the next apart for anything that reads the text (a screen
                reader, a search engine), which a line break alone does not. */}
            {index > 0 ? (
              <>
                {" "}
                <br />
              </>
            ) : null}
            {line.map((segment, at) =>
              segment.tone === "default" ? (
                <Fragment key={at}>{segment.text}</Fragment>
              ) : (
                <span key={at} className={titleTones[segment.tone]}>
                  {segment.text}
                </span>
              ),
            )}
          </Fragment>
        ))}
      </EditorialHeading>
    </>
  );
}
