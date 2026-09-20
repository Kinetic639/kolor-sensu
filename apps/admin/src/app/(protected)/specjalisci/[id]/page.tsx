import { SpecialistDetail } from "@/features/specialists/specialist-detail";
import { loadAdminSpecialistDetail } from "@/features/specialists/loaders";
import { notFound } from "next/navigation";

export default async function SpecialistDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const detail = await loadAdminSpecialistDetail(id);
  if (!detail) notFound();

  return <SpecialistDetail initialData={detail} />;
}
