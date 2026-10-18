import type { SectionHeaderContent } from "@repo/contracts/section-header";
import { useId } from "react";
import { cn } from "../lib/utils";
import { SectionHeader } from "./section-header";
import { SoftCard } from "./surfaces";

// Server-safe: the newsletter band. Its words (and an optional call to
// action) are the CMS's header; the signing-up form joins it once the
// newsletter tool is chosen.

export interface NewsletterBandProps {
  header: SectionHeaderContent;
  id?: string;
  className?: string;
}

export function NewsletterBand({ header, id, className }: NewsletterBandProps) {
  const headingId = useId();
  return (
    <section
      aria-labelledby={headingId}
      className={cn("max-w-page px-gutter py-section-sm mx-auto", className)}
      id={id}
    >
      <SoftCard className="p-8 lg:p-12" tone="cream">
        <SectionHeader
          align="center"
          content={header}
          id={headingId}
          size="h3"
        />
      </SoftCard>
    </section>
  );
}
