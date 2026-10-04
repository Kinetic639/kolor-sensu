"use client";

import { Check, ChevronDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "../dropdown-menu";
import { PageLink as Link } from "../public-site/page-link";

// The name in a page's bar as the way to another of its kind (a room, a
// service): a click lists them, each a link to the same tab of its page.
// Alone, the name only.

export function DetailSwitcher({
  currentId,
  name,
  items,
  label,
  title,
}: {
  currentId: string;
  /** The one shown. */
  name: string;
  /** `name` already says when one is off (`… (nieaktywny)`). */
  items: { id: string; name: string; href: string }[];
  /** Above the list: `Gabinety`. */
  label: string;
  /** On the name: `Wybierz inny gabinet`. */
  title: string;
}) {
  if (items.length < 2) return <>{name}</>;
  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger
        className="-mx-1 inline-flex max-w-[min(70vw,32rem)] items-center gap-1 rounded-[5px] px-1 py-0.5 text-left hover:bg-[var(--surface-muted)] focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:outline-none data-[state=open]:bg-[var(--surface-muted)]"
        title={title}
      >
        <span className="truncate">{name}</span>
        <ChevronDown
          aria-hidden="true"
          className="size-3.5 shrink-0 text-[var(--text-muted)]"
        />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-56">
        <DropdownMenuLabel className="text-[0.6875rem] text-[var(--text-muted)]">
          {label}
        </DropdownMenuLabel>
        {items.map((item) => (
          <DropdownMenuItem asChild key={item.id}>
            <Link
              aria-current={item.id === currentId ? "page" : undefined}
              href={item.href}
            >
              <Check
                aria-hidden="true"
                className={
                  item.id === currentId ? "size-4" : "invisible size-4"
                }
              />
              {item.name}
            </Link>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
