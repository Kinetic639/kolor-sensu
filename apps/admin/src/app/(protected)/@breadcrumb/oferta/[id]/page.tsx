import { serviceName } from "@/features/services/loaders";
import { AdminBreadcrumbs } from "@/lib/breadcrumbs";

export default async function ServiceBreadcrumb({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const name = await serviceName(id);
  return (
    <AdminBreadcrumbs detail={name ?? undefined} pathname={`/oferta/${id}`} />
  );
}
