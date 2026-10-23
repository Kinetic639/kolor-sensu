import type { PageHeaderContent } from "@repo/contracts";
import {
  EditorialHeading,
  SectionEyebrow,
  SectionHeader,
} from "@repo/ui/public-site";
import type { ReactNode } from "react";

// The top of every subpage: an eyebrow, the page's one H1 (two lines, the
// second coloured) and a lead. A page whose top the CMS edits gives its
// header (a section's header's shape: coloured words, one link in the
// lead); a page whose words are code gives the four words.

const FRAME =
  "max-w-page px-gutter mx-auto grid gap-5 pt-8 pb-10 lg:pt-12 lg:pb-14";

export type PageIntroProps =
  | {
      /** The CMS's header for this page. */
      header: PageHeaderContent;
      children?: ReactNode;
    }
  | {
      header?: undefined;
      eyebrow?: ReactNode;
      heading: ReactNode;
      accent?: ReactNode;
      lead?: ReactNode;
      children?: ReactNode;
    };

export function PageIntro(props: PageIntroProps) {
  if (props.header) {
    return (
      <div className={FRAME}>
        <SectionHeader as="h1" content={props.header} variant="page" />
        {props.children}
      </div>
    );
  }
  const { eyebrow, heading, accent, lead, children } = props;
  return (
    <div className={FRAME}>
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
