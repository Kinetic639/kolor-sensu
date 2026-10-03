import type { ReactNode } from "react";
import { cn } from "../lib/utils";
import { PageLink as Link } from "../public-site/page-link";

// What needs doing (the dashboard, R14): a refund to make, a reservation to
// be paid soon, a profile to review. One line each, its action beside it;
// nothing to do is one line too.

export interface TaskItem {
  id: string;
  title: string;
  detail?: string;
  tone: "danger" | "warning" | "info" | "neutral";
  /** Its action (a button, a link). */
  action?: ReactNode;
  /** Where the title leads (the booking, the profile). */
  href?: string;
}

const DOT = {
  danger: "bg-[var(--danger)]",
  warning: "bg-[var(--warning)]",
  info: "bg-[var(--info)]",
  neutral: "bg-[var(--text-subtle)]",
};

export function TaskList({ items }: { items: TaskItem[] }) {
  if (!items.length) {
    return (
      <p className="px-3 py-3 text-[0.8125rem] text-[var(--text-muted)]">
        Nic nie czeka. Wszystko załatwione.
      </p>
    );
  }
  return (
    <ul aria-label="Do zrobienia">
      {items.map((item) => (
        <li
          className="grid grid-cols-[8px_minmax(0,1fr)_auto] items-center gap-2.5 border-b border-[var(--border)] px-3 py-2 last:border-b-0"
          key={item.id}
        >
          <span
            aria-hidden="true"
            className={cn("size-2 rounded-full", DOT[item.tone])}
          />
          <span className="min-w-0">
            {item.href ? (
              <Link
                className="block truncate text-[0.8125rem] font-semibold text-[var(--text)] hover:underline focus-visible:underline focus-visible:outline-none"
                href={item.href}
              >
                {item.title}
              </Link>
            ) : (
              <span className="block truncate text-[0.8125rem] font-semibold text-[var(--text)]">
                {item.title}
              </span>
            )}
            {item.detail ? (
              <span className="block truncate text-[0.75rem] text-[var(--text-muted)]">
                {item.detail}
              </span>
            ) : null}
          </span>
          {item.action ? <span className="shrink-0">{item.action}</span> : null}
        </li>
      ))}
    </ul>
  );
}
