import type { Database, Json } from "@repo/contracts/database";
import type { SupabaseClient } from "@supabase/supabase-js";

// Workshops (docs/product/workshops-plan.md; migrations
// 20261023080000_workshop_registrations.sql, 20261023090000_workshop_signup.sql).
// The site reads public workshops with anyone's client; the guest's steps
// (hold a seat, details, pay or pay later, the waitlist, the code) and the
// payment's settling run on the site's server with the service-role
// client, as the visit booking does. A refusal keeps the database's hint
// (WorkshopError.code), which the site says in Polish.

type Client = SupabaseClient<Database>;

export type WorkshopModality = Database["public"]["Enums"]["workshop_modality"];
export type WorkshopStatus = Database["public"]["Enums"]["workshop_status"];
export type WorkshopRegistrationStatus =
  Database["public"]["Enums"]["workshop_registration_status"];

const REFUSALS = [
  "not_found",
  "registration_closed",
  "full",
  "seats_free",
  "too_many_holds",
  "hold_expired",
  "details_required",
  "consent_required",
  "already_registered",
  "invalid_details",
  "pay_now_required",
  "payment_required",
  "free",
  "amount_mismatch",
  "already_cancelled",
  "too_late",
  "not_transferable",
  "code_unknown",
  "code_not_started",
  "code_expired",
  "code_not_here",
  "code_too_big",
  "code_used_up",
  "too_many_attempts",
] as const;

export type WorkshopRefusal = (typeof REFUSALS)[number] | "unknown";

export class WorkshopError extends Error {
  constructor(
    readonly code: WorkshopRefusal,
    message: string,
  ) {
    super(message);
    this.name = "WorkshopError";
  }
}

/** The database's error as a WorkshopError (its hint, or "unknown"). */
function refusal(error: { message: string; hint?: string | null }) {
  const hint = (REFUSALS as readonly string[]).includes(error.hint ?? "")
    ? (error.hint as WorkshopRefusal)
    : "unknown";
  return new WorkshopError(hint, error.message);
}

// ------------------------------------------------------------ the site

export interface WorkshopLeader {
  slug: string;
  name: string;
  title: string | null;
  photoPath: string | null;
}

export interface PublicWorkshop {
  id: string;
  slug: string;
  title: string;
  shortDescription: string | null;
  body: Json | null;
  audience: string | null;
  agenda: string | null;
  coverPath: string | null;
  coverAlt: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  modality: WorkshopModality;
  status: WorkshopStatus;
  startsAt: string;
  endsAt: string;
  priceMinor: number;
  currencyCode: string;
  capacity: number;
  minParticipants: number | null;
  locationName: string | null;
  locationAddress: string | null;
  /** How to get there (the location's, #211). */
  locationDirections: string | null;
  locationCity: string | null;
  roomName: string | null;
  leaders: WorkshopLeader[];
  seatsLeft: number;
  registrationOpen: boolean;
  /** Going ahead: enough paid seats, the admin's word, or no minimum. */
  confirmed: boolean;
  updatedAt: string;
}

function leadersOf(value: Json): WorkshopLeader[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) return [];
    const { slug, name, title, photoPath } = item as Record<string, unknown>;
    if (typeof slug !== "string" || typeof name !== "string") return [];
    return [
      {
        slug,
        name,
        title: typeof title === "string" ? title : null,
        photoPath: typeof photoPath === "string" ? photoPath : null,
      },
    ];
  });
}

/** The current address of a workshop whose address changed, or null (#184). */
export async function getWorkshopSlugRedirect(
  client: Client,
  oldSlug: string,
): Promise<string | null> {
  const { data, error } = await client.rpc("workshop_redirect", {
    p_slug: oldSlug,
  });
  if (error) throw error;
  return data ?? null;
}

/** Every non-draft workshop, soonest first (few: the pages filter). */
export async function listPublicWorkshops(
  client: Client,
): Promise<PublicWorkshop[]> {
  const { data, error } = await client.rpc("list_public_workshops");
  if (error) throw error;
  return (data ?? []).map(toPublicWorkshop);
}

/**
 * A workshop as its page shows it, any status (a draft too), for the
 * admin's preview (#197; the site's secret client, in Draft Mode only).
 */
export async function getWorkshopPreview(
  secretClient: Client,
  id: string,
): Promise<PublicWorkshop | null> {
  const { data, error } = await secretClient.rpc("workshop_preview", {
    p_id: id,
  });
  if (error) throw error;
  const [row] = data ?? [];
  return row ? toPublicWorkshop(row) : null;
}

type PublicWorkshopRow =
  Database["public"]["Functions"]["list_public_workshops"]["Returns"][number];

function toPublicWorkshop(row: PublicWorkshopRow): PublicWorkshop {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    shortDescription: row.short_description,
    body: row.body,
    audience: row.audience,
    agenda: row.agenda,
    coverPath: row.cover_image_path,
    coverAlt: row.cover_alt,
    seoTitle: row.seo_title,
    seoDescription: row.seo_description,
    modality: row.modality,
    status: row.status,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    priceMinor: row.price_minor,
    currencyCode: row.currency_code,
    capacity: row.capacity,
    minParticipants: row.min_participants,
    locationName: row.location_name,
    locationAddress: row.location_address,
    locationDirections: row.location_directions,
    locationCity: row.location_city,
    roomName: row.room_name,
    leaders: leadersOf(row.leaders),
    seatsLeft: row.seats_left,
    registrationOpen: row.registration_open,
    confirmed: row.confirmed,
    updatedAt: row.updated_at,
  };
}

/** A workshop's cover in the public site-media bucket. */
export function workshopImageUrl(client: Client, path: string): string {
  return client.storage.from("site-media").getPublicUrl(path).data.publicUrl;
}

// ------------------------------------------------------------ the guest

export interface WorkshopDetails {
  name: string;
  email: string;
  phone: string;
  notes?: string | null;
}

export interface HeldSeat {
  reference: string;
  accessToken: string;
  holdExpiresAt: string;
}

/** Holds a seat (service role). Refusals: full, registration_closed, too_many_holds. */
export async function holdWorkshopSeat(
  secretClient: Client,
  slug: string,
  clientKey: string,
): Promise<HeldSeat> {
  const { data, error } = await secretClient.rpc("hold_workshop_seat", {
    p_slug: slug,
    p_client_key: clientKey,
  });
  if (error) throw refusal(error);
  const row = data![0]!;
  return {
    reference: row.reference,
    accessToken: row.access_token,
    holdExpiresAt: row.hold_expires_at,
  };
}

export async function saveWorkshopDetails(
  secretClient: Client,
  token: string,
  details: WorkshopDetails,
) {
  const { error } = await secretClient.rpc(
    "save_workshop_registration_details",
    {
      p_access_token: token,
      p_name: details.name,
      p_email: details.email,
      p_phone: details.phone,
      p_notes: details.notes ?? null,
      p_accept_terms: true,
      p_accept_privacy: true,
    },
  );
  if (error) throw refusal(error);
}

/** "Zapłacę później": due seven days before. Refusal: pay_now_required. */
export async function reserveWorkshopSeat(secretClient: Client, token: string) {
  const { data, error } = await secretClient.rpc("reserve_workshop_seat", {
    p_access_token: token,
  });
  if (error) throw refusal(error);
  const row = data![0]!;
  return { reference: row.reference, paymentDueAt: row.payment_due_at };
}

export async function confirmFreeWorkshopSeat(
  secretClient: Client,
  token: string,
): Promise<string> {
  const { data, error } = await secretClient.rpc("confirm_free_workshop_seat", {
    p_access_token: token,
  });
  if (error) throw refusal(error);
  return data;
}

export async function joinWorkshopWaitlist(
  secretClient: Client,
  slug: string,
  clientKey: string,
  details: WorkshopDetails,
) {
  const { data, error } = await secretClient.rpc("join_workshop_waitlist", {
    p_slug: slug,
    p_client_key: clientKey,
    p_name: details.name,
    p_email: details.email,
    p_phone: details.phone,
    p_notes: details.notes ?? null,
    p_accept_terms: true,
    p_accept_privacy: true,
  });
  if (error) throw refusal(error);
  const row = data![0]!;
  return { reference: row.reference, accessToken: row.access_token };
}

export interface WorkshopRegistration {
  reference: string;
  status: WorkshopRegistrationStatus;
  workshopSlug: string;
  workshopTitle: string;
  workshopStatus: WorkshopStatus;
  workshopConfirmed: boolean;
  modality: WorkshopModality;
  startsAt: string;
  endsAt: string;
  locationName: string | null;
  locationAddress: string | null;
  /** How to get there (the location's, #211). */
  locationDirections: string | null;
  roomName: string | null;
  priceMinor: number;
  currencyCode: string;
  paidMinor: number;
  refundDueMinor: number;
  refundedMinor: number;
  details: WorkshopDetails | null;
  holdExpiresAt: string | null;
  paymentDueAt: string | null;
  offerExpiresAt: string | null;
  waitlistPosition: number | null;
  fullRefundUntil: string;
  canPayLater: boolean;
  cancelledBy: string | null;
  meetingUrl: string | null;
  discount: {
    code: string;
    listPriceMinor: number;
    discountMinor: number;
  } | null;
  /** After a new date: a full refund whenever the seat is given up. */
  refundAnyTime: boolean;
  /** Given up late: refunded once the waitlist takes the seat. */
  refundWhenReplaced: boolean;
  workshopCancelReason: string | null;
  /** Paid to the centre directly: nothing to refund through the site. */
  paidOutside: boolean;
}

/** A registration by the guest's token (their hold's or an e-mail's). */
export async function getWorkshopRegistration(
  secretClient: Client,
  token: string,
): Promise<WorkshopRegistration | null> {
  const { data, error } = await secretClient.rpc("get_workshop_registration", {
    p_access_token: token,
  });
  if (error) throw error;
  const row = data?.[0];
  if (!row) return null;
  return {
    reference: row.reference,
    status: row.status,
    workshopSlug: row.workshop_slug,
    workshopTitle: row.workshop_title,
    workshopStatus: row.workshop_status,
    workshopConfirmed: row.workshop_confirmed,
    modality: row.modality,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    locationName: row.location_name,
    locationAddress: row.location_address,
    locationDirections: row.location_directions,
    roomName: row.room_name,
    priceMinor: row.price_minor,
    currencyCode: row.currency_code,
    paidMinor: row.paid_minor,
    refundDueMinor: row.refund_due_minor,
    refundedMinor: row.refunded_minor,
    details:
      row.details_saved && row.client_email
        ? {
            name: row.client_name ?? "",
            email: row.client_email,
            phone: row.client_phone ?? "",
            notes: row.client_notes ?? undefined,
          }
        : null,
    holdExpiresAt: row.hold_expires_at,
    paymentDueAt: row.payment_due_at,
    offerExpiresAt: row.offer_expires_at,
    waitlistPosition: row.waitlist_position,
    fullRefundUntil: row.full_refund_until,
    canPayLater: row.can_pay_later,
    cancelledBy: row.cancelled_by,
    meetingUrl: row.meeting_url,
    discount:
      row.discount_code && row.list_price_minor !== null
        ? {
            code: row.discount_code,
            listPriceMinor: row.list_price_minor,
            discountMinor: row.discount_minor,
          }
        : null,
    refundAnyTime: row.refund_any_time,
    refundWhenReplaced: row.refund_when_replaced,
    workshopCancelReason: row.workshop_cancel_reason,
    paidOutside: row.paid_outside,
  };
}

/**
 * Gives a seat (or a waitlist place) up: the refund due now, and whether
 * one follows when the waitlist takes the seat.
 */
export async function cancelWorkshopRegistration(
  secretClient: Client,
  token: string,
) {
  const { data, error } = await secretClient.rpc(
    "cancel_workshop_registration",
    { p_access_token: token },
  );
  if (error) throw refusal(error);
  const row = data![0]!;
  return {
    reference: row.reference,
    refundMinor: row.refund_minor,
    refundWhenReplaced: row.refund_when_replaced,
  };
}

/** A code on the seat; its new price. Refusals: code_unknown, code_not_here… */
export async function applyWorkshopDiscount(
  secretClient: Client,
  token: string,
  code: string,
) {
  const { data, error } = await secretClient.rpc("apply_workshop_discount", {
    p_access_token: token,
    p_code: code,
  });
  if (error) throw refusal(error);
  return { priceMinor: data![0]!.price_minor };
}

export async function removeWorkshopDiscount(
  secretClient: Client,
  token: string,
) {
  const { error } = await secretClient.rpc("remove_workshop_discount", {
    p_access_token: token,
  });
  if (error) throw refusal(error);
}

// ------------------------------------------------------------ paying

export async function attachWorkshopCheckout(
  secretClient: Client,
  token: string,
  session: {
    sessionId: string;
    expiresAt: string;
    amountMinor: number;
    currencyCode: string;
  },
) {
  const { error } = await secretClient.rpc("attach_workshop_checkout", {
    p_access_token: token,
    p_session_id: session.sessionId,
    p_expires_at: session.expiresAt,
    p_amount_minor: session.amountMinor,
    p_currency_code: session.currencyCode,
  });
  if (error) throw refusal(error);
}

export async function pendingWorkshopCheckout(
  secretClient: Client,
  token: string,
): Promise<string | null> {
  const { data, error } = await secretClient.rpc("pending_workshop_checkout", {
    p_access_token: token,
  });
  if (error) throw error;
  return data ?? null;
}

export type WorkshopFulfillment =
  | "confirmed"
  | "already_confirmed"
  | "pending"
  | "seat_lost"
  | "unknown_session";

export async function fulfillWorkshopCheckout(
  secretClient: Client,
  sessionId: string,
  paid: boolean,
  paymentIntentId: string | null,
): Promise<WorkshopFulfillment> {
  const { data, error } = await secretClient.rpc("fulfill_workshop_checkout", {
    p_session_id: sessionId,
    p_paid: paid,
    p_payment_intent_id: paymentIntentId,
  });
  if (error) throw error;
  return data as WorkshopFulfillment;
}

export async function failWorkshopCheckout(
  secretClient: Client,
  sessionId: string,
  reason: "failed" | "expired",
) {
  const { error } = await secretClient.rpc("fail_workshop_checkout", {
    p_session_id: sessionId,
    p_reason: reason,
  });
  if (error) throw error;
}

export async function recordWorkshopRefund(
  secretClient: Client,
  paymentIntentId: string,
  refundedMinor: number,
): Promise<boolean> {
  const { data, error } = await secretClient.rpc("record_workshop_refund", {
    p_payment_intent_id: paymentIntentId,
    p_refunded_minor: refundedMinor,
  });
  if (error) throw error;
  return data;
}

/** Ends holds, offers and unpaid seats that ran out (the scheduled job). */
export async function runWorkshopJobs(secretClient: Client): Promise<number> {
  const { data, error } = await secretClient.rpc("run_workshop_jobs");
  if (error) throw error;
  return data;
}

// ------------------------------------------------------------ e-mails

export type WorkshopEmailKind =
  | "confirmation"
  | "reserved"
  | "waitlisted"
  | "offered"
  | "payment_reminder"
  | "reminder"
  | "cancelled"
  | "rescheduled"
  | "refunded";

export interface ClaimedWorkshopEmail {
  reference: string;
  manageToken: string;
  clientName: string;
  clientEmail: string;
  workshopTitle: string;
  workshopSlug: string;
  modality: WorkshopModality;
  startsAt: string;
  endsAt: string;
  locationName: string | null;
  locationAddress: string | null;
  /** How to get there (the location's, #211). */
  locationDirections: string | null;
  roomName: string | null;
  leaders: string | null;
  priceMinor: number;
  paidMinor: number;
  currencyCode: string;
  paymentDueAt: string | null;
  waitlistPosition: number | null;
  offerExpiresAt: string | null;
  cancelledBy: string | null;
  /** The workshop's own, when the centre cancelled it. */
  cancelReason: string | null;
  refundDueMinor: number;
  refundedMinor: number;
  refundWhenReplaced: boolean;
  /** The online meeting's link, once the seat is confirmed. */
  meetingUrl: string | null;
  paidOutside: boolean;
}

/** Claims an e-mail nobody sent yet: what it says and its link token. */
export async function claimWorkshopEmail(
  secretClient: Client,
  reference: string,
  kind: WorkshopEmailKind,
): Promise<ClaimedWorkshopEmail | null> {
  const { data, error } = await secretClient.rpc("claim_workshop_email", {
    p_reference: reference,
    p_kind: kind,
  });
  if (error) throw error;
  const row = data?.[0];
  if (!row) return null;
  return {
    reference: row.reference,
    manageToken: row.manage_token,
    clientName: row.client_name ?? "",
    clientEmail: row.client_email,
    workshopTitle: row.workshop_title,
    workshopSlug: row.workshop_slug,
    modality: row.modality,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    locationName: row.location_name,
    locationAddress: row.location_address,
    locationDirections: row.location_directions,
    roomName: row.room_name,
    leaders: row.leaders,
    priceMinor: row.price_minor,
    paidMinor: row.paid_minor,
    currencyCode: row.currency_code,
    paymentDueAt: row.payment_due_at,
    waitlistPosition: row.waitlist_position,
    offerExpiresAt: row.offer_expires_at,
    cancelledBy: row.cancelled_by,
    cancelReason: row.cancel_reason,
    refundDueMinor: row.refund_due_minor,
    refundedMinor: row.refunded_minor,
    refundWhenReplaced: row.refund_when_replaced,
    meetingUrl: row.meeting_url,
    paidOutside: row.paid_outside,
  };
}

/** The e-mails events call for and nobody sent (the scheduled job). */
export async function listDueWorkshopEmails(
  secretClient: Client,
): Promise<{ reference: string; kind: WorkshopEmailKind }[]> {
  const { data, error } = await secretClient.rpc("list_due_workshop_emails");
  if (error) throw error;
  return (data ?? []).map((row) => ({
    reference: row.reference,
    kind: row.kind as WorkshopEmailKind,
  }));
}

/** Registrations owed money not given back yet (the scheduled job). */
export async function listOwedWorkshopRefunds(
  secretClient: Client,
): Promise<{ registrationId: string; reference: string; owedMinor: number }[]> {
  const { data, error } = await secretClient.rpc("list_owed_workshop_refunds");
  if (error) throw error;
  return (data ?? []).map((row) => ({
    registrationId: row.registration_id,
    reference: row.reference,
    owedMinor: row.owed_minor,
  }));
}

/** Tells the admins of minimums not reached in time; how many. */
export async function remindWorkshopMinimums(
  secretClient: Client,
): Promise<number> {
  const { data, error } = await secretClient.rpc("remind_workshop_minimums");
  if (error) throw error;
  return data;
}

export async function markWorkshopEmailSent(
  secretClient: Client,
  reference: string,
  kind: WorkshopEmailKind,
  messageId: string,
) {
  const { error } = await secretClient.rpc("mark_workshop_email_sent", {
    p_reference: reference,
    p_kind: kind,
    p_message_id: messageId,
  });
  if (error) throw error;
}

export async function releaseWorkshopEmail(
  secretClient: Client,
  reference: string,
  kind: WorkshopEmailKind,
) {
  const { error } = await secretClient.rpc("release_workshop_email", {
    p_reference: reference,
    p_kind: kind,
  });
  if (error) throw error;
}

// ------------------------------------------------------------ the admin

/** The workshops a discount code may be for: those not over or cancelled. */
export async function listWorkshopsForCodes(
  client: Client,
): Promise<{ id: string; title: string }[]> {
  const { data, error } = await client
    .from("workshops")
    .select("id, title, starts_at")
    .in("status", ["draft", "published"])
    .gte("ends_at", new Date().toISOString())
    .order("starts_at");
  if (error) throw error;
  return data.map(({ id, title }) => ({ id, title }));
}

/** A registration's id by its reference (service role). */
export async function workshopRegistrationId(
  secretClient: Client,
  reference: string,
): Promise<string | null> {
  const { data, error } = await secretClient
    .from("workshop_registrations")
    .select("id")
    .eq("reference", reference)
    .maybeSingle();
  if (error) throw error;
  return data?.id ?? null;
}

/** The participant passes the seat on (no refund). */
export async function transferWorkshopSeat(
  secretClient: Client,
  token: string,
  person: { name: string; email: string; phone: string },
) {
  const { error } = await secretClient.rpc("transfer_workshop_seat", {
    p_access_token: token,
    p_name: person.name,
    p_email: person.email,
    p_phone: person.phone,
  });
  if (error) throw refusal(error);
}
