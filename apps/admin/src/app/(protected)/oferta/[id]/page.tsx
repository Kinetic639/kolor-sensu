import { ServiceDetail } from "@/features/services/service-detail";
import { loadAdminServiceDetail } from "@/features/services/loaders";
import { notFound } from "next/navigation";

export default async function ServiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const detail = await loadAdminServiceDetail(id);
  if (!detail) notFound();
  return <ServiceDetail initialData={detail} />;
}
