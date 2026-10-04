"use server";
import { requirePortalRole } from "@/lib/auth";
import { CACHE_TAGS } from "@/lib/cached";
import { createClient } from "@/lib/supabase/server";
import {
  serviceArrangementSchema,
  type ServiceArrangement,
  type ServiceCreate,
  type ServiceUpdate,
} from "@repo/contracts";
import { revalidateWeb } from "@repo/app-runtime/revalidate-web";
import {
  createService,
  listServiceCatalogs,
  saveServiceArrangement,
  updateService,
  updateSpecialistOfferStateAdmin,
} from "@repo/supabase";
import { revalidatePath, updateTag } from "next/cache";

// The offer's changes: a service's data, the offer's arrangement (its
// catalogues and order, as the site's menu shows them), a specialist's
// offer of a service. Each one is seen at once in the portal and
// on the site (its offer, the service's page, the price list).

function safeMessage(error: unknown) {
  if (
    typeof error === "object" &&
    error &&
    "code" in error &&
    error.code === "23505"
  )
    return "Usługa z takim adresem już istnieje.";
  if (
    typeof error === "object" &&
    error &&
    "name" in error &&
    error.name === "ZodError"
  )
    return "Sprawdź poprawność danych formularza.";
  return "Nie udało się zapisać usługi. Spróbuj ponownie.";
}

/** The portal's offer, the specialists (their offers), and the site. */
async function refresh(serviceId?: string) {
  revalidatePath("/oferta");
  if (serviceId) revalidatePath(`/oferta/${serviceId}`);
  revalidatePath("/specjalisci", "layout");
  updateTag(CACHE_TAGS.services);
  await revalidateWeb([{ path: "/", type: "layout" }]);
}

export async function createServiceAction(input: ServiceCreate) {
  await requirePortalRole();
  try {
    const service = await createService(await createClient(), input);
    await refresh(service.id);
    return { ok: true as const, serviceId: service.id };
  } catch (error) {
    return { ok: false as const, message: safeMessage(error) };
  }
}

export async function updateServiceAction(id: string, input: ServiceUpdate) {
  await requirePortalRole();
  try {
    await updateService(await createClient(), id, input);
  } catch (error) {
    return { ok: false as const, message: safeMessage(error) };
  }
  await refresh(id);
  return { ok: true as const };
}

/**
 * The offer as arranged (Oferta → "Kolejność i katalogi"): its catalogues
 * (made, named, removed), and every service's catalogue and place, at
 * once; the site's menu and offer page follow.
 */
export async function arrangeServicesAction(input: ServiceArrangement) {
  await requirePortalRole();
  const parsed = serviceArrangementSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, message: "Sprawdź nazwy katalogów." };
  }
  try {
    const client = await createClient();
    await saveServiceArrangement(
      client,
      parsed.data,
      await listServiceCatalogs(client),
    );
  } catch (error) {
    console.error("[services] arrangement failed:", error);
    return {
      ok: false as const,
      message: "Nie udało się zapisać układu. Spróbuj ponownie.",
    };
  }
  await refresh();
  return { ok: true as const };
}

/**
 * A specialist's offer of the service on or off, or its new clients (on
 * the service's page: `updateServiceOfferStateAction.bind(null, id)`).
 */
export async function updateServiceOfferStateAction(
  serviceId: string,
  input: { offerId: string; active: boolean },
): Promise<{ ok: true } | { ok: false; message: string }> {
  await requirePortalRole();
  try {
    await updateSpecialistOfferStateAdmin(await createClient(), input.offerId, {
      active: input.active,
    });
  } catch (error) {
    console.error("[services] offer change failed:", error);
    return { ok: false, message: "Spróbuj ponownie za chwilę." };
  }
  updateTag(CACHE_TAGS.specialists);
  await refresh(serviceId);
  return { ok: true };
}
