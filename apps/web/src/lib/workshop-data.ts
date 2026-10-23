import {
  listPublicWorkshops,
  workshopImageUrl as imageUrl,
} from "@repo/supabase/workshops";
import { getWorkshopVisibility as readVisibility } from "@repo/supabase/workshops-admin";
import { cache } from "react";
import { createPublicClient } from "@/lib/supabase/public";
import { load } from "./public-data";

// Warsztaty's reads for the site (docs/product/workshops-plan.md): every
// public workshop in one read (few), never throwing (see public-data.ts).
// The seats come with it; the database checks them again on signing up.

export const getWorkshops = cache(() =>
  load("workshops", (client) => listPublicWorkshops(client), []),
);

export const getWorkshop = cache(async (slug: string) => {
  const all = await getWorkshops();
  return all.find((workshop) => workshop.slug === slug) ?? null;
});

/** Whether the site shows Warsztaty in its menu and on its homepage (the portal's switches). */
export const getWorkshopVisibility = cache(() =>
  load("workshop visibility", (client) => readVisibility(client), {
    inMenu: true,
    onHome: true,
  }),
);

/** A workshop's cover, in the public site-media bucket. */
export function workshopImageUrl(path: string) {
  return imageUrl(createPublicClient(), path);
}
