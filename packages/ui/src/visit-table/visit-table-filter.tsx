"use client";

import { Check, ChevronDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../dropdown-menu";
import { cn } from "../lib/utils";
import { PageLink as Link } from "../public-site/page-link";

// A filter of the bookings table ("Status: Odwołane ▾"): a small menu of
// links, each one the table's address with that value, so the server
// renders the result. Highlighted while it narrows the table.

export interface VisitTableFilterOption {
  label: string;
  href: string;
  active: boolean;
}

export function VisitTableFilter({
  label,
  options,
  highlighted = false,
}: {
  label: string;
  options: VisitTableFilterOption[];
  highlighted?: boolean;
}) {
  const active = options.find((option) => option.active) ?? options[0];
  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger
        className={cn(
          "inline-flex h-8 items-center gap-1 rounded-[var(--radius-control)] border px-2.5 text-[0.8125rem] whitespace-nowrap focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:outline-none data-[state=open]:border-[var(--border-strong)]",
          highlighted
            ? "border-[color-mix(in_srgb,var(--primary)_40%,transparent)] bg-[var(--primary-soft)] text-[var(--primary)]"
            : "border-[var(--border)] bg-[var(--surface)] text-[var(--text)] hover:border-[var(--border-strong)]",
        )}
      >
        {/* Unused, only its name ("Status"); in use, also its value. */}
        {highlighted ? (
          <>
            <span>{label}:</span>
            <span className="font-semibold">{active?.label}</span>
          </>
        ) : (
          <>
            <span>{label}</span>
            <span className="sr-only">: {active?.label}</span>
          </>
        )}
        <ChevronDown aria-hidden="true" className="size-3.5 opacity-70" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-44">
        {options.map((option) => (
          <DropdownMenuItem asChild key={option.href}>
            <Link
              aria-current={option.active ? "true" : undefined}
              className="text-[0.8125rem]"
              href={option.href}
            >
              <Check
                aria-hidden="true"
                className={cn("size-3.5", !option.active && "opacity-0")}
              />
              {option.label}
            </Link>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
