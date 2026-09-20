import { loadAdminRoomsPage } from "@/features/rooms/loaders";
import { RoomsList } from "@/features/rooms/rooms-list";

export default async function RoomsPage() {
  return <RoomsList initialData={await loadAdminRoomsPage()} />;
}
