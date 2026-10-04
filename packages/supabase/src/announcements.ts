import {
  announcementInputSchema,
  type Announcement,
  type AnnouncementInput,
} from "@repo/contracts/announcements";
import type { Database } from "@repo/contracts/database";
import type { SupabaseClient } from "@supabase/supabase-js";

// Announcements on the site: the admins manage them all (row-level
// security); the site reads only the one shown today.

type Client = SupabaseClient<Database>;
type Row = Database["public"]["Tables"]["site_announcements"]["Row"];

const toAnnouncement = (row: Row): Announcement => ({
  id: row.id,
  message: row.message,
  linkLabel: row.link_label,
  linkHref: row.link_href,
  startsOn: row.starts_on,
  endsOn: row.ends_on,
});

/** Every announcement, the latest days first (admins). */
export async function listAnnouncements(client: Client) {
  const { data, error } = await client
    .from("site_announcements")
    .select("*")
    .order("starts_on", { ascending: false });
  if (error) throw error;
  return (data ?? []).map(toAnnouncement);
}

/** A new one (no id), or one there is changed; checked first. */
export async function saveAnnouncement(
  client: Client,
  id: string | null,
  input: AnnouncementInput | Record<string, unknown>,
) {
  const value = announcementInputSchema.parse(input);
  const row = {
    message: value.message,
    link_label: value.linkLabel,
    link_href: value.linkHref,
    starts_on: value.startsOn,
    ends_on: value.endsOn,
  };
  const { error } = id
    ? await client.from("site_announcements").update(row).eq("id", id)
    : await client.from("site_announcements").insert(row);
  if (error) throw error;
}

export async function deleteAnnouncement(client: Client, id: string) {
  const { error } = await client
    .from("site_announcements")
    .delete()
    .eq("id", id);
  if (error) throw error;
}

export interface CurrentAnnouncement {
  id: string;
  message: string;
  link: { label: string; href: string } | null;
}

/** The announcement the site shows today (the centre's time), or none. */
export async function getCurrentAnnouncement(
  client: Client,
): Promise<CurrentAnnouncement | null> {
  const { data, error } = await client.rpc("current_announcement");
  if (error) throw error;
  const row = data?.[0];
  if (!row) return null;
  return {
    id: row.id,
    message: row.message,
    link:
      row.link_label && row.link_href
        ? { label: row.link_label, href: row.link_href }
        : null,
  };
}
