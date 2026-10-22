import { workshopTitle } from "@/features/workshops/loaders";
import { AdminBreadcrumbs } from "@/lib/breadcrumbs";

export default async function WorkshopBreadcrumb({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const title = await workshopTitle(id);
  return (
    <AdminBreadcrumbs
      detail={title ?? undefined}
      pathname={`/warsztaty/${id}`}
    />
  );
}
