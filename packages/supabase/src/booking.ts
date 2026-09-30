import type {
  PublicService,
  PublicSpecialistOffer,
  ServiceCategory,
} from "@repo/contracts";
import type { BookingDetails } from "@repo/contracts/booking";
import type { Database } from "@repo/contracts/database";
import type { SupabaseClient } from "@supabase/supabase-js";

// Online booking (docs/product/booking-plan.md): the database works out
// what can be booked and the free times; the hold and a guest's visit go
// through the site's server with the secret client (./secret).

type Client = SupabaseClient<Database>;

export type VisitMode = Database["public"]["Enums"]["visit_mode"];
export type AppointmentStatus =
  Database["public"]["Enums"]["appointment_status"];

/** An offer the wizard lists, with who gives it. */
export interface BookableOffer extends PublicSpecialistOffer {
  specialistName: string;
  /** Storage path of their published profile photo (a private bucket). */
  specialistPhotoPath: string | null;
}

export interface BookableCatalog {
  services: PublicService[];
  offers: BookableOffer[];
}

/** Why a booking step was refused (the RPC's hint). */
export type BookingErrorCode =
  | "slot_unavailable"
  | "not_bookable"
  | "too_many_holds"
  | "hold_expired"
  | "consent_required"
  | "invalid_details"
  | "details_required"
  | "amount_mismatch"
  | "not_found"
  | "not_cancellable"
  | "not_reschedulable"
  | "unknown";

const BOOKING_ERROR_CODES = new Set<string>([
  "slot_unavailable",
  "not_bookable",
  "too_many_holds",
  "hold_expired",
  "consent_required",
  "invalid_details",
  "not_found",
  "not_cancellable",
  "not_reschedulable",
]);

export class BookingError extends Error {
  override name = "BookingError";
  constructor(
    readonly code: BookingErrorCode,
    message: string,
  ) {
    super(message);
  }
}

export function bookingError(error: { message: string; hint?: string | null }) {
  const code =
    error.hint && BOOKING_ERROR_CODES.has(error.hint)
      ? (error.hint as BookingErrorCode)
      : "unknown";
  return new BookingError(code, error.message);
}

/** What can be booked now: each service once, and every offer of it. */
export async function listBookableCatalog(
  client: Client,
): Promise<BookableCatalog> {
  const { data, error } = await client.rpc("list_bookable_offers");
  if (error) throw error;

  const services = new Map<string, PublicService>();
  const offers = (data ?? []).map((row): BookableOffer => {
    if (!services.has(row.service_id)) {
      services.set(row.service_id, {
        id: row.service_id,
        slug: row.service_slug,
        name: row.service_name,
        shortDescription: row.service_short_description ?? null,
        description: row.service_description ?? null,
        category: row.service_category as ServiceCategory,
        defaultDurationMinutes: row.service_default_duration_minutes,
      });
    }
    return {
      serviceId: row.service_id,
      serviceName: row.service_name,
      serviceSlug: row.service_slug,
      specialistPublicSlug: row.specialist_slug,
      specialistName: row.specialist_name,
      specialistProfessionalTitle: row.specialist_title ?? null,
      specialistPhotoPath: row.specialist_photo_path ?? null,
      priceMinor: row.price_minor,
      currencyCode: row.currency_code,
      effectiveDurationMinutes: row.duration_minutes,
      supportsInPerson: row.supports_in_person,
      supportsOnline: row.supports_online,
      acceptingNewClients: true,
    };
  });
  return { services: [...services.values()], offers };
}

export interface BookingWindow {
  timeZone: string;
  horizonDays: number;
  holdMinutes: number;
  /** Cancelled at least this long before the visit: money back. */
  cancellationWindowHours: number;
  /** The client moves the visit themselves until this long before it… */
  rescheduleWindowHours: number;
  /** …and at most this many times. */
  maxSelfReschedules: number;
}

export async function getBookingWindow(
  client: Client,
): Promise<BookingWindow | null> {
  const { data, error } = await client.rpc("booking_window");
  if (error) throw error;
  const row = data?.[0];
  return row
    ? {
        timeZone: row.time_zone,
        horizonDays: row.horizon_days,
        holdMinutes: row.hold_minutes,
        cancellationWindowHours: row.cancellation_window_hours,
        rescheduleWindowHours: row.reschedule_window_hours,
        maxSelfReschedules: row.max_self_reschedules,
      }
    : null;
}

export interface FreeSlotsQuery {
  serviceSlug: string;
  specialistSlug: string;
  mode: VisitMode;
  /** Local dates, at most 14 days. */
  from: string;
  to: string;
  locationSlug?: string;
}

/** Free visit times: when they start and end (ISO), nothing else. */
export async function listFreeSlots(client: Client, query: FreeSlotsQuery) {
  const { data, error } = await client.rpc("list_free_slots", {
    p_service_slug: query.serviceSlug,
    p_specialist_slug: query.specialistSlug,
    p_mode: query.mode,
    p_from: query.from,
    p_to: query.to,
    p_location_slug: query.locationSlug,
  });
  if (error) throw error;
  return data ?? [];
}

export interface HoldSlotInput extends Omit<FreeSlotsQuery, "from" | "to"> {
  /** The slot's start, as list_free_slots gave it. */
  startsAt: string;
  /** Who is holding (their IP, hashed by the server): at most 5 in 15 min. */
  clientKey: string;
}

export interface HeldSlot {
  appointmentId: string;
  reference: string;
  /** The guest's key to the visit; kept in a cookie, never stored plain. */
  accessToken: string;
  holdExpiresAt: string;
}

/** Holds a free time (secret client only). Throws a BookingError. */
export async function holdSlot(
  client: Client,
  input: HoldSlotInput,
): Promise<HeldSlot> {
  const { data, error } = await client.rpc("hold_slot", {
    p_service_slug: input.serviceSlug,
    p_specialist_slug: input.specialistSlug,
    p_mode: input.mode,
    p_starts_at: input.startsAt,
    p_client_key: input.clientKey,
    p_location_slug: input.locationSlug,
  });
  if (error) throw bookingError(error);
  const row = data?.[0];
  if (!row) throw new BookingError("unknown", "The hold returned nothing");
  return {
    appointmentId: row.appointment_id,
    reference: row.reference,
    accessToken: row.access_token,
    holdExpiresAt: row.hold_expires_at,
  };
}

/** Gives a held time back; false when there was no hold to give. */
export async function releaseHold(client: Client, accessToken: string) {
  const { data, error } = await client.rpc("release_hold", {
    p_access_token: accessToken,
  });
  if (error) throw error;
  return Boolean(data);
}

export interface GuestBooking {
  reference: string;
  status: AppointmentStatus;
  mode: VisitMode;
  startsAt: string;
  endsAt: string;
  holdExpiresAt: string | null;
  serviceName: string;
  specialistName: string | null;
  roomName: string | null;
  locationName: string | null;
  priceMinor: number;
  currencyCode: string;
  /** The client's details, once saved with the consents. */
  details: {
    name: string;
    email: string;
    phone: string;
    notes: string | null;
  } | null;
  /** Times the client has moved it themselves. */
  rescheduleCount: number;
  cancelledBy: "client" | "centre" | null;
  /** What the client was owed on cancelling (null: not cancelled by them). */
  refundDueMinor: number | null;
  /** What Stripe has given back so far. */
  refundedMinor: number;
}

/** A guest's visit by its token, or null. */
export async function getBooking(
  client: Client,
  accessToken: string,
): Promise<GuestBooking | null> {
  const { data, error } = await client.rpc("get_booking", {
    p_access_token: accessToken,
  });
  if (error) throw error;
  const row = data?.[0];
  return row
    ? {
        reference: row.reference,
        status: row.status,
        mode: row.mode,
        startsAt: row.starts_at,
        endsAt: row.ends_at,
        holdExpiresAt: row.hold_expires_at ?? null,
        serviceName: row.service_name,
        specialistName: row.specialist_name ?? null,
        roomName: row.room_name ?? null,
        locationName: row.location_name ?? null,
        priceMinor: row.price_minor,
        currencyCode: row.currency_code,
        details: row.details_saved
          ? {
              name: row.client_name,
              email: row.client_email,
              phone: row.client_phone,
              notes: row.client_notes ?? null,
            }
          : null,
        rescheduleCount: row.reschedule_count,
        cancelledBy:
          row.cancelled_by === "client" || row.cancelled_by === "centre"
            ? row.cancelled_by
            : null,
        refundDueMinor: row.refund_due_minor ?? null,
        refundedMinor: row.refunded_minor,
      }
    : null;
}

/** Saves the client's details to their live hold. Throws a BookingError. */
export async function saveBookingDetails(
  client: Client,
  accessToken: string,
  details: BookingDetails,
) {
  const { error } = await client.rpc("save_booking_details", {
    p_access_token: accessToken,
    p_name: details.name,
    p_email: details.email,
    p_phone: details.phone,
    p_notes: details.notes ?? "",
    p_accept_terms: details.acceptTerms,
    p_accept_privacy: details.acceptPrivacy,
  });
  if (error) throw bookingError(error);
}
