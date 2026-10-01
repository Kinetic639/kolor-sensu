import type { Database } from "@repo/contracts/database";
import type { SupabaseClient } from "@supabase/supabase-js";
import { BookingError, bookingError, type VisitMode } from "./booking";

// Visits the centre books from the calendar (docs/product/scheduling-ui-plan.md,
// K5: "+ Nowa wizyta"): an admin for anyone, a specialist for themselves
// (the database checks who asks). Reserved until the client pays online
// from the e-mail link (R11), by 48 hours before, or soon when it is close.

type Client = SupabaseClient<Database>;

/** An offer the centre can book: who gives which service, how. */
export interface CentreOffer {
  id: string;
  specialistId: string;
  serviceId: string;
  serviceName: string;
  priceMinor: number;
  currencyCode: string;
  durationMinutes: number;
  modes: VisitMode[];
}

interface OfferRow {
  id: string;
  specialist_id: string;
  price_minor: number;
  currency_code: string;
  duration_minutes: number | null;
  supports_in_person: boolean;
  supports_online: boolean;
  service: {
    id: string;
    name: string;
    default_duration_minutes: number;
    active: boolean;
  };
  specialist: { active: boolean };
}

/** The active offers of active specialists and services (RLS: whose). */
export async function listCentreOffers(client: Client): Promise<CentreOffer[]> {
  const { data, error } = await client
    .from("specialist_services")
    .select(
      `
        id, specialist_id, price_minor, currency_code, duration_minutes,
        supports_in_person, supports_online,
        service:services!inner (id, name, default_duration_minutes, active),
        specialist:specialists!inner (active)
      `,
    )
    .eq("active", true)
    .order("specialist_id");
  if (error) throw error;
  return (data as unknown as OfferRow[])
    .filter((row) => row.service.active && row.specialist.active)
    .map((row) => ({
      id: row.id,
      specialistId: row.specialist_id,
      serviceId: row.service.id,
      serviceName: row.service.name,
      priceMinor: row.price_minor,
      currencyCode: row.currency_code,
      durationMinutes:
        row.duration_minutes ?? row.service.default_duration_minutes,
      modes: [
        ...(row.supports_in_person ? (["in_person"] as const) : []),
        ...(row.supports_online ? (["online"] as const) : []),
      ],
    }))
    .sort((a, b) => a.serviceName.localeCompare(b.serviceName, "pl"));
}

export interface CentreBookingInput {
  offerId: string;
  mode: VisitMode;
  /** An instant (ISO). */
  startsAt: string;
  /** In person only. */
  roomId: string | null;
  client: {
    name: string;
    email: string;
    phone: string | null;
    notes: string | null;
  };
}

export interface CentreBookedVisit {
  id: string;
  reference: string;
  startsAt: string;
  endsAt: string;
  /** To be paid by then, or it is cancelled. */
  paymentDueAt: string;
}

/** Books the visit; throws a BookingError saying why not. */
export async function centreBookVisit(
  client: Client,
  input: CentreBookingInput,
): Promise<CentreBookedVisit> {
  const { data, error } = await client.rpc("centre_book_visit", {
    p_offer_id: input.offerId,
    p_mode: input.mode,
    p_starts_at: input.startsAt,
    p_room_id: input.mode === "in_person" ? input.roomId : null,
    p_client_name: input.client.name,
    p_client_email: input.client.email,
    p_client_phone: input.client.phone,
    p_client_notes: input.client.notes,
  });
  if (error) {
    if (error.code === "42501") {
      throw new BookingError("forbidden", error.message);
    }
    throw bookingError(error);
  }
  const row = data?.[0];
  if (!row) throw new BookingError("unknown", "No visit was booked");
  return {
    id: row.appointment_id,
    reference: row.reference,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    paymentDueAt: row.payment_due_at,
  };
}
