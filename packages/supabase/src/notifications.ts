import type { Database } from "@repo/contracts/database";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { VisitMode } from "./booking";

// Notifications in the portals (docs/product/booking-plan.md, R13): each
// person's own inbox per portal, filled by the database from a visit's
// history, and their private live channel `user:<id>`, on which the
// database says "a notification" or "visits changed" as it happens. The
// page then reloads its data from the server; the signal is only a nudge.

type Client = SupabaseClient<Database>;

export type NotificationPortal = "admin" | "specialist";

export type NotificationKind =
  /** A new visit, paid online. */
  | "booked"
  /** Reserved online, to be paid later. */
  | "reserved"
  /** Booked by the centre (paid from the e-mailed link). */
  | "centre_booked"
  /** A reservation paid. */
  | "paid"
  | "cancelled"
  | "rescheduled"
  /** Money the centre gave back later (admins only). */
  | "refunded";

export interface NotificationDetails {
  reference: string | null;
  startsAt: string | null;
  mode: VisitMode | null;
  clientName: string | null;
  serviceName: string | null;
  specialistName: string | null;
  /** A move: where it was. */
  fromStartsAt: string | null;
  /** The centre's reason; "unpaid" when the system cancelled it. */
  reason: string | null;
  /** The money, for admins only. */
  refundMinor: number | null;
  refundDueMinor: number | null;
  priceMinor: number | null;
  currencyCode: string | null;
}

export interface PortalNotification {
  id: number;
  kind: NotificationKind;
  actor: "client" | "centre" | "payment" | "system";
  appointmentId: string | null;
  createdAt: string;
  readAt: string | null;
  details: NotificationDetails;
}

interface NotificationRowLike {
  id: number;
  kind: string;
  actor: string;
  appointment_id: string | null;
  created_at: string;
  read_at?: string | null;
  details: unknown;
}

const text = (value: unknown) => (typeof value === "string" ? value : null);
const minor = (value: unknown) =>
  typeof value === "number" && Number.isInteger(value) ? value : null;

/** A stored row, or a live signal's payload (the same shape). */
export function toPortalNotification(
  row: NotificationRowLike,
): PortalNotification {
  const d =
    row.details && typeof row.details === "object"
      ? (row.details as Record<string, unknown>)
      : {};
  const mode = text(d.mode);
  return {
    id: row.id,
    kind: row.kind as NotificationKind,
    actor: row.actor as PortalNotification["actor"],
    appointmentId: row.appointment_id,
    createdAt: row.created_at,
    readAt: row.read_at ?? null,
    details: {
      reference: text(d.reference),
      startsAt: text(d.starts_at),
      mode: mode === "online" || mode === "in_person" ? mode : null,
      clientName: text(d.client_name),
      serviceName: text(d.service_name),
      specialistName: text(d.specialist_name),
      fromStartsAt: text(d.from_starts_at),
      reason: text(d.reason),
      refundMinor: minor(d.refund_minor),
      refundDueMinor: minor(d.refund_due_minor),
      priceMinor: minor(d.price_minor),
      currencyCode: text(d.currency_code),
    },
  };
}

/** The portal's latest notifications and how many are unread. */
export async function listNotifications(
  client: Client,
  portal: NotificationPortal,
  limit = 30,
): Promise<{ items: PortalNotification[]; unreadCount: number }> {
  const [list, unread] = await Promise.all([
    client
      .from("notifications")
      .select("id, kind, actor, appointment_id, created_at, read_at, details")
      .eq("portal", portal)
      .order("created_at", { ascending: false })
      .limit(limit),
    client
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("portal", portal)
      .is("read_at", null),
  ]);
  if (list.error) throw list.error;
  if (unread.error) throw unread.error;
  return {
    items: (list.data ?? []).map(toPortalNotification),
    unreadCount: unread.count ?? 0,
  };
}

/** Opening the inbox reads it; how many were unread. */
export async function markNotificationsRead(
  client: Client,
  portal: NotificationPortal,
): Promise<number> {
  const { data, error } = await client.rpc("mark_notifications_read", {
    p_portal: portal,
  });
  if (error) throw error;
  return data ?? 0;
}

export interface PortalLiveHandlers {
  /** A visit the portal shows changed: reload. */
  onVisits: () => void;
  onNotification: (
    notification: PortalNotification & { portal: NotificationPortal },
  ) => void;
  /** Back after the connection dropped: something may have been missed. */
  onReconnect?: () => void;
}

/**
 * Listens on the person's private channel (only they can hear it, the
 * database checks); returns how to stop.
 */
export function subscribeToPortalUpdates(
  client: Client,
  userId: string,
  handlers: PortalLiveHandlers,
): () => void {
  let stopped = false;
  let joined = false;
  const channel = client
    .channel(`user:${userId}`, { config: { private: true } })
    .on("broadcast", { event: "visits" }, () => handlers.onVisits())
    .on("broadcast", { event: "notification" }, ({ payload }) => {
      const signal = payload as NotificationRowLike & {
        portal: NotificationPortal;
      };
      handlers.onNotification({
        ...toPortalNotification(signal),
        portal: signal.portal,
      });
    });

  // The private channel needs the signed-in person's token first.
  void client.realtime.setAuth().then(() => {
    if (stopped) return;
    channel.subscribe((status) => {
      if (status !== "SUBSCRIBED") return;
      if (joined) handlers.onReconnect?.();
      joined = true;
    });
  });

  return () => {
    stopped = true;
    void client.removeChannel(channel);
  };
}
