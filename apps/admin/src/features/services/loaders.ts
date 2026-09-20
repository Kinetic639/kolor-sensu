import "server-only";
import { createClient } from "@/lib/supabase/server";
import {
  getServiceByIdAdmin,
  listServiceSummariesAdmin,
  listSpecialistOffersForServiceAdmin,
} from "@repo/supabase";
import { mapServiceDetail, mapServicesList } from "./view-model";

export async function loadAdminServices() {
  return mapServicesList(await listServiceSummariesAdmin(await createClient()));
}
export async function loadAdminServiceDetail(id: string) {
  const client = await createClient();
  const [service, offers] = await Promise.all([
    getServiceByIdAdmin(client, id),
    listSpecialistOffersForServiceAdmin(client, id),
  ]);
  return service ? mapServiceDetail(service, offers) : null;
}
