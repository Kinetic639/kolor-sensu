import Image from "next/image";
import Link from "next/link";
import { cn } from "../lib/utils";

/** The mark for headers (apps/web/public/brand, generate:brand). */
export const logoMarkSrc = "/brand/logo-mark.png";
// Its pixel size (2x of the largest rendered height).
const MARK = { width: 106, height: 96 };

export interface SiteLogoProps {
  href?: string;
  /** Second line under the name, e.g. in the footer. */
  tagline?: string;
  size?: "md" | "lg";
  className?: string;
}

const sizes = {
  md: { mark: 40, name: "text-[1.1875rem]" },
  lg: { mark: 48, name: "text-[1.375rem]" },
} as const;

/**
 * The owl mark and the name, linking home. The link's text is the name, so
 * the mark is decorative (alt="").
 */
export function SiteLogo({
  href = "/",
  tagline,
  size = "md",
  className,
}: SiteLogoProps) {
  const { mark, name } = sizes[size];
  return (
    <Link
      href={href}
      className={cn(
        "focus-visible:outline-ring inline-flex shrink-0 items-center gap-2.5 rounded-sm focus-visible:outline-2 focus-visible:outline-offset-4",
        className,
      )}
    >
      <Image
        src={logoMarkSrc}
        alt=""
        width={Math.round((mark * MARK.width) / MARK.height)}
        height={mark}
        loading="eager"
        className="shrink-0"
      />
      <span className="grid leading-tight">
        <span
          className={cn(
            "font-body text-ink font-semibold tracking-[-0.01em]",
            name,
          )}
        >
          Kolor Sensu
        </span>
        {tagline ? (
          <span className="text-text-muted text-[0.75rem]">{tagline}</span>
        ) : null}
      </span>
    </Link>
  );
}
