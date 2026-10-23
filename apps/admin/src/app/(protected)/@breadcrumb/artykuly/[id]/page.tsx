import { articleTitle } from "@/features/education/loaders";
import { AdminBreadcrumbs } from "@/lib/breadcrumbs";

export default async function ArticleBreadcrumb({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const title = await articleTitle(id);
  return (
    <AdminBreadcrumbs
      detail={title ?? undefined}
      pathname={`/artykuly/${id}`}
    />
  );
}
