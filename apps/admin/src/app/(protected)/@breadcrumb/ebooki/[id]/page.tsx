import { ebookTitle } from "@/features/education/loaders";
import { AdminBreadcrumbs } from "@/lib/breadcrumbs";

export default async function EbookBreadcrumb({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const title = await ebookTitle(id);
  return (
    <AdminBreadcrumbs detail={title ?? undefined} pathname={`/ebooki/${id}`} />
  );
}
