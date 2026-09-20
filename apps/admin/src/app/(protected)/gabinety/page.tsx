import { loadAdminRooms } from "@/features/rooms/loaders";
import { Card } from "@repo/ui/card";
import { EmptyState, PageHeader, StatusBadge } from "@repo/ui/portal-content";

export default async function RoomsPage() {
  const rooms = await loadAdminRooms();

  return (
    <div className="space-y-5">
      <PageHeader
        description="Fizyczne gabinety przypisane do lokalizacji centrum."
        title="Gabinety"
      />
      {rooms.length === 0 ? (
        <EmptyState
          description="Gabinety należą do lokalizacji centrum. Dodaj lokalizację, aby zacząć definiować gabinety."
          title="Brak zdefiniowanych gabinetów"
        />
      ) : (
        <div className="space-y-3">
          {rooms.map((room) => (
            <Card
              className="flex flex-wrap items-center justify-between gap-3"
              key={room.id}
            >
              <div>
                <p className="font-heading font-semibold text-[var(--text)]">
                  {room.name}
                </p>
                <p className="text-sm text-[var(--text-muted)]">
                  {room.locationName} &middot; pojemność {room.capacity}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <StatusBadge tone={room.active ? "success" : "neutral"}>
                  {room.active ? "Aktywny" : "Nieaktywny"}
                </StatusBadge>
                <StatusBadge tone={room.publiclyVisible ? "info" : "neutral"}>
                  {room.publiclyVisible ? "Publiczny" : "Wewnętrzny"}
                </StatusBadge>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
