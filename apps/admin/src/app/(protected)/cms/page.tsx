import { loadHomeContent } from "@/features/cms/loaders";
import { PageHeader } from "@repo/ui/portal-content";
import { CmsHomeEditor } from "./cms-home-editor";

export default async function CmsPage() {
  const initialData = await loadHomeContent();

  return (
    <div className="space-y-5">
      <PageHeader
        description="Treści publikowane w serwisie Kolor Sensu."
        title="CMS"
      />
      <CmsHomeEditor initialData={initialData} />
    </div>
  );
}
