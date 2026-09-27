import { loadAdminRoomDetail } from "@/features/rooms/loaders";
import { RoomDetail } from "@/features/rooms/room-detail";
import { notFound } from "next/navigation";

export default async function RoomDetailPage({
  params,
}: PageProps<"/gabinety/[id]">) {
  const { id } = await params;
  const model = await loadAdminRoomDetail(id);
  if (!model) notFound();

  return <RoomDetail model={model} />;
}
