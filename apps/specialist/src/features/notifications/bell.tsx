import { createClient } from "@/lib/supabase/server";
import { DEFAULT_TIME_ZONE, notificationView } from "@repo/scheduling";
import { listNotifications } from "@repo/supabase";
import { PortalNotifications } from "@repo/ui/portal-notifications";
import { markNotificationsReadAction } from "./actions";

// The bell in the header with this person's latest notifications (R13),
// rendered on the server; the live updates refresh it.

export async function NotificationBell() {
  const { items, unreadCount } = await listNotifications(
    await createClient(),
    "specialist",
  );
  return (
    <PortalNotifications
      items={items.map((item) =>
        notificationView(item, {
          timeZone: DEFAULT_TIME_ZONE,
          portal: "specialist",
        }),
      )}
      markRead={markNotificationsReadAction}
      unreadCount={unreadCount}
    />
  );
}
