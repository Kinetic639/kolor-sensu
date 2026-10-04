"use client";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@repo/ui/dropdown-menu";
import { Check, ChevronDown } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { roomHref, type RoomTab } from "./search-params";

// The room's name in its page's bar, as the way to another room: a click
// lists the centre's rooms, each a link to the same tab of its page.

export function RoomSwitcher({
  roomId,
  name,
  rooms,
  tab,
}: {
  roomId: string;
  /** The room shown. */
  name: string;
  rooms: { id: string; name: string; active: boolean }[];
  tab: RoomTab;
}) {
  if (rooms.length < 2) return <>{name}</>;
  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger
        title="Wybierz inny gabinet"
        className="-mx-1 inline-flex max-w-[min(70vw,32rem)] items-center gap-1 rounded-[5px] px-1 py-0.5 text-left hover:bg-[var(--surface-muted)] focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:outline-none data-[state=open]:bg-[var(--surface-muted)]"
      >
        <span className="truncate">{name}</span>
        <ChevronDown
          aria-hidden="true"
          className="size-3.5 shrink-0 text-[var(--text-muted)]"
        />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-56">
        <DropdownMenuLabel className="text-[0.6875rem] text-[var(--text-muted)]">
          Gabinety
        </DropdownMenuLabel>
        {rooms.map((room) => (
          <DropdownMenuItem asChild key={room.id}>
            <Link
              aria-current={room.id === roomId ? "page" : undefined}
              href={roomHref(room.id, { zakladka: tab }) as Route}
            >
              <Check
                aria-hidden="true"
                className={room.id === roomId ? "size-4" : "invisible size-4"}
              />
              {room.active ? room.name : `${room.name} (nieaktywny)`}
            </Link>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
