"use client";

import { ArrowDownUp, Check } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../dropdown-menu";
import { cn } from "../lib/utils";
import { PageLink as Link } from "../public-site/page-link";

// "Sortuj: Nazwisko ▾": the orders a roster can take, each a link (the
// address holds it, the server sorts).

export interface SortOption {
  key: string;
  label: string;
  href: string;
  active: boolean;
}

export function SortMenu({ options }: { options: SortOption[] }) {
  const current = options.find((one) => one.active) ?? options[0];
  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger
        aria-label={`Sortuj: ${current?.label}`}
        className="inline-flex h-7 items-center gap-1.5 rounded-[6px] border border-[var(--border)] bg-[var(--surface)] px-2 text-[0.8125rem] text-[var(--text)] hover:bg-[var(--surface-subtle)] focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:outline-none data-[state=open]:bg-[var(--surface-muted)]"
      >
        <ArrowDownUp
          aria-hidden="true"
          className="size-3.5 text-[var(--text-muted)]"
        />
        <span className="hidden text-[var(--text-muted)] sm:inline">
          Sortuj:
        </span>
        {current?.label}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-48">
        {options.map((option) => (
          <DropdownMenuItem asChild key={option.key}>
            <Link
              aria-current={option.active ? "true" : undefined}
              href={option.href}
              scroll={false}
            >
              <Check
                aria-hidden="true"
                className={cn("size-4", !option.active && "invisible")}
              />
              {option.label}
            </Link>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
