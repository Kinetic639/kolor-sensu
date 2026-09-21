import "server-only";
import { createClient } from "@/lib/supabase/server";
import {
  getWorkshopByIdAdmin,
  listLocations,
  listRoomsAdmin,
  listSpecialistSummariesForAdmin,
  listWorkshopsAdmin,
} from "@repo/supabase";
import { mapWorkshopDetail, mapWorkshopsList } from "./view-model";
import type { WorkshopFormOptions } from "./types";

export async function loadAdminWorkshops() {
  return mapWorkshopsList(await listWorkshopsAdmin(await createClient()));
}

export async function loadAdminWorkshopDetail(id: string) {
  const workshop = await getWorkshopByIdAdmin(await createClient(), id);
  return workshop ? mapWorkshopDetail(workshop) : null;
}

export async function loadWorkshopFormOptions(): Promise<WorkshopFormOptions> {
  const client = await createClient();
  const [specialists, locations, rooms] = await Promise.all([
    listSpecialistSummariesForAdmin(client),
    listLocations(client),
    listRoomsAdmin(client),
  ]);
  return {
    specialists: specialists
      .filter((specialist) => specialist.active)
      .map((specialist) => ({
        id: specialist.id,
        displayName:
          specialist.publicDisplayName ??
          `${specialist.firstName} ${specialist.lastName}`.trim(),
        professionalTitle: specialist.professionalTitle,
      })),
    locations: locations
      .filter((location) => location.active)
      .map((location) => ({ id: location.id, name: location.name })),
    rooms: rooms
      .filter((room) => room.active)
      .map((room) => ({
        id: room.id,
        name: room.name,
        locationId: room.locationId,
      })),
  };
}
