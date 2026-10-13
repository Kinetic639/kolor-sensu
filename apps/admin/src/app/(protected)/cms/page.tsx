import {
  loadHomeContent,
  loadHomeSections,
  loadRoomsPageContent,
  loadSupportAreas,
} from "@/features/cms/loaders";
import { settle } from "@/features/cms/settle";
import { Card } from "@repo/ui/card";
import { PageTitle } from "@repo/ui/portal-content";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@repo/ui/tabs";
import type { ReactNode } from "react";
import { CmsHomeEditor } from "./cms-home-editor";
import { CmsHomeSectionsEditor } from "./cms-home-sections-editor";
import { CmsRoomsEditor } from "./cms-rooms-editor";
import { CmsSupportAreasEditor } from "./cms-support-areas-editor";

/** A tab whose content could not load: say so, keep the others working. */
function Unavailable({ children }: { children: ReactNode }) {
  return (
    <Card className="p-5 text-sm text-[var(--text-muted)]" role="status">
      Nie udało się wczytać ustawień sekcji „{children}”. Odśwież stronę; jeśli
      to nie pomoże, sekcja nie jest jeszcze gotowa w bazie danych.
    </Card>
  );
}

export default async function CmsPage() {
  // Each tab on its own: one that cannot load does not take the page down.
  const [home, areas, sections, rooms] = await Promise.all([
    settle("strona główna", loadHomeContent),
    settle("obszary wsparcia", loadSupportAreas),
    settle("specjaliści", loadHomeSections),
    settle("gabinety", loadRoomsPageContent),
  ]);

  return (
    <div className="space-y-5">
      <PageTitle>CMS</PageTitle>
      <Tabs defaultValue="home">
        <TabsList>
          <TabsTrigger value="home">Strona główna</TabsTrigger>
          <TabsTrigger value="areas">Obszary wsparcia</TabsTrigger>
          <TabsTrigger value="specialists">Specjaliści</TabsTrigger>
          <TabsTrigger value="rooms">Gabinety</TabsTrigger>
        </TabsList>
        <TabsContent value="home">
          {home ? (
            <CmsHomeEditor initialData={home} />
          ) : (
            <Unavailable>Strona główna</Unavailable>
          )}
        </TabsContent>
        <TabsContent value="areas">
          {areas ? (
            <CmsSupportAreasEditor initialData={areas} />
          ) : (
            <Unavailable>Obszary wsparcia</Unavailable>
          )}
        </TabsContent>
        <TabsContent value="specialists">
          {sections ? (
            <CmsHomeSectionsEditor initialData={sections} />
          ) : (
            <Unavailable>Specjaliści</Unavailable>
          )}
        </TabsContent>
        <TabsContent value="rooms">
          {rooms ? (
            <CmsRoomsEditor initialData={rooms} />
          ) : (
            <Unavailable>Gabinety</Unavailable>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
