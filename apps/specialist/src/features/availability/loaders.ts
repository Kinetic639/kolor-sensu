import "server-only";

import { requirePortalRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { DEFAULT_TIME_ZONE, mondayOf } from "@repo/scheduling";
import {
  getMySpecialist,
  listActiveRoomsForSpecialist,
  listAvailabilityRules,
  listTimeOff,
} from "@repo/supabase";
import { formatInTimeZone } from "date-fns-tz";
import type { AvailabilityParams } from "./search-params";
import { mapAvailabilityViewModel } from "./view-model";

/** The signed-in specialist's schedule, for the week and filters in the URL. */
export async function loadAvailability(params: AvailabilityParams) {
  const [authorization, client] = await Promise.all([
    requirePortalRole(),
    createClient(),
  ]);
  const specialist = await getMySpecialist(client, authorization.user.id);
  if (!specialist) return null;

  const [rules, timeOff, rooms] = await Promise.all([
    listAvailabilityRules(client, specialist.id),
    listTimeOff(client, specialist.id),
    listActiveRoomsForSpecialist(client),
  ]);
  const now = new Date();
  const today = formatInTimeZone(now, DEFAULT_TIME_ZONE, "yyyy-MM-dd");

  const specialistName =
    [authorization.profile.first_name, authorization.profile.last_name]
      .filter(Boolean)
      .join(" ") || "Specjalista";

  return {
    today,
    rules,
    specialistName,
    model: mapAvailabilityViewModel({
      rules,
      timeOff,
      rooms: rooms.map((room) => ({ id: room.id, name: room.name })),
      now,
      week: mondayOf(params.tydzien ?? today),
      filters: { day: params.dzien, mode: params.forma },
      timeZone: DEFAULT_TIME_ZONE,
    }),
  };
}

/** One of the signed-in specialist's own windows (RLS returns only theirs). */
export async function findMyAvailabilityRule(id: string) {
  const [authorization, client] = await Promise.all([
    requirePortalRole(),
    createClient(),
  ]);
  const specialist = await getMySpecialist(client, authorization.user.id);
  if (!specialist) return null;
  const rules = await listAvailabilityRules(client, specialist.id);
  return rules.find((rule) => rule.id === id) ?? null;
}
