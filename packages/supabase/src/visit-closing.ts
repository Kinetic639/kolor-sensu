import type { Database } from "@repo/contracts/database";
import type {
  VisitClosing,
  VisitClosingView,
  VisitTag,
} from "@repo/contracts/visit-closing";
import type { SupabaseClient } from "@supabase/supabase-js";

// Closing a visit: its outcome, tags and short note (the visit's specialist
// or an admin, the database checks), how it was closed, the backlog.

type Client = SupabaseClient<Database>;

export class ClosingError extends Error {
  override name = "ClosingError";
  constructor(
    readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

const CODES = new Set(["not_found", "forbidden", "not_closable", "invalid"]);

export async function closeVisit(
  client: Client,
  visitId: string,
  closing: VisitClosing,
) {
  const { error } = await client.rpc("close_visit", {
    p_visit: visitId,
    p_outcome: closing.outcome,
    p_tags: closing.tags,
    p_note: closing.note ?? undefined,
  });
  if (error) {
    throw new ClosingError(
      error.hint && CODES.has(error.hint) ? error.hint : "unknown",
      error.message,
    );
  }
}

/** How the visit was closed, or null (not yet, or not the caller's). */
export async function getVisitClosure(
  client: Client,
  visitId: string,
): Promise<VisitClosingView | null> {
  const { data, error } = await client.rpc("get_visit_closure", {
    p_visit: visitId,
  });
  if (error) throw error;
  const row = data?.[0];
  if (!row) return null;
  return {
    outcome: row.outcome,
    tags: row.tags as VisitTag[],
    note: row.note,
    closedAt: row.closed_at,
    closedByName: row.closed_by_name,
  };
}

export interface UnclosedSummary {
  specialistId: string;
  specialistName: string;
  visits: number;
  oldestAt: string;
}

/**
 * Visits to close per specialist: an admin's all, or only the caller's own
 * (`own`: the specialist's portal, even for an admin).
 */
export async function unclosedVisitsSummary(
  client: Client,
  { own = false }: { own?: boolean } = {},
): Promise<UnclosedSummary[]> {
  const { data, error } = await client.rpc("unclosed_visits_summary", {
    p_own: own,
  });
  if (error) throw error;
  return (data ?? []).map((row) => ({
    specialistId: row.specialist_id,
    specialistName: row.specialist_name,
    visits: row.visits,
    oldestAt: row.oldest_at,
  }));
}

export interface SpecialistToRemind {
  specialistId: string;
  specialistName: string;
  email: string;
  visits: { reference: string; serviceName: string; startsAt: string }[];
}

/** The morning e-mail's list (the service key only). */
export async function visitsToCloseBySpecialist(
  client: Client,
): Promise<SpecialistToRemind[]> {
  const { data, error } = await client.rpc("visits_to_close_by_specialist");
  if (error) throw error;
  return (data ?? []).map((row) => ({
    specialistId: row.specialist_id,
    specialistName: row.specialist_name,
    email: row.email,
    visits: row.visits.map((visit) => ({
      reference: visit.reference,
      serviceName: visit.service_name,
      startsAt: visit.starts_at,
    })),
  }));
}
