import { Button } from "@repo/ui/button";
import { Card } from "@repo/ui/card";
import { LinkTabs } from "@repo/ui/link-tabs";
import { resourceColors } from "@repo/ui/resource-colors";
import { StatusBadge } from "@repo/ui/portal-content";
import { ArrowLeft, Building2, Clock } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
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
    <Card className="p-4 sm:p-5">
      <h1 className="sr-only">{room.name}</h1>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-3.5">
          <span
            aria-hidden="true"
            className="flex size-12 shrink-0 items-center justify-center rounded-full text-white"
            // The room's colour (or its automatic one).
            style={{
              backgroundColor: resourceColors(room.color, room.id).accent,
            }}
          >
            <Building2 className="size-6" />
          </span>
          <div className="grid min-w-0 gap-1">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
              <span className="text-sm text-[var(--text-muted)]">Gabinet:</span>
              <RoomSwitcher roomId={room.id} rooms={model.rooms} tab={tab} />
              <Link
                className="inline-flex items-center gap-1 rounded-full border border-[color-mix(in_srgb,var(--primary)_30%,transparent)] bg-[var(--primary-soft)] px-2.5 py-0.5 text-xs font-semibold text-[var(--primary)] hover:border-[var(--primary)] focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:outline-none"
                href={roomHref(room.id, { zakladka: "godziny" }) as Route}
              >
                <Clock aria-hidden="true" className="size-3.5" />
                {model.openingHoursLabel ?? "Bez godzin otwarcia"}
              </Link>
            </div>
            <p className="text-sm text-[var(--text-muted)]">
              {[
                model.locationName,
                model.address,
                `Pojemność: ${peopleLabel(room.capacity)}`,
              ]
                .filter(Boolean)
                .join(" · ")}
            </p>
            <div className="flex flex-wrap gap-2 pt-1">
              <StatusBadge tone={room.active ? "success" : "neutral"}>
                {room.active ? "Aktywny" : "Nieaktywny"}
              </StatusBadge>
              <StatusBadge tone={model.onSite ? "success" : "neutral"}>
                {model.onSite ? "Widoczny na stronie" : "Ukryty na stronie"}
              </StatusBadge>
            </div>
          </div>
        </div>
        <Button asChild size="sm" variant="secondary">
          <Link href="/gabinety">
            <ArrowLeft aria-hidden="true" className="size-4" />
            Wszystkie gabinety
          </Link>
        </Button>
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
