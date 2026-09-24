import type { SVGProps } from "react";
import { cn } from "../lib/utils";

// Ink line art in the style of the branch in reference A's call-to-action
// band. Each path uses pathLength=1 so a stroke-dashoffset animation can draw
// it (see the paint-reveal rules in public-site.css).
const sprig = {
  viewBox: "0 0 210 202",
  paths: [
    "M14 198Q46 96 184 18",
    "M25 169.9C36.8 158.3 32.7 134.9 17.7 116.6C14 139 11.5 161.1 25 169.9",
    "M25 169.9Q22.4 140.4 18.4 121.9",
    "M37.8 146.6C51.4 154.4 69.9 141.8 83 124.6C61.4 125.8 42.1 132 37.8 146.6",
    "M37.8 146.6Q63 135.2 78.5 126.9",
    "M52.2 125.8C65 118.5 66.5 97.9 57.2 79.2C49.2 97.3 42.2 115.5 52.2 125.8",
    "M52.2 125.8Q56.3 100.3 56.7 83.8",
    "M70.8 103.8C81.4 112.7 98.9 104.4 112.2 91.2C93.6 89 76.4 91.6 70.8 103.8",
    "M70.8 103.8Q93.8 97.6 108.1 92.5",
    "M90.6 84.2C103 80.6 107.9 63.6 103.1 46.3C92.9 59.9 83.7 73.7 90.6 84.2",
    "M90.6 84.2Q98.6 63.7 101.8 50",
    "M112.9 65.3C121 74.3 136.5 68.9 149 58.8C133.5 54.7 118.7 55.1 112.9 65.3",
    "M112.9 65.3Q132.8 62.3 145.4 59.5",
    "M137.8 46.9C149 45.8 155.4 32.6 153.5 17.4C142.9 27 133.1 37 137.8 46.9",
    "M137.8 46.9Q147.3 31.1 151.9 20.3",
    "M184 18C192.2 21.5 201.1 14.3 205.4 3.2C194.4 5.7 184.3 9.4 184 18",
    "M184 18Q196.2 10.4 203.2 4.7",
  ],
};

const leaf = {
  viewBox: "0 0 200 200",
  paths: [
    "M10 190Q22 176 34 166",
    "M34 166C96.6 181.3 150 118.9 166.5 35.5C92 66.2 25.4 104.8 34 166",
    "M34 166Q110.4 97.8 153.2 48.5",
    "M68.7 132.3Q95.7 122.4 122.5 117.7",
    "M68.7 132.3Q79.5 106.3 86.6 81.8",
    "M91 109.9Q116 98 140.3 90.8",
    "M91 109.9Q103.5 85.5 112.5 63.1",
    "M113.4 87.6Q134.8 72.1 154.7 60.5",
    "M113.4 87.6Q128.6 66 141.1 46.9",
  ],
};

const variants = { sprig, leaf };

export type BotanicalAccentVariant = keyof typeof variants;

export interface BotanicalAccentProps extends Omit<
  SVGProps<SVGSVGElement>,
  "children"
> {
  variant?: BotanicalAccentVariant;
  /** Stroke width in CSS pixels; it stays constant at every size. */
  strokeWidth?: number;
}

/**
 * Decorative botanical line art. Always hidden from assistive technology;
 * colour comes from `currentColor` (defaults to ink via text utilities).
 */
export function BotanicalAccent({
  variant = "sprig",
  strokeWidth = 1.25,
  className,
  ...props
}: BotanicalAccentProps) {
  const art = variants[variant];

  return (
    <svg
      viewBox={art.viewBox}
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      data-variant={variant}
      className={cn("ks-botanical", className)}
      {...props}
      aria-hidden="true"
      focusable="false"
    >
      {art.paths.map((d) => (
        <path key={d} d={d} pathLength={1} vectorEffect="non-scaling-stroke" />
      ))}
    </svg>
  );
}
