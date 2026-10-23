import type { Database } from "@repo/contracts/database";
import type { SupabaseClient } from "@supabase/supabase-js";
import { cancelledByOf, type VisitMode } from "./booking";

// E-mails about a visit (docs/product/booking-plan.md, R7, R11): claimed
// once, then marked sent or given back. Secret client only.

type Client = SupabaseClient<Database>;

export type BookingEmailKind =
  | "confirmation"
  | "reminder"
  | "rescheduled"
  | "cancelled"
  /** Reserved, to be paid by a time (the link to pay). */
  | "reserved"
  /** A day before the payment is due. */
  | "payment_reminder"
  /** Six hours before the payment is due. */
  | "payment_last_call"
  /** Money the centre gave back later (R12); one per refund. */
  | "refunded";

export interface ClaimedBookingEmail {
  reference: string;
  mode: VisitMode;
  startsAt: string;
  endsAt: string;
  serviceName: string;
  specialistName: string | null;
  roomName: string | null;
  locationName: string | null;
  locationAddress: string | null;
  priceMinor: number;
  currencyCode: string;
  clientName: string;
  clientEmail: string;
  /**
   * A new link token for the e-mail (the database keeps its hash); null for
   * "rescheduled" and most "cancelled", sent with the link the client
   * already has (or none, cancelled for want of payment).
   */
  manageToken: string | null;
  /** For "cancelled": who cancelled it ("system": not paid in time). */
  cancelledBy: "client" | "centre" | "system" | null;
  /** The client online, or the centre (then paid from the e-mail link). */
  bookedBy: "client" | "centre";
  /** Paid online. */
  paid: boolean;
  /** A reservation: to be paid by then (once confirmed). */
  paymentDueAt: string | null;
  /** A client's reservation not confirmed yet: confirm it by then. */
  confirmBy: string | null;
}

/** What the e-mail needs, or null when it is not this caller's to send. */
export async function claimBookingEmail(
  client: Client,
  reference: string,
  kind: BookingEmailKind,
): Promise<ClaimedBookingEmail | null> {
  const { data, error } = await client.rpc("claim_booking_email", {
    p_reference: reference,
    p_kind: kind,
  });
  if (error) throw error;
  const row = data?.[0];
  return row
    ? {
        reference: row.reference,
        mode: row.mode,
        startsAt: row.starts_at,
        endsAt: row.ends_at,
        serviceName: row.service_name,
        specialistName: row.specialist_name ?? null,
        roomName: row.room_name ?? null,
        locationName: row.location_name ?? null,
        locationAddress: row.location_address ?? null,
        priceMinor: row.price_minor,
        currencyCode: row.currency_code,
        clientName: row.client_name,
        clientEmail: row.client_email,
        manageToken: row.manage_token ?? null,
        cancelledBy: cancelledByOf(row.cancelled_by),
        bookedBy: row.booked_by === "centre" ? "centre" : "client",
        paid: row.paid,
        paymentDueAt: row.payment_due_at ?? null,
        confirmBy: row.confirm_by ?? null,
      }
    : null;
}

export async function markBookingEmailSent(
  client: Client,
  reference: string,
  kind: BookingEmailKind,
  messageId: string,
) {
  const { error } = await client.rpc("mark_booking_email_sent", {
    p_reference: reference,
    p_kind: kind,
    p_message_id: messageId,
  });
  if (error) throw error;
}

/** Sending failed: someone may claim it again at once. */
export async function releaseBookingEmail(
  client: Client,
  reference: string,
  kind: BookingEmailKind,
) {
  const { error } = await client.rpc("release_booking_email", {
    p_reference: reference,
    p_kind: kind,
  });
  if (error) throw error;
}

export interface DueBookingEmail {
  reference: string;
  kind: BookingEmailKind;
}

/**
 * The scheduled job: cancels the reservations not paid in time (their
 * references), then lists the e-mails due (each once).
 */
export async function cancelUnpaidVisits(client: Client) {
  const { data, error } = await client.rpc("cancel_unpaid_visits");
  if (error) throw error;
  return (data ?? []).map((row) => row.reference);
}

export async function listDueBookingEmails(
  client: Client,
): Promise<DueBookingEmail[]> {
  const { data, error } = await client.rpc("list_due_emails");
  if (error) throw error;
  return (data ?? []).map((row) => ({
    reference: row.reference,
    kind: row.kind as BookingEmailKind,
  }));
}
