import { BookingTab } from "@/features/center/booking-tab";
import { CentreTab } from "@/features/center/centre-tab";
import { ClosuresTab } from "@/features/center/closures-tab";
import { loadCenterSettings, loadClosures } from "@/features/center/loaders";
import { LocationsTab } from "@/features/center/locations-tab";
import {
  loadSettingsParams,
  settingsTabs,
} from "@/features/center/page-params";
import { DetailTabs } from "@repo/ui/detail-page";
import { FullBleed } from "@repo/ui/full-bleed";
import { PageTitle } from "@repo/ui/portal-content";

// Ustawienia: the centre's sections as tabs in the address (the centre
// and its company, its locations, online booking, the days it is closed),
// each edited in place.

export default async function SettingsPage({
  searchParams,
}: PageProps<"/ustawienia">) {
  const { zakladka } = loadSettingsParams(await searchParams);
  const { profile, locations, settings, company } = await loadCenterSettings();
  return (
    <FullBleed>
      <PageTitle>Ustawienia</PageTitle>
      <DetailTabs
        active={zakladka}
        label="Sekcje ustawień"
        tabs={settingsTabs({ lokalizacje: locations.length })}
      />
      {zakladka === "centrum" ? (
        <CentreTab company={company} profile={profile} />
      ) : zakladka === "lokalizacje" ? (
        <LocationsTab locations={locations} />
      ) : zakladka === "zamkniecia" ? (
        <ClosuresTab {...await loadClosures()} />
      ) : (
        <BookingTab settings={settings} />
      )}
    </FullBleed>
  );
}
