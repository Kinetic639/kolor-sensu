import { AdminBreadcrumbs } from "@/lib/breadcrumbs";

// Any other path: its section. The slot must match every path, or a
// client-side navigation would keep the previous page's trail.
export default async function SectionBreadcrumb({
  params,
}: {
  params: Promise<{ segments: string[] }>;
}) {
  const { segments } = await params;
  return <AdminBreadcrumbs pathname={`/${segments.join("/")}`} />;
}
