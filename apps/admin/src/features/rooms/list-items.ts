import type { AdminRoomSummary } from "@repo/contracts";
import { weekdaysLabel } from "@repo/scheduling";
import { resourceColors } from "@repo/ui/resource-colors";
import type { ResourceListItem } from "@repo/ui/resource-list";

/** The rooms as rows of the admin list; the filters are their tags. */
export function toRoomListItems(rooms: AdminRoomSummary[]): ResourceListItem[] {
  return rooms.map((room) => {
    // What the site shows: an active room, shown, with a published profile.
    const onSite =
      room.active && room.publiclyVisible && room.publicProfilePublished;
    const days = weekdaysLabel(room.openWeekdays);
    return {
      id: room.id,
      href: `/gabinety/${room.id}`,
      name: room.name,
      description: room.locationName,
      color: resourceColors(room.color, room.id).accent,
      facts: [
        days ? `Otwarty ${days}` : "Bez godzin otwarcia",
        `Pojemność ${room.capacity}`,
      ],
      statuses: [
        room.active
          ? { label: "Aktywny", tone: "success" as const }
          : { label: "Nieaktywny", tone: "neutral" as const },
        ...(onSite ? [{ label: "Na stronie", tone: "info" as const }] : []),
      ],
      tags: [
        room.active ? "active" : "inactive",
        ...(onSite ? ["on-site"] : []),
      ],
      muted: !room.active,
    };
  });
}
