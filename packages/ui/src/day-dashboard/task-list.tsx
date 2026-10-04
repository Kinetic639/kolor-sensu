import { ArrowRight } from "lucide-react";
import { cn } from "../lib/utils";
import { PageLink as Link } from "../public-site/page-link";

// What needs doing (the dashboard, R14): a refund to make, a reservation to
// be paid soon, a profile to review. One line each; nothing is done from
// here: each leads to where it is (the booking, the specialist). Nothing
// to do is one line too.

export interface TaskItem {
  id: string;
  title: string;
  detail?: string;
  tone: "danger" | "warning" | "info" | "neutral";
  /** Where it is done (the booking, the profile). */
  href: string;
  /** What it leads to, on its button: `Rezerwacja`, `Specjalista`. */
  target: string;
}

const DOT = {
  danger: "bg-[var(--danger)]",
  warning: "bg-[var(--warning)]",
  info: "bg-[var(--info)]",
  neutral: "bg-[var(--text-subtle)]",
};

const BUTTON =
  "inline-flex h-7 items-center gap-1 rounded-[5px] border border-[var(--border)] bg-[var(--surface)] px-2 text-[0.75rem] font-medium whitespace-nowrap text-[var(--text)] hover:bg-[var(--surface-subtle)] focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:outline-none";

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
            <span className="block truncate text-[0.8125rem] font-semibold text-[var(--text)]">
              {item.title}
            </span>
            {item.detail ? (
              <span className="block truncate text-[0.75rem] text-[var(--text-muted)]">
                {item.detail}
              </span>
            ) : null}
          </span>
          <Link
            aria-label={`${item.target}: ${item.title}`}
            className={BUTTON}
            href={item.href}
          >
            {item.target}
            <ArrowRight aria-hidden="true" className="size-3.5" />
          </Link>
        </li>
      ))}
    </ul>
  );
}
