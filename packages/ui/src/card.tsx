import type { HTMLAttributes } from "react";
import { cn } from "./lib/utils";

export type CardProps = HTMLAttributes<HTMLDivElement>;

export function Card({ className, ...props }: CardProps) {
  return (
    <section
      className={cn(
        "rounded-[var(--radius-surface)] border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[var(--shadow-surface)]",
        className,
      )}
      {...props}
    />
  );
}

export function CardHeader({ className, ...props }: CardProps) {
  return <div className={cn("mb-4 space-y-1", className)} {...props} />;
}

export function CardTitle({ className, ...props }: CardProps) {
  return (
    <h3
      className={cn(
        "font-heading text-xl leading-tight font-semibold text-[var(--text)]",
        className,
      )}
      {...props}
    />
  );
}

export function CardDescription({ className, ...props }: CardProps) {
  return (
    <p
      className={cn("text-sm text-[var(--text-muted)]", className)}
      {...props}
    />
  );
}

export function CardContent({ className, ...props }: CardProps) {
  return <div className={cn("space-y-3", className)} {...props} />;
}

export function CardFooter({ className, ...props }: CardProps) {
  return (
    <div
      className={cn(
        "mt-5 flex items-center gap-3 border-t border-[var(--border)] pt-4",
        className,
      )}
      {...props}
    />
  );
}
