import { loadClientName } from "@/features/clients/loaders";
import { AdminBreadcrumbs } from "@/lib/breadcrumbs";

export default async function ClientBreadcrumb({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const name = await loadClientName(id);
  return (
    <AdminBreadcrumbs detail={name ?? undefined} pathname={`/klienci/${id}`} />
  );
}
