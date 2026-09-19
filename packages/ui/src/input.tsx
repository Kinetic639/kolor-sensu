import type { InputHTMLAttributes } from "react";
import { cn } from "./lib/utils";

export type InputProps = InputHTMLAttributes<HTMLInputElement>;

export function Input({ className, type = "text", ...props }: InputProps) {
  return (
    <input
      className={cn(
        "flex h-10 w-full rounded-[var(--radius-control)] border border-[var(--border)] bg-[var(--surface)] px-3.5 py-2 text-sm text-[var(--text)] shadow-[0_1px_2px_rgb(15_39_71/0.03)] transition-[border-color,box-shadow] outline-none placeholder:text-[var(--text-subtle)] focus-visible:border-[var(--ring)] focus-visible:ring-3 focus-visible:ring-[color-mix(in_srgb,var(--ring)_18%,transparent)] disabled:cursor-not-allowed disabled:bg-[var(--surface-muted)] disabled:text-[var(--text-muted)] aria-invalid:border-[var(--danger)] aria-invalid:ring-3 aria-invalid:ring-[color-mix(in_srgb,var(--danger)_15%,transparent)]",
        className,
      )}
      type={type}
      {...props}
    />
  );
}
