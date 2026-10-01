import { cn } from "../lib/utils";

// Server-safe. Two lines of very large outlined display type that slide
// apart, in opposite directions, as the band crosses the screen (after
// Talking Walls' "Expressing yourself without words"). Decorative: the
// words repeat a line said elsewhere, so the band is hidden from assistive
// technology. Motion is pure CSS (public-site.css, "Drifting words"), only
// inside a PageMotion and only where scroll-driven animations exist.

export interface DriftingWordsProps {
  lines: readonly [string, string];
  className?: string;
}

export function DriftingWords({ lines, className }: DriftingWordsProps) {
  return (
    <div className={cn("ks-drift-words", className)} aria-hidden="true">
      <span className="ks-drift-words__line">{lines[0]}</span>
      <span className="ks-drift-words__line">{lines[1]}</span>
    </div>
  );
}
