import { loadAdminServiceDetail } from "@/features/services/loaders";
import { AdminBreadcrumbs } from "@/lib/breadcrumbs";

export default async function ServiceBreadcrumb({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const detail = await loadAdminServiceDetail(id);
  return <AdminBreadcrumbs detail={detail?.name} pathname={`/oferta/${id}`} />;
}
