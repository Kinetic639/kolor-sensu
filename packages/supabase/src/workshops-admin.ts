import type { Database, Json } from "@repo/contracts/database";
import type { SupabaseClient } from "@supabase/supabase-js";
import { uploadSiteImage } from "./cms";
import type { WorkshopModality, WorkshopStatus } from "./workshops";

// Workshops in the admin portal (docs/product/workshops-plan.md, PR 2;
// migration 20261023120000_workshop_admin.sql): the list with seats and
// money, one workshop for its form, saving it whole, publishing,
// withdrawing, deleting, confirming and cancelling, and the site's two
// switches. The database checks the admin role; a refusal keeps its hint
// (WorkshopAdminError.code, said by WORKSHOP_ADMIN_PROBLEMS in
// @repo/contracts/workshops).

type Client = SupabaseClient<Database>;

export class WorkshopAdminError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly detail: string | null = null,
  ) {
    super(message);
    this.name = "WorkshopAdminError";
  }
}

function refusal(error: {
  message: string;
  hint?: string | null;
  details?: string | null;
  code?: string;
}) {
  const code =
    error.code === "42501"
      ? "forbidden"
      : error.hint || error.code || "unknown";
  return new WorkshopAdminError(code, error.message, error.details ?? null);
}

// ------------------------------------------------------------ the list

export interface AdminWorkshopRow {
  id: string;
  slug: string;
  title: string;
  status: WorkshopStatus;
  modality: WorkshopModality;
  startsAt: string;
  endsAt: string;
  capacity: number;
  minParticipants: number | null;
  priceMinor: number;
  currencyCode: string;
  confirmed: boolean;
  registrationEnabled: boolean;
  leaders: string | null;
  locationName: string | null;
  roomName: string | null;
  confirmedCount: number;
  awaitingCount: number;
  heldCount: number;
  waitlistCount: number;
  /** Paid and not refunded, in grosze. */
  paidMinor: number;
  updatedAt: string;
}

export async function listAdminWorkshops(
  client: Client,
): Promise<AdminWorkshopRow[]> {
  const { data, error } = await client.rpc("admin_list_workshops");
  if (error) throw refusal(error);
  return (data ?? []).map((row) => ({
    id: row.id,
    slug: row.slug,
    title: row.title,
    status: row.status,
    modality: row.modality,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    capacity: row.capacity,
    minParticipants: row.min_participants,
    priceMinor: row.price_minor,
    currencyCode: row.currency_code,
    confirmed: row.confirmed,
    registrationEnabled: row.registration_enabled,
    leaders: row.leaders,
    locationName: row.location_name,
    roomName: row.room_name,
    confirmedCount: row.confirmed_count,
    awaitingCount: row.awaiting_count,
    heldCount: row.held_count,
    waitlistCount: row.waitlist_count,
    paidMinor: Number(row.paid_minor),
    updatedAt: row.updated_at,
  }));
}

// ------------------------------------------------------------ one workshop

/** One workshop as the database keeps it, for the portal's form. */
export interface AdminWorkshopRecord {
  id: string;
  slug: string;
  title: string;
  status: WorkshopStatus;
  shortDescription: string | null;
  body: Json | null;
  audience: string | null;
  agenda: string | null;
  coverPath: string | null;
  coverAlt: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  specialistId: string;
  coLeaderIds: string[];
  modality: WorkshopModality;
  locationId: string | null;
  roomId: string | null;
  startsAt: string;
  endsAt: string;
  priceMinor: number;
  capacity: number;
  minParticipants: number | null;
  registrationEnabled: boolean;
  registrationClosesAt: string | null;
  confirmedAt: string | null;
  cancelReason: string | null;
  meetingUrl: string | null;
  /** Holding, awaiting, confirmed, offered or waiting on the list now. */
  activeRegistrations: number;
  anyRegistrations: boolean;
  updatedAt: string;
}

export function adminWorkshopRecord(value: Json): AdminWorkshopRecord | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const row = value as Record<string, Json | undefined>;
  const text = (key: string) =>
    typeof row[key] === "string" ? (row[key] as string) : null;
  const number = (key: string) =>
    typeof row[key] === "number" ? (row[key] as number) : null;
  return {
    id: text("id") ?? "",
    slug: text("slug") ?? "",
    title: text("title") ?? "",
    status: (text("status") ?? "draft") as WorkshopStatus,
    shortDescription: text("short_description"),
    body: row.body ?? null,
    audience: text("audience"),
    agenda: text("agenda"),
    coverPath: text("cover_image_path"),
    coverAlt: text("cover_alt"),
    seoTitle: text("seo_title"),
    seoDescription: text("seo_description"),
    specialistId: text("specialist_id") ?? "",
    coLeaderIds: Array.isArray(row.co_leader_ids)
      ? row.co_leader_ids.filter(
          (one): one is string => typeof one === "string",
        )
      : [],
    modality: (text("modality") ?? "in_person") as WorkshopModality,
    locationId: text("location_id"),
    roomId: text("room_id"),
    startsAt: text("starts_at") ?? "",
    endsAt: text("ends_at") ?? "",
    priceMinor: number("price_minor") ?? 0,
    capacity: number("capacity") ?? 1,
    minParticipants: number("min_participants"),
    registrationEnabled: row.registration_enabled === true,
    registrationClosesAt: text("registration_closes_at"),
    confirmedAt: text("confirmed_at"),
    cancelReason: text("cancel_reason"),
    meetingUrl: text("meeting_url"),
    activeRegistrations: number("active_registrations") ?? 0,
    anyRegistrations: row.any_registrations === true,
    updatedAt: text("updated_at") ?? "",
  };
}

export async function getAdminWorkshop(
  client: Client,
  id: string,
): Promise<AdminWorkshopRecord | null> {
  const { data, error } = await client.rpc("admin_get_workshop", { p_id: id });
  if (error) throw refusal(error);
  return adminWorkshopRecord(data);
}

/** The database's shape of a workshop to save (save_workshop). */
export interface WorkshopPayload {
  slug: string;
  title: string;
  short_description: string;
  body: Json | null;
  audience: string;
  agenda: string;
  cover_image_path: string | null;
  cover_alt: string;
  seo_title: string;
  seo_description: string;
  specialist_id: string;
  co_leader_ids: string[];
  modality: WorkshopModality;
  location_id: string | null;
  room_id: string | null;
  starts_at: string;
  ends_at: string;
  price_minor: number;
  capacity: number;
  min_participants: number | null;
  registration_enabled: boolean;
  registration_closes_at: string | null;
  meeting_url: string;
}

/** Saves a workshop whole (id null: a new draft); its id. */
export async function saveWorkshop(
  client: Client,
  id: string | null,
  payload: WorkshopPayload,
): Promise<string> {
  const { data, error } = await client.rpc("save_workshop", {
    p_id: id,
    p_data: payload as unknown as Json,
  });
  if (error) throw refusal(error);
  return data;
}

async function call(
  client: Client,
  name:
    | "publish_workshop"
    | "unpublish_workshop"
    | "delete_workshop"
    | "confirm_workshop",
  id: string,
) {
  const { error } = await client.rpc(name, { p_id: id });
  if (error) throw refusal(error);
}

export const publishWorkshop = (client: Client, id: string) =>
  call(client, "publish_workshop", id);
export const unpublishWorkshop = (client: Client, id: string) =>
  call(client, "unpublish_workshop", id);
export const deleteWorkshop = (client: Client, id: string) =>
  call(client, "delete_workshop", id);
export const confirmWorkshop = (client: Client, id: string) =>
  call(client, "confirm_workshop", id);

/** Cancels the workshop; who is owed a refund now, and how much. */
export async function cancelWorkshop(
  client: Client,
  id: string,
  reason: string | null,
): Promise<
  { registrationId: string; reference: string; refundMinor: number }[]
> {
  const { data, error } = await client.rpc("cancel_workshop", {
    p_id: id,
    p_reason: reason,
  });
  if (error) throw refusal(error);
  return (data ?? []).map((row) => ({
    registrationId: row.registration_id,
    reference: row.reference,
    refundMinor: row.refund_minor,
  }));
}

/** A registration's paid Stripe payments still to give back (service role). */
export async function refundableWorkshopPayments(
  secretClient: Client,
  registrationId: string,
): Promise<
  { paymentIntentId: string; amountMinor: number; refundedMinor: number }[]
> {
  const { data, error } = await secretClient
    .from("workshop_payments")
    .select("payment_intent_id, amount_minor, refunded_minor")
    .eq("registration_id", registrationId)
    .in("status", ["succeeded", "partially_refunded"]);
  if (error) throw error;
  return data.flatMap((row) =>
    row.payment_intent_id && row.amount_minor > row.refunded_minor
      ? [
          {
            paymentIntentId: row.payment_intent_id,
            amountMinor: row.amount_minor,
            refundedMinor: row.refunded_minor,
          },
        ]
      : [],
  );
}

/** A workshop's cover, in the public site-media bucket (admins only). */
export function uploadWorkshopImage(client: Client, file: File) {
  return uploadSiteImage(client, file, "workshops");
}

// ------------------------------------------------------------ the site's switches

export interface WorkshopVisibility {
  inMenu: boolean;
  onHome: boolean;
}

/** Whether the site shows Warsztaty in its menu and on its homepage. */
export async function getWorkshopVisibility(
  client: Client,
): Promise<WorkshopVisibility> {
  const { data, error } = await client.rpc("workshop_visibility");
  if (error) throw error;
  const row = data?.[0];
  return { inMenu: row?.in_menu ?? true, onHome: row?.on_home ?? true };
}

export async function setWorkshopVisibility(
  client: Client,
  visibility: Partial<WorkshopVisibility>,
) {
  const { error } = await client.rpc("set_workshop_visibility", {
    p_in_menu: visibility.inMenu ?? null,
    p_on_home: visibility.onHome ?? null,
  });
  if (error) throw refusal(error);
}
