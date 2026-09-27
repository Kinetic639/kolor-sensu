import "server-only";

import { requirePortalRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import {
  getMySpecialist,
  listAvailableServicesForSpecialist,
  listMySpecialistServices,
} from "@repo/supabase";
import { mapMyServicesViewModel } from "./view-model";

export async function loadMyServices() {
  const [authorization, client] = await Promise.all([
    requirePortalRole(),
    createClient(),
  ]);
  const specialist = await getMySpecialist(client, authorization.user.id);
  if (!specialist) return null;

  const [offers, services] = await Promise.all([
    listMySpecialistServices(client, specialist.id),
    listAvailableServicesForSpecialist(client),
  ]);
  return mapMyServicesViewModel(offers, services);
}
