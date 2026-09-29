"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/ui/select";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { roomHref, type RoomTab } from "./search-params";

/** Switches to another room, on the same tab. */
export function RoomSwitcher({
  roomId,
  rooms,
  tab,
}: {
  roomId: string;
  rooms: { id: string; name: string; active: boolean }[];
  tab: RoomTab;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  // Shown before the list has ever opened (the server render included).
  const current = rooms.find((room) => room.id === roomId)?.name;
  return (
    <Select
      disabled={isPending}
      onValueChange={(id) =>
        startTransition(() =>
          router.push(roomHref(id, { zakladka: tab }) as Route),
        )
      }
      value={roomId}
    >
      {/* Looks like a field (border, chevron) so it reads as a choice. */}
      <SelectTrigger
        aria-label="Wybierz gabinet"
        className="font-heading h-auto w-auto max-w-full min-w-0 gap-3 border-[var(--border)] bg-[var(--surface-subtle)] py-1.5 pr-3 pl-3.5 text-xl font-semibold hover:border-[var(--border-strong)] hover:bg-[var(--surface-muted)] data-[state=open]:border-[var(--ring)] sm:text-2xl [&>svg]:size-5 [&>svg]:shrink-0 [&>svg]:opacity-70"
      >
        <span className="min-w-0 truncate">
          <SelectValue>{current}</SelectValue>
        </span>
      </SelectTrigger>
      <SelectContent>
        {rooms.map((room) => (
          <SelectItem key={room.id} value={room.id}>
            {room.active ? room.name : `${room.name} (nieaktywny)`}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
