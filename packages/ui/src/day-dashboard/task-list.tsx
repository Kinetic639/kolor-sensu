import type { NotificationIcon } from "@repo/scheduling";
import { ArrowRight } from "lucide-react";
import { cn } from "../lib/utils";
import { KIND_ICONS, TONE_SQUARES } from "../notifications/kinds";
import { PageLink as Link } from "../public-site/page-link";
import { SpecialistAvatar } from "../specialists/specialist-parts";

// What needs doing (the dashboard, R14): a refund to make, a reservation to
// be paid soon, a profile to review. One line each, led by whom it is
// about (the specialist's picture) or by its kind in its tone, as the
// notifications show it; nothing is done from here: each leads to where it
// is (the booking, the specialist). Nothing to do is one line too.

export interface TaskItem {
  id: string;
  title: string;
  detail?: string;
  tone: "danger" | "warning" | "info" | "neutral";
  /** Its kind, as a small square in its tone (without a person). */
  icon?: NotificationIcon;
  /** Whom it is about: their picture leads the line. */
  person?: {
    id: string;
    name: string;
    initials: string;
    avatarUrl: string | null;
    color: string | null;
  };
  /** Where it is done (the booking, the profile). */
  href: string;
  /** What it leads to, on its button: `Rezerwacja`, `Profil`. */
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

function Lead({ item }: { item: TaskItem }) {
  if (item.person) {
    return <SpecialistAvatar row={item.person} size={26} />;
  }
  if (item.icon) {
    const Icon = KIND_ICONS[item.icon];
    return (
      <span
        aria-hidden="true"
        className={cn(
          "grid size-[26px] place-items-center rounded-[6px]",
          TONE_SQUARES[item.tone],
        )}
      >
        <Icon className="size-3.5" />
      </span>
    );
  }
  return (
    <span
      aria-hidden="true"
      className={cn("size-2 justify-self-center rounded-full", DOT[item.tone])}
    />
  );
}

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
          className="grid grid-cols-[26px_minmax(0,1fr)_auto] items-center gap-2.5 border-b border-[var(--border)] px-3 py-2 last:border-b-0"
          key={item.id}
        >
          <Lead item={item} />
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
