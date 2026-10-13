"use client";

import { ROW_LINE } from "@repo/ui/detail-page";
import { cn } from "@repo/ui/lib/utils";
import { ChevronRight } from "lucide-react";
import { type ReactNode, useId, useState } from "react";

// A CMS section that folds: DetailSection's look (the thin header row,
// the title and a note), the header a button that opens and closes it.
// Closed, its body is only hidden, never unmounted, so what was typed but
// not saved yet stays.

export function CmsSection({
  title,
  note,
  defaultOpen = false,
  children,
}: {
  title: string;
  note?: ReactNode;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  const id = useId();
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section
      aria-labelledby={`${id}-title`}
      className="border-b border-[var(--border)]"
    >
      <h2 className="m-0">
        <button
          aria-controls={`${id}-body`}
          aria-expanded={open}
          className={cn(
            "flex min-h-8 w-full items-center gap-2 px-3.5 text-left outline-none hover:bg-[var(--surface-muted)] focus-visible:bg-[var(--surface-muted)]",
            open && cn("border-b", ROW_LINE),
          )}
          id={`${id}-title`}
          onClick={() => setOpen((current) => !current)}
          type="button"
        >
          <ChevronRight
            aria-hidden="true"
            className={cn(
              "size-3.5 shrink-0 text-[var(--text-muted)] transition-transform",
              open && "rotate-90",
            )}
          />
          <span className="text-[0.8125rem] font-semibold text-[var(--text)]">
            {title}
          </span>
          {note ? (
            <span className="truncate text-[0.75rem] font-normal text-[var(--text-muted)]">
              {note}
            </span>
          ) : null}
        </button>
      </h2>
      <div hidden={!open} id={`${id}-body`}>
        {children}
      </div>
    </section>
  );
}
