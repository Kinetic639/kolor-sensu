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
import { mapAvailabilityViewModel } from "./view-model";

/** The signed-in specialist's schedule, with `week` (any date in it) previewed. */
export async function loadAvailability(week: string | null) {
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

  return mapAvailabilityViewModel({
    rules,
    timeOff,
    rooms: rooms.map((room) => ({ id: room.id, name: room.name })),
    now,
    week: mondayOf(week ?? today),
    timeZone: DEFAULT_TIME_ZONE,
  });
}
