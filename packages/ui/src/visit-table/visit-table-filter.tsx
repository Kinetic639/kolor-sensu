"use client";

import { Check, ChevronDown } from "lucide-react";
import { PageLink as Link } from "../public-site/page-link";
import { Button } from "../button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../dropdown-menu";

// A filter of the bookings table ("Status: Odwołane ▾"): a menu of links,
// each one the table's address with that value, so the server renders it.

export interface VisitTableFilterOption {
  label: string;
  href: string;
  active: boolean;
}

export function VisitTableFilter({
  label,
  options,
}: {
  label: string;
  options: VisitTableFilterOption[];
}) {
  const active = options.find((option) => option.active);
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="sm" variant="outline">
          <span className="text-[var(--text-muted)]">{label}:</span>
          {active?.label ?? options[0]?.label}
          <ChevronDown aria-hidden="true" className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        {options.map((option) => (
          <DropdownMenuItem asChild key={option.href}>
            <Link
              aria-current={option.active ? "true" : undefined}
              href={option.href}
            >
              <Check
                aria-hidden="true"
                className={option.active ? "size-4" : "size-4 opacity-0"}
              />
              {option.label}
            </Link>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
