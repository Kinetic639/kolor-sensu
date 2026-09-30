import type { Database } from "@repo/contracts/database";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { VisitMode } from "./booking";

// E-mails about a visit (docs/product/booking-plan.md, R7): claimed once,
// then marked sent or given back. Secret client only.

type Client = SupabaseClient<Database>;

export type BookingEmailKind =
  "confirmation" | "reminder" | "rescheduled" | "cancelled";

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
  /** For the e-mail's link only; the database keeps its hash. */
  manageToken: string;
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
        manageToken: row.manage_token,
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
