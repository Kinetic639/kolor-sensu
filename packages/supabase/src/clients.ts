import type { Database } from "@repo/contracts/database";
import type { SupabaseClient } from "@supabase/supabase-js";
import { toVisit, type Visit } from "./visits";

// The centre's clients (docs/product/booking-plan.md, R15), admins only: a
// person who booked, one per e-mail address, linked to their visits by the
// database. The list with their visits' totals, a client's card with every
// visit, and correcting their details and the centre's internal note.

type Client = SupabaseClient<Database>;

export interface CentreClient {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  /** The centre's internal note (never shown to the client or specialists). */
  notes: string | null;
  /** Visits that take place (paid or waiting for payment). */
  visits: number;
  upcoming: number;
  cancelled: number;
  lastVisitAt: string | null;
  nextVisitAt: string | null;
  /** Paid, less what was given back. */
  paidMinor: number;
  createdAt: string;
}

export type ClientSort =
  "name" | "last_visit" | "next_visit" | "visits" | "paid" | "created";

export interface ClientSearch {
  /** Words to find in the name, e-mail or phone. */
  query?: string | null;
  /** With a visit to come (true), without (false), either (null). */
  upcoming?: boolean | null;
  /** Their last visit from, and before (instants). */
  lastFrom?: string | null;
  lastTo?: string | null;
  /** A client from, and before. */
  createdFrom?: string | null;
  createdTo?: string | null;
  sort: ClientSort;
  descending: boolean;
  /** 1–100. */
  limit: number;
  offset: number;
}

export type ClientErrorCode =
  | "not_found"
  | "email_taken"
  | "invalid_details"
  | "forbidden"
  /** A visit to come, or money owed back: their details stay for now. */
  | "client_busy"
  | "already_forgotten"
  | "same_client"
  | "unknown";

const HINTS = new Set<string>([
  "not_found",
  "email_taken",
  "invalid_details",
  "client_busy",
  "already_forgotten",
  "same_client",
]);

export class ClientError extends Error {
  override name = "ClientError";
  constructor(
    readonly code: ClientErrorCode,
    message: string,
  ) {
    super(message);
  }
}

function clientError(error: {
  message: string;
  hint?: string | null;
  code?: string;
}) {
  if (error.code === "42501")
    return new ClientError("forbidden", error.message);
  const hint = error.hint ?? "";
  return new ClientError(
    HINTS.has(hint) ? (hint as ClientErrorCode) : "unknown",
    error.message,
  );
}

interface ClientRowLike {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  notes: string | null;
  visits: number;
  upcoming: number;
  cancelled: number;
  last_visit_at: string | null;
  next_visit_at: string | null;
  paid_minor: number;
  created_at: string;
}

function toClient(row: ClientRowLike): CentreClient {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    phone: row.phone,
    notes: row.notes,
    visits: row.visits,
    upcoming: row.upcoming,
    cancelled: row.cancelled,
    lastVisitAt: row.last_visit_at,
    nextVisitAt: row.next_visit_at,
    paidMinor: row.paid_minor,
    createdAt: row.created_at,
  };
}

/** One page of clients and how many match in all. */
export async function searchClients(
  client: Client,
  search: ClientSearch,
): Promise<{ clients: CentreClient[]; total: number }> {
  const { data, error } = await client.rpc("search_clients", {
    p_query: search.query ?? undefined,
    p_upcoming: search.upcoming ?? undefined,
    p_last_from: search.lastFrom ?? undefined,
    p_last_to: search.lastTo ?? undefined,
    p_created_from: search.createdFrom ?? undefined,
    p_created_to: search.createdTo ?? undefined,
    p_sort: search.sort,
    p_desc: search.descending,
    p_limit: search.limit,
    p_offset: search.offset,
  });
  if (error) throw clientError(error);
  const rows = data ?? [];
  return {
    clients: rows.map(toClient),
    total: Number(rows[0]?.total_count ?? 0),
  };
}

/** A client's card, or null when there is no such client. */
export async function getClient(
  client: Client,
  id: string,
): Promise<CentreClient | null> {
  const { data, error } = await client.rpc("get_client", { p_id: id });
  if (error) throw clientError(error);
  const row = data?.[0];
  return row ? toClient(row) : null;
}

/** The client a visit was booked by, or null (none linked, e.g. a hold). */
export async function getVisitClient(
  client: Client,
  visitId: string,
): Promise<CentreClient | null> {
  const { data, error } = await client.rpc("get_visit_client", {
    p_visit_id: visitId,
  });
  if (error) throw clientError(error);
  const row = data?.[0];
  return row ? toClient(row) : null;
}

/** Every visit of a client, latest first. */
export async function listClientVisits(
  client: Client,
  clientId: string,
): Promise<Visit[]> {
  const { data, error } = await client.rpc("list_client_visits", {
    p_client_id: clientId,
  });
  if (error) throw clientError(error);
  return (data ?? []).map(toVisit);
}

export interface ClientDetails {
  name: string;
  email: string;
  phone: string | null;
  notes: string | null;
}

/**
 * Corrects a client's details and note; their visits still to come follow.
 * How many of those changed. Throws a ClientError.
 */
export async function updateClient(
  client: Client,
  id: string,
  details: ClientDetails,
): Promise<{ upcomingUpdated: number }> {
  const { data, error } = await client.rpc("admin_update_client", {
    p_id: id,
    p_name: details.name,
    p_email: details.email,
    p_phone: details.phone,
    p_notes: details.notes,
  });
  if (error) throw clientError(error);
  return { upcomingUpdated: data?.[0]?.upcoming_updated ?? 0 };
}

/**
 * Removes who the client was, at their request (RODO): their name, e-mail,
 * phone and notes, on them and their visits, and the questionnaire's
 * answers; the visits and payments stay. Refused while a visit is to come
 * or money is owed back to them.
 */
export async function forgetClient(client: Client, id: string) {
  const { error } = await client.rpc("forget_client", { p_client: id });
  if (error) throw clientError(error);
}

/** What the next night removes: clients' details and answers past keeping. */
export async function retentionPreview(client: Client) {
  const { data, error } = await client.rpc("retention_preview");
  if (error) throw error;
  return { clients: data?.[0]?.clients ?? 0, intakes: data?.[0]?.intakes ?? 0 };
}

export interface ClientDuplicate {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  /** Why it may be the same person. */
  reason: "name" | "phone";
}

/** Other cards likely of the same person (the same name or phone). */
export async function clientDuplicates(
  client: Client,
  id: string,
): Promise<ClientDuplicate[]> {
  const { data, error } = await client.rpc("client_duplicates", {
    p_client: id,
  });
  if (error) throw error;
  return (data ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    email: row.email,
    phone: row.phone,
    reason: row.reason === "phone" ? "phone" : "name",
  }));
}

/**
 * Merges another card into this one: its visits come over (those to come
 * take this card's details), the notes are put together, the other goes.
 */
export async function mergeClients(
  client: Client,
  keep: string,
  merge: string,
) {
  const { data, error } = await client.rpc("merge_clients", {
    p_keep: keep,
    p_merge: merge,
  });
  if (error) throw clientError(error);
  return data ?? 0;
}
