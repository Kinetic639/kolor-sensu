import {
  loadHomeContent,
  loadRoomsPageContent,
  loadSupportAreas,
} from "@/features/cms/loaders";
import { PageTitle } from "@repo/ui/portal-content";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@repo/ui/tabs";
import { CmsHomeEditor } from "./cms-home-editor";
import { CmsRoomsEditor } from "./cms-rooms-editor";
import { CmsSupportAreasEditor } from "./cms-support-areas-editor";

export default async function CmsPage() {
  const [home, areas, rooms] = await Promise.all([
    loadHomeContent(),
    loadSupportAreas(),
    loadRoomsPageContent(),
  ]);

  return (
    <div className="space-y-5">
      <PageTitle>CMS</PageTitle>
      <Tabs defaultValue="home">
        <TabsList>
          <TabsTrigger value="home">Strona główna</TabsTrigger>
          <TabsTrigger value="areas">Obszary wsparcia</TabsTrigger>
          <TabsTrigger value="rooms">Gabinety</TabsTrigger>
        </TabsList>
        <TabsContent value="home">
          <CmsHomeEditor initialData={home} />
        </TabsContent>
        <TabsContent value="areas">
          <CmsSupportAreasEditor initialData={areas} />
        </TabsContent>
        <TabsContent value="rooms">
          <CmsRoomsEditor initialData={rooms} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
