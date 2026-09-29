import { Card } from "@repo/ui/card";
import { LinkTabs } from "@repo/ui/link-tabs";
import { resourceColors } from "@repo/ui/resource-colors";
import { StatusBadge } from "@repo/ui/portal-content";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@repo/ui/tooltip";
import { Clock, MapPin } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import type { CSSProperties } from "react";
import type { AdminRoomModel } from "./loaders";
import { RoomSwitcher } from "./room-switcher";
import { roomHref, type RoomTab } from "./search-params";

const TABS: { key: RoomTab; label: string; badge?: string }[] = [
  { key: "grafik", label: "Grafik", badge: "Tydzień" },
  { key: "godziny", label: "Godziny otwarcia" },
  { key: "profil", label: "Profil publiczny" },
  { key: "ustawienia", label: "Ustawienia" },
];

/** "1 osoba", "3 osoby", "12 osób". */
function peopleLabel(count: number) {
  if (count === 1) return "1 osoba";
  const few =
    count % 10 >= 2 &&
    count % 10 <= 4 &&
    (count % 100 < 12 || count % 100 > 14);
  return `${count} ${few ? "osoby" : "osób"}`;
}

/** The room's card: which room, where, when it is open, and its sections. */
export function RoomHeader({
  model,
  tab,
}: {
  model: AdminRoomModel;
  tab: RoomTab;
}) {
  const { room } = model;
  return (
    // A thick left edge in the room's colour, as its blocks in schedules.
    <Card
      className="border-l-[6px] border-l-[var(--room-accent)] p-4 sm:p-5"
      style={
        {
          "--room-accent": resourceColors(room.color, room.id).accent,
        } as CSSProperties
      }
    >
      <h1 className="sr-only">{room.name}</h1>
      <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
        <div className="grid min-w-0 gap-1.5">
          <div className="flex flex-wrap gap-2">
            <StatusBadge tone={room.active ? "success" : "neutral"}>
              {room.active ? "Aktywny" : "Nieaktywny"}
            </StatusBadge>
            <StatusBadge tone={model.onSite ? "success" : "neutral"}>
              {model.onSite ? "Widoczny na stronie" : "Ukryty na stronie"}
            </StatusBadge>
          </div>
          <RoomSwitcher roomId={room.id} rooms={model.rooms} tab={tab} />
        </div>

        <div className="grid justify-items-start gap-1.5 text-sm sm:justify-items-end">
          <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[var(--text-muted)]">
            <MapPin aria-hidden="true" className="size-4 shrink-0" />
            {model.address ? (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      className="rounded font-semibold text-[var(--text)] underline decoration-[var(--border-strong)] decoration-dotted underline-offset-4 focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:outline-none"
                      type="button"
                    >
                      {model.locationName}
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>{model.address}</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ) : (
              <span className="font-semibold text-[var(--text)]">
                {model.locationName}
              </span>
            )}
            <span aria-hidden="true">·</span>
            <span>{peopleLabel(room.capacity)}</span>
          </p>
          <Link
            className="inline-flex items-center gap-1 rounded-full border border-[color-mix(in_srgb,var(--primary)_30%,transparent)] bg-[var(--primary-soft)] px-2.5 py-0.5 text-xs font-semibold text-[var(--primary)] hover:border-[var(--primary)] focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:outline-none"
            href={roomHref(room.id, { zakladka: "godziny" }) as Route}
          >
            <Clock aria-hidden="true" className="size-3.5" />
            {model.openingHoursLabel ?? "Bez godzin otwarcia"}
          </Link>
        </div>
      </div>
      <LinkTabs
        ariaLabel="Sekcje gabinetu"
        className="mt-4 border-b border-[var(--border)]"
        items={TABS.map((one) => ({
          key: one.key,
          label: one.label,
          badge: one.badge,
          href: roomHref(room.id, { zakladka: one.key }),
          active: one.key === tab,
        }))}
        linkAs={Link}
        variant="underline"
      />
    </Card>
  );
}
