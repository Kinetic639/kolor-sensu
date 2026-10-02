import type { ReactNode } from "react";
import { cn } from "./lib/utils";

// A portal page that fills the space to the edges, below the header: a
// table with its bars, a calendar. It scrolls inside itself, so its bars
// and footer stay in view (on a phone, it flows above the bottom bar).

export function FullBleed({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex min-h-[calc(100dvh-var(--ks-header-height)-4rem)] flex-col md:h-[calc(100dvh-var(--ks-header-height))] md:min-h-0",
        className,
      )}
      data-full-bleed
    >
      {children}
    </div>
  );
}
