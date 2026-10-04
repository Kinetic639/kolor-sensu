import { specialistAvatars, specialistSummaries } from "@/lib/reference-data";
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
    "admin",
  );
  return {
    items: items.map((item) =>
      notificationView(item, { timeZone: DEFAULT_TIME_ZONE, portal: "admin" }),
    ),
    unreadCount,
  };
});

export async function NotificationBell() {
  const { items, unreadCount } = await loadInbox();
  return <NotificationsBell items={items} unreadCount={unreadCount} />;
}

/** The specialists' pictures and colours, for a profile's chip. */
async function specialistLook() {
  const [people, avatars] = await Promise.all([
    specialistSummaries(),
    specialistAvatars(),
  ]);
  return Object.fromEntries(
    people.map((one) => [
      one.id,
      { avatar: avatars[one.id] ?? null, color: one.color },
    ]),
  );
}

export async function NotificationPanel() {
  const [{ items, unreadCount }, look] = await Promise.all([
    loadInbox(),
    specialistLook(),
  ]);
  return (
    <NotificationsPanel
      items={items}
      markAllRead={markNotificationsReadAction}
      markRead={markNotificationReadAction}
      loadVisit={loadNotificationVisitAction}
      look={look}
      markUnread={markNotificationUnreadAction}
      unreadCount={unreadCount}
    />
  );
}
