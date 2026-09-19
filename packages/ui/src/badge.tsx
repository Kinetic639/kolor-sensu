import { cva, type VariantProps } from "class-variance-authority";
import type { HTMLAttributes } from "react";
import { cn } from "./lib/utils";

export const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold leading-none",
  {
    variants: {
      variant: {
        neutral:
          "border-[var(--border)] bg-[var(--surface-muted)] text-[var(--text-muted)]",
        primary:
          "border-transparent bg-[var(--primary-soft)] text-[var(--primary)]",
        success:
          "border-transparent bg-[var(--success-soft)] text-[var(--success)]",
        warning:
          "border-transparent bg-[var(--warning-soft)] text-[var(--warning-foreground)]",
        danger:
          "border-transparent bg-[var(--danger-soft)] text-[var(--danger)]",
        info: "border-transparent bg-[var(--info-soft)] text-[var(--info)]",
        lilac: "border-transparent bg-[var(--accent-lilac)] text-[#6d4bd1]",
      },
    },
    defaultVariants: {
      variant: "neutral",
    },
  },
);

export interface BadgeProps
  extends HTMLAttributes<HTMLSpanElement>, VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}
