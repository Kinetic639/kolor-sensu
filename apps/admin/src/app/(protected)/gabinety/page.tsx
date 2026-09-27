import { loadAdminRooms } from "@/features/rooms/loaders";
import { NewRoomButton } from "@/features/rooms/new-room-button";
import { RoomsList } from "@/features/rooms/rooms-list";
import { EmptyState, PageHeader } from "@repo/ui/portal-content";

export default async function RoomsPage() {
  const { rooms, locations } = await loadAdminRooms();
  const addButton = <NewRoomButton locations={locations} />;

  return (
    <div className="space-y-5">
      <PageHeader
        actions={locations.length > 0 ? addButton : undefined}
        description="Gabinety w lokalizacjach centrum, ich profile i zdjęcia na stronie."
        title="Gabinety"
      />
      {rooms.length === 0 ? (
        <EmptyState
          action={locations.length > 0 ? addButton : undefined}
          description={
            locations.length > 0
              ? "Dodaj pierwszy gabinet i przypisz go do lokalizacji."
              : "Gabinety należą do lokalizacji centrum. Dodaj lokalizację w Ustawieniach, aby zacząć."
          }
          title="Brak gabinetów"
        />
      ) : (
        <RoomsList rooms={rooms} />
      )}
    </div>
  );
}
