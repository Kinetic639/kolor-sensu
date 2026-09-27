import { loadAdminRooms } from "@/features/rooms/loaders";
import { RoomsList } from "@/features/rooms/rooms-list";
import { EmptyState, PageHeader } from "@repo/ui/portal-content";

export default async function RoomsPage() {
  const rooms = await loadAdminRooms();

  return (
    <div className="space-y-5">
      <PageHeader
        description="Fizyczne gabinety przypisane do lokalizacji centrum i ich profile na stronie."
        title="Gabinety"
      />
      {rooms.length === 0 ? (
        <EmptyState
          description="Gabinety należą do lokalizacji centrum. Dodaj lokalizację, aby zacząć definiować gabinety."
          title="Brak zdefiniowanych gabinetów"
        />
      ) : (
        <RoomsList rooms={rooms} />
      )}
    </div>
  );
}
