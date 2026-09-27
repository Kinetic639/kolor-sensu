import {
  EditorialHeading,
  SectionEyebrow,
  SiteBreadcrumbs,
} from "@repo/ui/public-site";
import type { ReactNode } from "react";
import { siteUrl } from "@/content/site";

// The top of every subpage: breadcrumbs (also as BreadcrumbList data), an
// eyebrow, the page's one H1 with its accent line, and a lead.

export interface PageIntroProps {
  /** The trail after "Strona główna"; the last item is this page. */
  trail: Array<{ label: string; href?: string }>;
  eyebrow?: ReactNode;
  heading: ReactNode;
  accent?: ReactNode;
  lead?: ReactNode;
  children?: ReactNode;
}

export function PageIntro({
  trail,
  eyebrow,
  heading,
  accent,
  lead,
  children,
}: PageIntroProps) {
  return (
    <div className="max-w-page px-gutter mx-auto grid gap-5 pt-8 pb-10 lg:pt-12 lg:pb-14">
      <SiteBreadcrumbs
        siteUrl={siteUrl}
        items={[{ label: "Strona główna", href: "/" }, ...trail]}
      />
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
