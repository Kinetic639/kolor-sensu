import "server-only";

import { cache } from "react";
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
async function readAdminServiceDetail(id: string) {
  const client = await createClient();
  const [service, offers] = await Promise.all([
    getServiceByIdAdmin(client, id),
    listSpecialistOffersForServiceAdmin(client, id),
  ]);
  return service ? mapServiceDetail(service, offers) : null;
}

/** Cached per request: the page and its breadcrumb share one load. */
export const loadAdminServiceDetail = cache(readAdminServiceDetail);
