import type { AdminRoomSummary } from "@repo/contracts";
import { Card } from "@repo/ui/card";
import { StatusBadge } from "@repo/ui/portal-content";
import { ChevronRight } from "lucide-react";
import Link from "next/link";

/** Each room links to its page, where its details, profile and photos are edited. */
export function RoomsList({ rooms }: { rooms: AdminRoomSummary[] }) {
  return (
    <ul className="space-y-3">
      {rooms.map((room) => (
        <li key={room.id}>
          <Card className="relative flex flex-wrap items-center justify-between gap-3 transition-colors focus-within:ring-2 focus-within:ring-[var(--ring)] hover:border-[var(--border-strong)]">
            <div>
              <Link
                className="font-heading font-semibold text-[var(--text)] outline-none after:absolute after:inset-0 after:content-['']"
                href={`/gabinety/${room.id}`}
              >
                {room.name}
              </Link>
              <p className="text-sm text-[var(--text-muted)]">
                {room.locationName} &middot; pojemność {room.capacity}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge tone={room.active ? "success" : "neutral"}>
                {room.active ? "Aktywny" : "Nieaktywny"}
              </StatusBadge>
              <StatusBadge
                tone={
                  room.publiclyVisible && room.publicProfilePublished
                    ? "success"
                    : "neutral"
                }
              >
                {room.publiclyVisible && room.publicProfilePublished
                  ? "Widoczny na stronie"
                  : "Ukryty na stronie"}
              </StatusBadge>
              <ChevronRight
                className="size-5 text-[var(--text-muted)]"
                aria-hidden="true"
              />
            </div>
          </Card>
        </li>
      ))}
    </ul>
  );
}
