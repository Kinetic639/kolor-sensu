"use client";

import { Check, ChevronDown } from "lucide-react";
import { useRef, useState } from "react";
import { cn } from "../lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "../popover";
import { PageLink as Link } from "../public-site/page-link";

// The bookings table's view picker ("Nadchodzące 42 ▾"): the ready views,
// each a link; how many visits each has is asked for when it opens (once,
// then kept for half a minute: opening it again asks nothing).

const COUNTS_KEPT_MS = 30_000;

export interface VisitViewLink {
  id: string;
  label: string;
  href: string;
  active: boolean;
}

export function VisitViewMenu({
  label,
  total,
  views,
  countViews,
}: {
  /** The view shown, or "Własny widok". */
  label: string;
  total: number;
  views: VisitViewLink[];
  /** How many visits each view has, by its id (a server action). */
  countViews?: () => Promise<Record<string, number>>;
}) {
  const [open, setOpen] = useState(false);
  const [counts, setCounts] = useState<Record<string, number> | null>(null);
  const askedAt = useRef(0);

  return (
    <Popover
      onOpenChange={(next) => {
        setOpen(next);
        if (
          next &&
          countViews &&
          Date.now() - askedAt.current > COUNTS_KEPT_MS
        ) {
          askedAt.current = Date.now();
          countViews()
            .then(setCounts)
            .catch(() => {
              askedAt.current = 0;
              setCounts(null);
            });
        }
      }}
      open={open}
    >
      <PopoverTrigger className="inline-flex h-7 items-center gap-1.5 rounded-[5px] px-1.5 text-[0.8125rem] font-semibold text-[var(--text)] hover:bg-[var(--surface-subtle)] focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:outline-none data-[state=open]:bg-[var(--surface-subtle)]">
        {label}
        <span className="rounded-[4px] bg-[var(--surface-muted)] px-1.5 text-[0.7rem] font-medium text-[var(--text-muted)] tabular-nums">
          {total}
        </span>
        <ChevronDown
          aria-hidden="true"
          className="size-3.5 text-[var(--text-muted)]"
        />
      </PopoverTrigger>
      <PopoverContent align="start" className="w-60 p-1 text-[0.8125rem]">
        <p className="px-2 py-1 text-[0.7rem] text-[var(--text-muted)]">
          Widoki
        </p>
        <ul className="grid gap-px">
          {views.map((view) => (
            <li key={view.id}>
              <Link
                aria-current={view.active ? "true" : undefined}
                className={cn(
                  "flex h-7 items-center gap-2 rounded-[5px] px-2 hover:bg-[var(--surface-subtle)] focus-visible:bg-[var(--surface-subtle)] focus-visible:outline-none",
                  view.active && "font-semibold text-[var(--primary)]",
                )}
                href={view.href}
                onClick={() => setOpen(false)}
                scroll={false}
              >
                <Check
                  aria-hidden="true"
                  className={cn("size-3.5", !view.active && "opacity-0")}
                />
                {view.label}
                <span className="ml-auto text-[0.7rem] font-normal text-[var(--text-muted)] tabular-nums">
                  {counts ? (counts[view.id] ?? "") : ""}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </PopoverContent>
    </Popover>
  );
}
