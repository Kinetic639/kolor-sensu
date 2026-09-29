import { toRoomListItems } from "@/features/rooms/list-items";
import { loadAdminRooms } from "@/features/rooms/loaders";
import { NewRoomButton } from "@/features/rooms/new-room-button";
import { ResourceList } from "@repo/ui/resource-list";

export default async function RoomsPage() {
  const { rooms, locations } = await loadAdminRooms();

  return (
    <ResourceList
      actions={
        locations.length > 0 ? <NewRoomButton locations={locations} /> : null
      }
      emptyText={
        locations.length > 0
          ? "Nie ma jeszcze gabinetów. Dodaj pierwszy i przypisz go do lokalizacji."
          : "Gabinety należą do lokalizacji centrum. Dodaj lokalizację w Ustawieniach, aby zacząć."
      }
      filters={[
        { id: "active", label: "Aktywne" },
        { id: "inactive", label: "Nieaktywne" },
        { id: "on-site", label: "Na stronie" },
      ]}
      items={toRoomListItems(rooms)}
      label="Gabinety"
      noMatchText="Żaden gabinet nie pasuje do wyszukiwania i filtra."
      searchLabel="Szukaj gabinetu"
      searchPlaceholder="Szukaj gabinetu…"
    />
  );
}
