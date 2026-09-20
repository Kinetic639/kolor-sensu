import { loadAdminRoomDetail } from "@/features/rooms/loaders";
import { RoomDetail } from "@/features/rooms/room-detail";
import { notFound } from "next/navigation";

export default async function RoomDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const detail = await loadAdminRoomDetail(id);
  if (!detail) notFound();
  return <RoomDetail initialData={detail} />;
}
