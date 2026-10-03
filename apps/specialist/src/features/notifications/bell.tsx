import { createClient } from "@/lib/supabase/server";
import { DEFAULT_TIME_ZONE, notificationView } from "@repo/scheduling";
import { listNotifications } from "@repo/supabase";
import { NotificationsBell, NotificationsPanel } from "@repo/ui/notifications";
import { cache } from "react";
import {
  markNotificationReadAction,
  markNotificationsReadAction,
  markNotificationUnreadAction,
  loadNotificationVisitAction,
} from "./actions";

// This person's latest notifications (R13), read once per request for the
// bell in the header and the drawer it opens; rendered on the
// server, the live updates refresh them.

const loadInbox = cache(async () => {
  const { items, unreadCount } = await listNotifications(
    await createClient(),
    "specialist",
  );
  return {
    items: items.map((item) =>
      notificationView(item, {
        timeZone: DEFAULT_TIME_ZONE,
        portal: "specialist",
      }),
    ),
    unreadCount,
  };
});

export async function NotificationBell() {
  const { items, unreadCount } = await loadInbox();
  return <NotificationsBell items={items} unreadCount={unreadCount} />;
}

export async function NotificationPanel() {
  const { items, unreadCount } = await loadInbox();
  return (
    <NotificationsPanel
      items={items}
      markAllRead={markNotificationsReadAction}
      markRead={markNotificationReadAction}
      loadVisit={loadNotificationVisitAction}
      showSpecialist={false}
      markUnread={markNotificationUnreadAction}
      unreadCount={unreadCount}
    />
  );
}
