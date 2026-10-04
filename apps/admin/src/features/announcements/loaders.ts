import "server-only";
import { localDate } from "@/features/dashboard/loaders";
import { centreSettings } from "@/lib/reference-data";
import { createClient } from "@/lib/supabase/server";
import { listAnnouncements } from "@repo/supabase";
import { announcementRows } from "./view-model";

// `/ogloszenia`: every announcement, in the order the list shows them, and
// today in the centre's time (which one is on the site now).

export async function loadAnnouncements() {
  const [client, settings] = await Promise.all([
    createClient(),
    centreSettings(),
  ]);
  const today = localDate(new Date(), settings.timezone);
  return {
    today,
    rows: announcementRows(await listAnnouncements(client), today),
  };
}
