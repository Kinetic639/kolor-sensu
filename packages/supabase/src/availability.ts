import {
  availabilityRuleInputSchema,
  localDateSchema,
  occurrenceScopeSchema,
  personInitials,
  personName,
  type AvailabilityRuleInput,
  type AvailabilityRuleValues,
  type OccurrenceScope,
  type RoomAvailabilityRule,
  type RoomOccupancy,
  type SpecialistAvailabilityRule,
  type SpecialistTimeOff,
} from "@repo/contracts";
import type { Database } from "@repo/contracts/database";
import type { SupabaseClient } from "@supabase/supabase-js";

// Specialist availability (docs/product/booking-plan.md, RD1). Reads go
// through RLS (own schedule, or everyone's for an admin); writes only
// through the database functions, which check overlaps and rooms.

type RuleRow =
  Database["public"]["Tables"]["specialist_availability_rules"]["Row"] & {
    exceptions?: { date: string }[];
  };
type TimeOffRow = Database["public"]["Tables"]["specialist_time_off"]["Row"];

export type AvailabilityErrorReason =
  | "overlap"
  | "room_taken"
  | "room_closed"
  | "room_unavailable"
  /** Times off the centre's grid (every full hour). */
  | "off_grid"
  | "time_off_overlap"
  | "not_found"
  | "forbidden";

/** Who already has a room, when a window is refused for it. */
export interface RoomConflict {
  specialistName: string;
  date: string;
  startsAt: string;
  endsAt: string;
}

/** A refusal from the database, with a reason the portals can explain. */
export class AvailabilityError extends Error {
  constructor(
    readonly reason: AvailabilityErrorReason,
    readonly conflict: RoomConflict | null = null,
  ) {
    super(`Availability change refused: ${reason}`);
    this.name = "AvailabilityError";
  }
}

interface PostgrestLikeError {
  code?: string;
  hint?: string | null;
  details?: string | null;
  message: string;
}

/** The DETAIL of a `room_taken` refusal (JSON), if it is readable. */
function readRoomConflict(details: string | null | undefined) {
  if (!details) return null;
  try {
    const value = JSON.parse(details) as Record<string, unknown>;
    const { specialist, date, startsAt, endsAt } = value;
    return typeof specialist === "string" &&
      typeof date === "string" &&
      typeof startsAt === "string" &&
      typeof endsAt === "string"
      ? { specialistName: specialist, date, startsAt, endsAt }
      : null;
  } catch {
    return null;
  }
}

function toAvailabilityError(error: PostgrestLikeError, timeOff = false) {
  switch (error.code) {
    case "23P01":
      if (timeOff) return new AvailabilityError("time_off_overlap");
      if (error.hint === "room_taken") {
        return new AvailabilityError(
          "room_taken",
          readRoomConflict(error.details),
        );
      }
      return new AvailabilityError(
        error.hint === "room_closed" ? "room_closed" : "overlap",
      );
    case "23514":
      return error.hint === "off_grid"
        ? new AvailabilityError("off_grid")
        : error;
    case "22023":
      return new AvailabilityError("room_unavailable");
    case "P0002":
      return new AvailabilityError("not_found");
    case "42501":
      return new AvailabilityError("forbidden");
    default:
      return error;
  }
}

/** `[start,end)` as Postgres prints a tstzrange, with or without quotes. */
export function parseTstzRange(value: string) {
  const match = /^[[(]"?([^",]+)"?,"?([^")\]]+)"?[)\]]$/.exec(value);
  if (!match) throw new Error(`Unexpected time range: ${value}`);
  const toDate = (bound: string) =>
    new Date(bound.replace(" ", "T").replace(/([+-]\d{2})$/, "$1:00"));
  return { start: toDate(match[1]!), end: toDate(match[2]!) };
}

function mapRule(row: RuleRow): SpecialistAvailabilityRule {
  return {
    id: row.id,
    specialistId: row.specialist_id,
    recurrence: row.recurrence,
    weekdays: row.weekdays,
    intervalWeeks: row.interval_weeks,
    occurrenceCount: row.occurrence_count,
    exceptions: (row.exceptions ?? []).map((one) => one.date).sort(),
    startsAt: row.starts_at.slice(0, 5),
    endsAt: row.ends_at.slice(0, 5),
    validFrom: row.valid_from,
    validUntil: row.valid_until,
    mode: row.mode,
    roomId: row.room_id,
    note: row.note,
  };
}

function mapTimeOff(row: TimeOffRow): SpecialistTimeOff {
  const { start, end } = parseTstzRange(String(row.during));
  return {
    id: row.id,
    specialistId: row.specialist_id,
    startsAt: start.toISOString(),
    endsAt: end.toISOString(),
    reason: row.reason,
    ...(row.workshop_id ? { workshopId: row.workshop_id } : {}),
  };
}

export const availabilityMappers = { rule: mapRule, timeOff: mapTimeOff };

export async function listAvailabilityRules(
  client: SupabaseClient<Database>,
  specialistId: string,
): Promise<SpecialistAvailabilityRule[]> {
  const { data, error } = await client
    .from("specialist_availability_rules")
    .select("*, exceptions:specialist_availability_exceptions(date)")
    .eq("specialist_id", specialistId)
    .order("valid_from")
    .order("starts_at");

  if (error) throw error;
  return data.map(mapRule);
}

/**
 * The rules of several specialists in force between two local dates (the
 * calendar views; admins read everyone's, by RLS).
 */
export async function listAvailabilityRulesForSpecialists(
  client: SupabaseClient<Database>,
  query: { specialistIds: string[]; from: string; to: string },
): Promise<SpecialistAvailabilityRule[]> {
  // Checked first: the dates go into a filter expression.
  const from = localDateSchema.parse(query.from);
  const to = localDateSchema.parse(query.to);
  if (!query.specialistIds.length) return [];
  const { data, error } = await client
    .from("specialist_availability_rules")
    .select("*, exceptions:specialist_availability_exceptions(date)")
    .in("specialist_id", query.specialistIds)
    .lte("valid_from", to)
    .or(`valid_until.is.null,valid_until.gte.${from}`)
    .order("valid_from")
    .order("starts_at");

  if (error) throw error;
  return data.map(mapRule);
}

type RoomRuleRow = RuleRow & {
  specialist: {
    color: string | null;
    profile: {
      first_name: string;
      last_name: string;
      avatar_url: string | null;
    };
    public_profile: {
      first_name: string;
      last_name: string;
      display_name: string;
      profile_photo_url: string | null;
    } | null;
  };
};

/** Every window in a room, whoever it belongs to (admins, by RLS). */
export async function listRoomAvailabilityRules(
  client: SupabaseClient<Database>,
  roomId: string,
): Promise<RoomAvailabilityRule[]> {
  const { data, error } = await client
    .from("specialist_availability_rules")
    .select(
      `
        *,
        exceptions:specialist_availability_exceptions (date),
        specialist:specialists!inner (
          color,
          profile:profiles!specialists_user_id_fkey (first_name, last_name, avatar_url),
          public_profile:specialist_public_profiles (first_name, last_name, display_name, profile_photo_url)
        )
      `,
    )
    .eq("room_id", roomId)
    .order("valid_from")
    .order("starts_at");

  if (error) throw error;
  return (data as unknown as RoomRuleRow[]).map((row) => {
    const { profile, public_profile } = row.specialist;
    // The account's name, else the public profile's (accounts made by
    // invitation may have no name yet).
    const account = {
      firstName: profile.first_name,
      lastName: profile.last_name,
    };
    const published = public_profile
      ? {
          firstName: public_profile.first_name,
          lastName: public_profile.last_name,
        }
      : null;
    const person = personName(account)
      ? account
      : published && personName(published)
        ? published
        : null;
    const name =
      (person && personName(person)) ||
      public_profile?.display_name.trim() ||
      "Specjalista";
    return {
      ...mapRule(row),
      specialistName: name,
      specialistColor: row.specialist.color,
      specialistInitials: person
        ? personInitials(person)
        : name[0]!.toUpperCase(),
      specialistAvatarUrl: profile.avatar_url,
      specialistPhotoPath: public_profile?.profile_photo_url ?? null,
    };
  });
}

/**
 * Who has which active room when, between two local dates (at most 62
 * days apart): for specialists choosing a room, and for admins.
 */
export async function listRoomOccupancy(
  client: SupabaseClient<Database>,
  from: string,
  to: string,
): Promise<RoomOccupancy[]> {
  const { data, error } = await client.rpc("list_room_occupancy", {
    p_from: localDateSchema.parse(from),
    p_to: localDateSchema.parse(to),
  });
  if (error) throw error;
  return data.map((row) => ({
    roomId: row.room_id,
    date: row.day,
    startsAt: row.starts_at.slice(0, 5),
    endsAt: row.ends_at.slice(0, 5),
    specialistId: row.specialist_id,
    specialistName: row.specialist_name,
    specialistInitials:
      personInitials({
        firstName: row.specialist_first_name,
        lastName: row.specialist_last_name,
      }) || row.specialist_name[0]!.toUpperCase(),
    specialistAvatarUrl: row.specialist_avatar_url,
    specialistPhotoPath: row.specialist_photo_path,
  }));
}

export async function listTimeOff(
  client: SupabaseClient<Database>,
  specialistId: string,
): Promise<SpecialistTimeOff[]> {
  const { data, error } = await client
    .from("specialist_time_off")
    .select("*")
    .eq("specialist_id", specialistId);

  if (error) throw error;
  return data
    .map(mapTimeOff)
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt));
}

/** Time off of several specialists, e.g. everyone working in a room. */
export async function listTimeOffForSpecialists(
  client: SupabaseClient<Database>,
  specialistIds: string[],
): Promise<SpecialistTimeOff[]> {
  if (!specialistIds.length) return [];
  const { data, error } = await client
    .from("specialist_time_off")
    .select("*")
    .in("specialist_id", specialistIds);

  if (error) throw error;
  return data
    .map(mapTimeOff)
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt));
}

/** The database function's parameters for a validated window. */
function ruleParams(rule: AvailabilityRuleValues) {
  return {
    p_recurrence: rule.recurrence,
    p_weekdays: rule.weekdays,
    p_interval_weeks: rule.intervalWeeks,
    p_starts_at: rule.startsAt,
    p_ends_at: rule.endsAt,
    p_valid_from: rule.validFrom,
    ...(rule.validUntil ? { p_valid_until: rule.validUntil } : {}),
    ...(rule.occurrenceCount
      ? { p_occurrence_count: rule.occurrenceCount }
      : {}),
    p_mode: rule.mode,
    ...(rule.roomId ? { p_room_id: rule.roomId } : {}),
    ...(rule.note ? { p_note: rule.note } : {}),
  };
}

export interface OccurrenceTarget {
  ruleId: string;
  /** The occurrence's local date. */
  date: string;
  scope: OccurrenceScope;
}

function targetParams(target: OccurrenceTarget) {
  return {
    p_rule_id: target.ruleId,
    p_date: localDateSchema.parse(target.date),
    p_scope: occurrenceScopeSchema.parse(target.scope),
  };
}

/**
 * Removes an occurrence of a rule: only it, it and the following ones, or
 * the whole rule — as calendar apps ask when deleting a repeating event.
 */
export async function deleteAvailabilityOccurrence(
  client: SupabaseClient<Database>,
  target: OccurrenceTarget,
): Promise<void> {
  const params = targetParams(target);
  const { error } = await client.rpc("delete_availability_occurrence", params);
  if (error) throw toAvailabilityError(error);
}

/**
 * Changes an occurrence of a rule with the given values: only it (it is
 * skipped and a one-off takes its place), it and the following ones (the
 * series is split), or the whole rule.
 */
export async function editAvailabilityOccurrence(
  client: SupabaseClient<Database>,
  target: OccurrenceTarget,
  input: AvailabilityRuleInput,
): Promise<string> {
  const params = targetParams(target);
  const rule = availabilityRuleInputSchema.parse(input);
  const { data, error } = await client.rpc("edit_availability_occurrence", {
    ...params,
    ...ruleParams(rule),
  });
  if (error) throw toAvailabilityError(error);
  return data;
}

/**
 * Adds or (with `id`) edits a window. `specialistId` is for an admin
 * editing someone else's schedule; a specialist edits their own.
 */
export async function saveAvailabilityRule(
  client: SupabaseClient<Database>,
  input: AvailabilityRuleInput,
  options: { id?: string; specialistId?: string } = {},
): Promise<string> {
  const rule = availabilityRuleInputSchema.parse(input);
  const { data, error } = await client.rpc("save_availability_rule", {
    ...ruleParams(rule),
    ...(options.id ? { p_id: options.id } : {}),
    ...(options.specialistId ? { p_specialist_id: options.specialistId } : {}),
  });

  if (error) throw toAvailabilityError(error);
  return data;
}

export async function deleteAvailabilityRule(
  client: SupabaseClient<Database>,
  id: string,
): Promise<void> {
  const { error } = await client.rpc("delete_availability_rule", { p_id: id });
  if (error) throw toAvailabilityError(error);
}

export async function addTimeOff(
  client: SupabaseClient<Database>,
  timeOff: { start: Date; end: Date; reason: string | null },
  options: { specialistId?: string } = {},
): Promise<string> {
  const { data, error } = await client.rpc("add_time_off", {
    p_starts_at: timeOff.start.toISOString(),
    p_ends_at: timeOff.end.toISOString(),
    ...(timeOff.reason ? { p_reason: timeOff.reason } : {}),
    ...(options.specialistId ? { p_specialist_id: options.specialistId } : {}),
  });

  if (error) throw toAvailabilityError(error, true);
  return data;
}

export async function deleteTimeOff(
  client: SupabaseClient<Database>,
  id: string,
): Promise<void> {
  const { error } = await client.rpc("delete_time_off", { p_id: id });
  if (error) throw toAvailabilityError(error, true);
}
