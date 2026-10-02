import { createClient } from "@/lib/supabase/server";
import { DEFAULT_TIME_ZONE, notificationView } from "@repo/scheduling";
import { listNotifications } from "@repo/supabase";
import { PortalNotifications } from "@repo/ui/portal-notifications";
import {
  markNotificationReadAction,
  markNotificationsReadAction,
} from "./actions";

// The bell in the header with this person's latest notifications (R13),
// rendered on the server; the live updates refresh it.

export async function NotificationBell() {
  const { items, unreadCount } = await listNotifications(
    await createClient(),
    "admin",
  );
  return (
    <PortalNotifications
      items={items.map((item) =>
        notificationView(item, {
          timeZone: DEFAULT_TIME_ZONE,
          portal: "admin",
        }),
      )}
      markAllRead={markNotificationsReadAction}
      markRead={markNotificationReadAction}
      unreadCount={unreadCount}
    />
  );
}
