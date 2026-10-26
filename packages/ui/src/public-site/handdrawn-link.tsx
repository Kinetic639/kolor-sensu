import type { ReactNode } from "react";
import { cn } from "../lib/utils";
import { InkReveal } from "./ink-reveal";
import { PageLink } from "./page-link";

export interface HanddrawnLinkProps {
  href: string;
  children: ReactNode;
  className?: string;
}

/** An ordinary link with reusable drawn ink, inheriting its surrounding color. */
export function HanddrawnLink({
  href,
  children,
  className,
}: HanddrawnLinkProps) {
  return (
    <InkReveal as="span" className={cn("ks-hand-link-wrap", className)}>
      <PageLink href={href} className="ks-hand-link">
        <span className="ks-hand-link__label">
          {children}
          <svg
            className="ks-hand-link__underline"
            viewBox="0 0 360 14"
            preserveAspectRatio="none"
            aria-hidden="true"
            focusable="false"
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
          >
            <path
              data-ink-stroke="underline"
              d="M 3 8 C 46 6.4 75 9.1 112 7.3 S 181 8.6 220 7.1 S 302 7.8 356 5.6"
              strokeWidth="1.9"
              strokeOpacity="0.85"
            />
            <path
              data-ink-stroke="underline"
              d="M 5 8.7 C 50 7 79 9.5 116 8 S 182 9.2 222 7.8 S 302 8.3 354 6.4"
              strokeWidth="0.45"
              strokeOpacity="0.28"
            />
          </svg>
        </span>
        <svg
          className="ks-hand-link__arrow"
          viewBox="0 0 34 26"
          aria-hidden="true"
          focusable="false"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path
            data-ink-stroke="shaft"
            d="M 3 13.8 C 10.4 12.6 18.2 14.1 29 12.1"
            strokeWidth="1.9"
            strokeOpacity="0.85"
          />
          <path
            data-ink-stroke="head"
            d="M 21.6 5.2 C 23.7 8.2 26.8 10.7 29 12.1 C 26.1 14.3 23.3 17.4 21.4 20.2"
            strokeWidth="1.8"
            strokeOpacity="0.85"
          />
          <path
            data-ink-stroke="shaft"
            d="M 4 14.4 C 11 13.2 18.7 14.7 28 12.8"
            strokeWidth="0.4"
            strokeOpacity="0.28"
          />
        </svg>
      </PageLink>
    </InkReveal>
  );
}
