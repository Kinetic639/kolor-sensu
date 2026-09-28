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
      <SelectTrigger
        aria-label="Wybierz gabinet"
        className="font-heading h-auto min-w-0 border-0 px-0 py-0 text-xl font-semibold shadow-none focus-visible:ring-2 sm:text-2xl"
      >
        <SelectValue>{current}</SelectValue>
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
