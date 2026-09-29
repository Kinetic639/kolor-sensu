import { loadAdminRoom } from "@/features/rooms/loaders";
import { AdminBreadcrumbs } from "@/lib/breadcrumbs";

export default async function RoomBreadcrumb({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const model = await loadAdminRoom(id);
  return (
    <AdminBreadcrumbs detail={model?.room.name} pathname={`/gabinety/${id}`} />
  );
}
