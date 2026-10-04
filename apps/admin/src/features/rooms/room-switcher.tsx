import { DetailSwitcher } from "@repo/ui/detail-page";
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
  return (
    <DetailSwitcher
      currentId={roomId}
      items={rooms.map((room) => ({
        id: room.id,
        name: room.active ? room.name : `${room.name} (nieaktywny)`,
        href: roomHref(room.id, { zakladka: tab }),
      }))}
      label="Gabinety"
      name={name}
      title="Wybierz inny gabinet"
    />
  );
}
