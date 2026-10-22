import "server-only";
import { listLocations } from "@repo/supabase";
import {
  getAdminWorkshop,
  getWorkshopVisibility,
  listAdminWorkshops,
} from "@repo/supabase/workshops-admin";
import { cache } from "react";
import { rooms } from "@/lib/reference-data";
import { createClient } from "@/lib/supabase/server";

// Warsztaty's reads in the portal (admins; the database checks the role).

export const loadWorkshops = cache(async () =>
  listAdminWorkshops(await createClient()),
);

export const loadWorkshop = cache(async (id: string) =>
  getAdminWorkshop(await createClient(), id),
);

export const loadWorkshopVisibility = cache(async () =>
  getWorkshopVisibility(await createClient()),
);

export interface PlaceOption {
  id: string;
  name: string;
  rooms: { id: string; name: string }[];
}

/** The active locations, each with its active rooms, for the form. */
export const loadPlaces = cache(async (): Promise<PlaceOption[]> => {
  const [locations, roomList] = await Promise.all([
    listLocations(await createClient()),
    rooms(),
  ]);
  return locations
    .filter((location) => location.active)
    .map((location) => ({
      id: location.id,
      name: location.name,
      rooms: roomList
        .filter((room) => room.locationId === location.id && room.active)
        .map((room) => ({ id: room.id, name: room.name })),
    }));
});

/** The workshop's title, for the breadcrumb. */
export async function workshopTitle(id: string): Promise<string | null> {
  if (id === "nowy") return "Nowy warsztat";
  const workshop = await loadWorkshop(id).catch(() => null);
  return workshop?.title ?? null;
}
