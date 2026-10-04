import { AnnouncementsManager } from "@/features/announcements/announcements-manager";
import { loadAnnouncements } from "@/features/announcements/loaders";
import { FullBleed } from "@repo/ui/full-bleed";
import { PageTitle } from "@repo/ui/portal-content";

// The site's announcements (the CMS): a narrow bar above the header, on the
// days each is set for.
export default async function AnnouncementsPage() {
  const { rows, today } = await loadAnnouncements();
  return (
    <FullBleed>
      <PageTitle>Ogłoszenia</PageTitle>
      <AnnouncementsManager rows={rows} today={today} />
    </FullBleed>
  );
}
