import { loadHomeContent, loadRoomsPageContent } from "@/features/cms/loaders";
import { PageHeader } from "@repo/ui/portal-content";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@repo/ui/tabs";
import { CmsHomeEditor } from "./cms-home-editor";
import { CmsRoomsEditor } from "./cms-rooms-editor";

export default async function CmsPage() {
  const [home, rooms] = await Promise.all([
    loadHomeContent(),
    loadRoomsPageContent(),
  ]);

  return (
    <div className="space-y-5">
      <PageHeader
        description="Treści publikowane w serwisie Kolor Sensu."
        title="CMS"
      />
      <Tabs defaultValue="home">
        <TabsList>
          <TabsTrigger value="home">Strona główna</TabsTrigger>
          <TabsTrigger value="rooms">Gabinety</TabsTrigger>
        </TabsList>
        <TabsContent value="home">
          <CmsHomeEditor initialData={home} />
        </TabsContent>
        <TabsContent value="rooms">
          <CmsRoomsEditor initialData={rooms} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
