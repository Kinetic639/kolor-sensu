import type { ElementType, ReactNode } from "react";
import { cn } from "./lib/utils";

// Tabs and filters that are links (the state lives in the URL), so pages
// render them on the server and they work without JavaScript.

export interface LinkTabItem {
  key: string;
  label: string;
  href: string;
  active?: boolean;
  icon?: ReactNode;
  /** A small pill after the label, e.g. a count. */
  badge?: ReactNode;
}

export interface LinkTabsProps {
  items: LinkTabItem[];
  ariaLabel: string;
  /** `segmented`: view switcher; `chips`: a row of filters. */
  variant?: "segmented" | "chips";
  /** The link component, e.g. next/link (defaults to `a`). */
  linkAs?: ElementType;
  className?: string;
}

export function LinkTabs({
  items,
  ariaLabel,
  variant = "segmented",
  linkAs: Link = "a",
  className,
}: LinkTabsProps) {
  const segmented = variant === "segmented";
  return (
    <nav aria-label={ariaLabel} className={className}>
      <ul
        className={cn(
          "flex flex-wrap items-center",
          segmented
            ? "gap-1 rounded-[var(--radius-surface)] bg-[var(--surface-muted)] p-1"
            : "gap-1.5",
        )}
      >
        {items.map((item) => (
          <li key={item.key}>
            <Link
              aria-current={item.active ? "page" : undefined}
              className={cn(
                "inline-flex min-h-9 items-center gap-2 text-xs font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:outline-none",
                segmented
                  ? cn(
                      "rounded-[var(--radius-control)] px-3.5 py-2",
                      item.active
                        ? "bg-[var(--surface)] text-[var(--text)] shadow-sm ring-1 ring-[var(--border)]"
                        : "text-[var(--text-muted)] hover:bg-[color-mix(in_srgb,var(--surface)_60%,transparent)] hover:text-[var(--text)]",
                    )
                  : cn(
                      "rounded-[var(--radius-control)] border px-2.5 py-1.5",
                      item.active
                        ? "border-[var(--primary)] bg-[var(--primary)] text-[var(--primary-foreground)] shadow-sm"
                        : "border-[var(--border)] bg-[var(--surface)] text-[var(--text-muted)] hover:bg-[var(--surface-muted)] hover:text-[var(--text)]",
                    ),
              )}
              href={item.href}
            >
              {item.icon}
              <span>{item.label}</span>
              {item.badge !== undefined ? (
                <span
                  className={cn(
                    "rounded-full px-2 py-0.5 text-[0.625rem] font-semibold",
                    item.active
                      ? segmented
                        ? "bg-[var(--primary-soft)] text-[var(--primary)]"
                        : "bg-[color-mix(in_srgb,white_20%,transparent)] text-inherit"
                      : "bg-[var(--surface-muted)] text-[var(--text-muted)]",
                  )}
                >
                  {item.badge}
                </span>
              ) : null}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
