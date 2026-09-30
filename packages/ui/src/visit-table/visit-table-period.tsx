"use client";

import { Check, ChevronDown } from "lucide-react";
import { useQueryStates } from "nuqs";
import { useState, useTransition, type FormEvent } from "react";
import { cn } from "../lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "../popover";
import { PageLink as Link } from "../public-site/page-link";
import { parseAsDay, visitTableParsers } from "./params";

// The bookings table's "Termin" filter: ready ranges (links, rendered by
// the server) and days of one's own (two dates, sent to the address).

export interface VisitTablePeriodOption {
  label: string;
  href: string;
  active: boolean;
}

export function VisitTablePeriodFilter({
  options,
  from,
  to,
  highlighted,
}: {
  options: VisitTablePeriodOption[];
  /** Days of one's own, if set (`2026-10-01`). */
  from: string | null;
  to: string | null;
  highlighted: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [, setParams] = useQueryStates(
    {
      od: parseAsDay,
      do: parseAsDay,
      zakres: visitTableParsers.zakres,
      strona: visitTableParsers.strona,
    },
    { shallow: false, startTransition, clearOnDefault: true },
  );
  const own = from || to;
  const label = own
    ? `${from ? shortDate(from) : "…"} – ${to ? shortDate(to) : "…"}`
    : (options.find((option) => option.active) ?? options[0])?.label;

  const apply = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const od = String(form.get("od") ?? "") || null;
    const doDay = String(form.get("do") ?? "") || null;
    const [first, last] = od && doDay && od > doDay ? [doDay, od] : [od, doDay];
    void setParams({ od: first, do: last, zakres: null, strona: null });
    setOpen(false);
  };

  return (
    <Popover onOpenChange={setOpen} open={open}>
      <PopoverTrigger
        className={cn(
          "inline-flex h-8 items-center gap-1 rounded-[var(--radius-control)] border px-2.5 text-[0.8125rem] whitespace-nowrap focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:outline-none data-[state=open]:border-[var(--border-strong)]",
          highlighted
            ? "border-[color-mix(in_srgb,var(--primary)_40%,transparent)] bg-[var(--primary-soft)] text-[var(--primary)]"
            : "border-[var(--border)] bg-[var(--surface)] text-[var(--text)] hover:border-[var(--border-strong)]",
          pending && "opacity-70",
        )}
      >
        <span className={highlighted ? undefined : "text-[var(--text-muted)]"}>
          Termin:
        </span>
        <span className="font-semibold">{label}</span>
        <ChevronDown aria-hidden="true" className="size-3.5 opacity-70" />
      </PopoverTrigger>
      <PopoverContent align="start" className="w-72 p-1.5">
        <ul aria-label="Gotowe zakresy" className="grid">
          {options.map((option) => (
            <li key={option.href}>
              <Link
                aria-current={option.active && !own ? "true" : undefined}
                className="flex h-8 items-center gap-2 rounded-[var(--radius-control)] px-2 text-[0.8125rem] hover:bg-[var(--primary-soft)] hover:text-[var(--primary)] focus-visible:bg-[var(--primary-soft)] focus-visible:outline-none"
                href={option.href}
                onClick={() => setOpen(false)}
              >
                <Check
                  aria-hidden="true"
                  className={cn(
                    "size-3.5",
                    !(option.active && !own) && "opacity-0",
                  )}
                />
                {option.label}
              </Link>
            </li>
          ))}
        </ul>
        <form
          className="mt-1.5 grid gap-2 border-t border-[var(--border)] px-2 pt-2.5 pb-1.5"
          onSubmit={apply}
        >
          <p className="text-xs font-semibold text-[var(--text-muted)]">
            Własny zakres dat
          </p>
          <div className="grid grid-cols-2 gap-2">
            <label className="grid gap-1 text-xs text-[var(--text-muted)]">
              Od
              <input
                className="h-8 rounded-[var(--radius-control)] border border-[var(--border)] bg-[var(--surface)] px-2 text-[0.8125rem] text-[var(--text)] focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:outline-none"
                defaultValue={from ?? ""}
                name="od"
                type="date"
              />
            </label>
            <label className="grid gap-1 text-xs text-[var(--text-muted)]">
              Do
              <input
                className="h-8 rounded-[var(--radius-control)] border border-[var(--border)] bg-[var(--surface)] px-2 text-[0.8125rem] text-[var(--text)] focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:outline-none"
                defaultValue={to ?? ""}
                name="do"
                type="date"
              />
            </label>
          </div>
          <button
            className="h-8 rounded-[var(--radius-control)] bg-[var(--primary)] px-3 text-[0.8125rem] font-semibold text-[var(--primary-foreground)] hover:bg-[var(--primary-hover)] focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:outline-none"
            type="submit"
          >
            Pokaż
          </button>
        </form>
      </PopoverContent>
    </Popover>
  );
}

/** `01.10.2026` */
function shortDate(date: string) {
  return date.split("-").reverse().join(".");
}
