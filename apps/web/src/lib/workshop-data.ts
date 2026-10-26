import {
  getWorkshopPicks as readPicks,
  getWorkshopPreview,
  getWorkshopSlugRedirect,
  listPublicWorkshops,
  workshopImageUrl as imageUrl,
} from "@repo/supabase/workshops";
import { getWorkshopVisibility as readVisibility } from "@repo/supabase/workshops-admin";
import { cache } from "react";
import { createPublicClient } from "@/lib/supabase/public";
import { createSecretClient } from "@/lib/supabase/secret";
import { isPreview } from "./preview";
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

/** A draft workshop, in the preview only (else null; #197). */
export const getWorkshopPreviewDraft = cache(async (id: string) => {
  if (!(await isPreview())) return null;
  try {
    return await getWorkshopPreview(createSecretClient(), id);
  } catch (error) {
    console.error(`[workshops] preview ${id} failed:`, error);
    return null;
  }
});

/**
 * The services and articles the admin picked for a workshop (#185); a
 * draft's in the preview only (the secret client), none on a failure.
 */
export const getWorkshopPicks = cache(async (id: string, preview = false) => {
  const none = { serviceIds: [], articleIds: [] };
  if (!preview) {
    return load(
      `workshop picks ${id}`,
      (client) => readPicks(client, id),
      none,
    );
  }
  try {
    return await readPicks(createSecretClient(), id);
  } catch (error) {
    console.error(`[workshops] picks of ${id} failed:`, error);
    return none;
  }
});

/** The current address of a workshop whose address changed, or null. */
export const getWorkshopRedirect = cache((slug: string) =>
  load(
    `workshop redirect ${slug}`,
    (client) => getWorkshopSlugRedirect(client, slug),
    null,
  ),
);

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
