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
  | "refunded"
  /** A specialist sent their profile for review (admins only). */
  | "profile_submitted"
  /** Their profile approved, or sent back with a reason (the specialist). */
  | "profile_approved"
  /** A payment's dispute (a chargeback) opened, or closed (admins only). */
  | "disputed"
  | "dispute_closed"
  /** A held visit has ended and waits for its specialist to close it. */
  | "visit_to_close"
  /** A third unpaid reservation by one person: paid at once (admins). */
  | "unpaid_limit"
  | "profile_rejected";

export interface NotificationDetails {
  reference: string | null;
  startsAt: string | null;
  mode: VisitMode | null;
  clientName: string | null;
  serviceName: string | null;
  specialistName: string | null;
  /** Whose profile (a profile sent for review). */
  specialistId: string | null;
  /** A move: where it was. */
  fromStartsAt: string | null;
  /** The centre's reason; "unpaid" when the system cancelled it. */
  reason: string | null;
  /** The money, for admins only. */
  refundMinor: number | null;
  refundDueMinor: number | null;
  priceMinor: number | null;
  currencyCode: string | null;
  /** A dispute: the amount, Stripe's status and reason. */
  amountMinor?: number | null;
  disputeStatus?: string | null;
  disputeReason?: string | null;
}

export interface PortalNotification {
  id: number;
  kind: NotificationKind;
  actor: "client" | "centre" | "payment" | "system" | "specialist";
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
      specialistId: text(d.specialist_id),
      fromStartsAt: text(d.from_starts_at),
      reason: text(d.reason),
      refundMinor: minor(d.refund_minor),
      refundDueMinor: minor(d.refund_due_minor),
      priceMinor: minor(d.price_minor),
      amountMinor: minor(d.amount_minor),
      disputeStatus: text(d.dispute_status),
      disputeReason: text(d.dispute_reason),
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

/** One of the person's notifications read; true when it was unread. */
export async function markNotificationRead(
  client: Client,
  id: number,
): Promise<boolean> {
  const { data, error } = await client.rpc("mark_notification_read", {
    p_id: id,
  });
  if (error) throw error;
  return data ?? false;
}

/** One of the person's notifications back to unread; true when it was read. */
export async function markNotificationUnread(
  client: Client,
  id: number,
): Promise<boolean> {
  const { data, error } = await client.rpc("mark_notification_unread", {
    p_id: id,
  });
  if (error) throw error;
  return data ?? false;
}

/** Every notification of the portal read; how many were unread. */
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
