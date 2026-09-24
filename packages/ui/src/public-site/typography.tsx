import { Slot } from "@radix-ui/react-slot";
import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "../lib/utils";

export interface SectionEyebrowProps extends HTMLAttributes<HTMLParagraphElement> {
  asChild?: boolean;
}

/** Widely tracked caps above a section heading: "NASZA OFERTA". */
export function SectionEyebrow({
  asChild = false,
  className,
  ...props
}: SectionEyebrowProps) {
  const Comp = asChild ? Slot : "p";

  return (
    <Comp
      className={cn(
        "font-body text-eyebrow text-text-muted uppercase",
        className,
      )}
      {...props}
    />
  );
}

const headingSizes = {
  display: "text-display",
  h2: "text-h2",
  h3: "text-h3",
} as const;

const defaultSize = { h1: "display", h2: "h2", h3: "h3", h4: "h3" } as const;

export interface EditorialHeadingProps extends HTMLAttributes<HTMLHeadingElement> {
  as?: "h1" | "h2" | "h3" | "h4";
  /** Visual size, independent of the heading level. */
  size?: keyof typeof headingSizes;
  /**
   * Second line in dusty pink, as in the hero: "Więcej zrozumienia." /
   * "Więcej sensu." Only for display and h2 sizes (pink needs ≥ 24px).
   */
  accent?: ReactNode;
}

/** Serif editorial heading used for every section title on the public site. */
export function EditorialHeading({
  as: Tag = "h2",
  size,
  accent,
  className,
  children,
  ...props
}: EditorialHeadingProps) {
  return (
    <Tag
      className={cn(
        "font-display text-ink text-balance",
        headingSizes[size ?? defaultSize[Tag]],
        className,
      )}
      {...props}
    >
      {children}
      {accent ? <span className="text-pink block">{accent}</span> : null}
    </Tag>
  );
}
