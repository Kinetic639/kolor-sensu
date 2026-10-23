import { issueTitle } from "@/features/newsletter/loaders";
import { AdminBreadcrumbs } from "@/lib/breadcrumbs";

export default async function NewsletterIssueBreadcrumb({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const title = await issueTitle(id);
  return (
    <AdminBreadcrumbs
      detail={title ?? undefined}
      pathname={`/newsletter/wydania/${id}`}
    />
  );
}
