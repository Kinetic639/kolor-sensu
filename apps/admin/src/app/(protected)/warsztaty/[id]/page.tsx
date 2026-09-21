import { WorkshopDetail } from "@/features/warsztaty/workshop-detail";
import {
  loadAdminWorkshopDetail,
  loadWorkshopFormOptions,
} from "@/features/warsztaty/loaders";
import { notFound } from "next/navigation";

export default async function WorkshopDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [detail, formOptions] = await Promise.all([
    loadAdminWorkshopDetail(id),
    loadWorkshopFormOptions(),
  ]);
  if (!detail) notFound();
  return <WorkshopDetail formOptions={formOptions} initialData={detail} />;
}
