import type { SectionHeaderContent } from "@repo/contracts/section-header";
import { useId, type ReactNode } from "react";
import { cn } from "../lib/utils";
import { SectionHeader } from "./section-header";

// Server-safe: the newsletter band. Its words (and an optional call to
// action) are the CMS's header; the site supplies its signing-up form.

export interface NewsletterBandProps {
  header: SectionHeaderContent;
  /** The signing-up form. */
  children?: ReactNode;
  id?: string;
  className?: string;
}

export function NewsletterBand({
  header,
  children,
  id,
  className,
}: NewsletterBandProps) {
  const headingId = useId();
  return (
    <section
      aria-labelledby={headingId}
      className={cn("ks-newsletter-band", className)}
      id={id}
    >
      <div className="ks-newsletter-band__paint" aria-hidden="true" />
      <div className="ks-newsletter-band__inner max-w-page px-gutter mx-auto">
        <SectionHeader
          content={header}
          id={headingId}
          size="h2"
          className="ks-newsletter-band__copy"
        />
        {children ? (
          <div className="ks-newsletter-band__signup">{children}</div>
        ) : null}
      </div>
    </section>
  );
}
