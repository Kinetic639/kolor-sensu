import { nameParts } from "@repo/contracts/person-name";
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
  | "specialist_busy"
  | "room_busy"
  | "room_closed"
  /** The whole centre is closed that day (Dni zamknięcia). */
  | "centre_closed"
  | "room_required"
  | "time_off"
  | "in_the_past"
  | "forbidden"
  | "too_soon"
  | "pay_now_required"
  | "not_payable"
  | "recently_sent"
  | "refund_too_high"
  | "not_paid"
  | "nothing_changed"
  /** Nothing owed to settle (R14). */
  | "nothing_owed"
  /** Settled a moment ago: a double click refunds once. */
  | "recently_settled"
  /** The service asks for the questionnaire first, and there is none. */
  | "intake_required"
  /** A visit within 14 days, without the client's request (card 15). */
  | "early_start_required"
  /** A service for minors, not confirmed by a parent or guardian (card 16). */
  | "guardian_required"
  /** The same person (e-mail or phone) has a visit at that time (card 17). */
  | "client_overlap"
  /** No link to send again: the visit is past, cancelled or has no e-mail. */
  | "nothing_to_send"
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
  "specialist_busy",
  "room_busy",
  "room_closed",
  "centre_closed",
  "room_required",
  "time_off",
  "in_the_past",
  "details_required",
  "amount_mismatch",
  "too_soon",
  "pay_now_required",
  "not_payable",
  "recently_sent",
  "refund_too_high",
  "not_paid",
  "nothing_changed",
  "nothing_owed",
  "recently_settled",
  "intake_required",
  "early_start_required",
  "guardian_required",
  "client_overlap",
  "nothing_to_send",
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
  /** A reservation is paid by this long before the visit (R11). */
  paymentDueHours: number;
  /**
   * The schedule's grid: visits start on it, and the times specialists are
   * available, rooms open and are blocked lie on it (every 60 min).
   */
  slotStepMinutes: number;
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
        paymentDueHours: row.payment_due_hours,
        slotStepMinutes: row.slot_step_minutes ?? 60,
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

/**
 * The soonest free time of the offer from a day on, within the booking
 * horizon (ISO), or null when nothing is free (#203).
 */
export async function nextFreeSlot(
  client: Client,
  query: Omit<FreeSlotsQuery, "to">,
): Promise<string | null> {
  const { data, error } = await client.rpc("next_free_slot", {
    p_service_slug: query.serviceSlug,
    p_specialist_slug: query.specialistSlug,
    p_mode: query.mode,
    p_from: query.from,
    p_location_slug: query.locationSlug,
  });
  if (error) throw error;
  return data ?? null;
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
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    notes: string | null;
  } | null;
  /** Times the client has moved it themselves. */
  rescheduleCount: number;
  /** "system": not paid in time. */
  cancelledBy: "client" | "centre" | "system" | null;
  /** What the client was owed on cancelling (null: not cancelled by them). */
  refundDueMinor: number | null;
  /** What Stripe has given back so far. */
  refundedMinor: number;
  /** The client online, or the centre (then paid from the e-mail link). */
  bookedBy: "client" | "centre";
  /** Paid online. */
  paid: boolean;
  /** A reservation: to be paid by then, or it is cancelled. */
  paymentDueAt: string | null;
  /** The last change of its time, room or form was the centre's. */
  movedByCentre: boolean;
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
              ...nameParts(
                row.client_name,
                row.client_first_name,
                row.client_last_name,
              ),
              email: row.client_email,
              phone: row.client_phone,
              notes: row.client_notes ?? null,
            }
          : null,
        rescheduleCount: row.reschedule_count,
        cancelledBy: cancelledByOf(row.cancelled_by),
        refundDueMinor: row.refund_due_minor ?? null,
        refundedMinor: row.refunded_minor,
        bookedBy: row.booked_by === "centre" ? "centre" : "client",
        paid: row.paid,
        paymentDueAt: row.payment_due_at ?? null,
        movedByCentre: row.moved_by_centre,
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
    p_first_name: details.firstName,
    p_last_name: details.lastName,
    p_email: details.email,
    p_phone: details.phone,
    p_notes: details.notes ?? "",
    p_accept_terms: details.acceptTerms,
    p_accept_privacy: details.acceptPrivacy,
    p_accept_early_start: details.acceptEarlyStart,
    p_confirm_guardian: details.confirmGuardian,
  });
  if (error) throw bookingError(error);
}

/** What the held visit asks of its client (cards 15, 16); null: no hold. */
export interface BookingRequirements {
  /** Within 14 days of booking: the request to start early. */
  earlyStart: boolean;
  /** A service for minors: a parent's or guardian's confirmation. */
  guardian: boolean;
}

export async function getBookingRequirements(
  client: Client,
  accessToken: string,
): Promise<BookingRequirements | null> {
  const { data, error } = await client.rpc("booking_requirements", {
    p_access_token: accessToken,
  });
  if (error) throw error;
  const row = data?.[0];
  return row ? { earlyStart: row.early_start, guardian: row.guardian } : null;
}

export function cancelledByOf(value: string | null | undefined) {
  return value === "client" || value === "centre" || value === "system"
    ? value
    : null;
}

/**
 * "Zarezerwuj, zapłacę później": the held visit, with the details saved, is
 * reserved until the client confirms it from its e-mail (`confirmBy`), then
 * until its payment is due (`paymentDueAt`). `pay_now`: the person has two
 * unpaid reservations already, so this one is paid at once. Throws a
 * BookingError (pay_now_required when the visit is too close to pay later).
 */
export async function reserveHold(
  client: Client,
  accessToken: string,
  clientKey?: string,
) {
  const { data, error } = await client.rpc("reserve_hold", {
    p_access_token: accessToken,
    ...(clientKey ? { p_client_key: clientKey } : {}),
  });
  if (error) throw bookingError(error);
  const row = data?.[0];
  if (!row) throw new BookingError("unknown", "Nothing was reserved");
  return {
    reference: row.reference,
    outcome:
      row.outcome === "pay_now" ? ("pay_now" as const) : ("reserved" as const),
    paymentDueAt: row.payment_due_at ?? null,
    confirmBy: row.confirm_by ?? null,
  };
}

/**
 * The client confirms their reservation from its e-mail link: the time to
 * pay by from now on, or null (nothing to confirm).
 */
export async function confirmReservation(client: Client, manageToken: string) {
  const { data, error } = await client.rpc("confirm_reservation", {
    p_manage_token: manageToken,
  });
  if (error) throw bookingError(error);
  return data ?? null;
}

/** Until when the reservation waits to be confirmed, or null. */
export async function reservationConfirmBy(
  client: Client,
  manageToken: string,
) {
  const { data, error } = await client.rpc("reservation_confirm_by", {
    p_manage_token: manageToken,
  });
  if (error) throw bookingError(error);
  return data ?? null;
}
