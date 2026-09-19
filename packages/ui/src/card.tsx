import type { HTMLAttributes } from "react";
import { cn } from "./lib/utils";

export type CardProps = HTMLAttributes<HTMLDivElement>;

export function Card({ className, ...props }: CardProps) {
  return (
    <section
      className={cn(
        "rounded-[var(--radius-surface)] border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[var(--shadow-surface)]",
        className,
      )}
      {...props}
    />
  );
}
