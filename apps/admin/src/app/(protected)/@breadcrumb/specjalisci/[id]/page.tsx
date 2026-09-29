import { loadAdminSpecialistDetail } from "@/features/specialists/loaders";
import { AdminBreadcrumbs } from "@/lib/breadcrumbs";

export default async function SpecialistBreadcrumb({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const detail = await loadAdminSpecialistDetail(id);
  return (
    <AdminBreadcrumbs
      detail={detail?.displayName}
      pathname={`/specjalisci/${id}`}
    />
  );
}
