import { EditorialHeading, SectionEyebrow } from "@repo/ui/public-site";
import type { ReactNode } from "react";

// The top of every subpage: an eyebrow, the page's one H1 with its accent
// line, and a lead.

export interface PageIntroProps {
  eyebrow?: ReactNode;
  heading: ReactNode;
  accent?: ReactNode;
  lead?: ReactNode;
  children?: ReactNode;
}

export function PageIntro({
  eyebrow,
  heading,
  accent,
  lead,
  children,
}: PageIntroProps) {
  return (
    <div className="max-w-page px-gutter mx-auto grid gap-5 pt-8 pb-10 lg:pt-12 lg:pb-14">
      {eyebrow ? (
        <SectionEyebrow className="text-pink-strong">{eyebrow}</SectionEyebrow>
      ) : null}
      <EditorialHeading as="h1" accent={accent} accentTone="primary">
        {heading}
      </EditorialHeading>
      {lead ? (
        <p className="max-w-copy text-lead text-text-muted">{lead}</p>
      ) : null}
      {children}
    </div>
  );
}
