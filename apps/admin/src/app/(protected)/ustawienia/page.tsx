import { CenterSettings } from "@/features/center/center-settings";
import { loadCenterSettings } from "@/features/center/loaders";

export default async function SettingsPage() {
  const { profile, locations } = await loadCenterSettings();
  return <CenterSettings locations={locations} profile={profile} />;
}
