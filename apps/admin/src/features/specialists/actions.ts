"use server";

import { requirePortalRole } from "@/lib/auth";
import { revalidateWeb } from "@repo/app-runtime/revalidate-web";
import { createClient } from "@/lib/supabase/server";
import {
  reviewSpecialistProfileDraft,
  setSpecialistActiveAdmin,
  setSpecialistColorAdmin,
  setSpecialistPublicSlugAdmin,
  setSpecialistVisibilityAdmin,
  updateSpecialistOfferStateAdmin,
} from "@repo/supabase";
import { hexColorSchema } from "@repo/contracts";
import { revalidatePath, updateTag } from "next/cache";
import { CACHE_TAGS } from "@/lib/cached";
import { reviewErrorMessage } from "./review-errors";
import { publicSlugFormSchema } from "./slug-form";

export async function reviewSpecialistDraftAction(input: {
  specialistId: string;
  draftId: string;
  action: "approve" | "reject";
  comment?: string;
}): Promise<{ ok: true } | { ok: false; message: string }> {
  await requirePortalRole();
  const client = await createClient();
  try {
    await reviewSpecialistProfileDraft(client, {
      action: input.action,
      draftId: input.draftId,
      comment: input.comment?.trim() || null,
    });
  } catch (error) {
    console.error("[specialists] review failed:", error);
    return { ok: false, message: reviewErrorMessage(error) };
  }
  revalidatePath("/specjalisci");
  revalidatePath(`/specjalisci/${input.specialistId}`);
  updateTag(CACHE_TAGS.specialists);
  // An approved profile shows on the site's home, team, profile and offer
  // pages; a rejection changes nothing public.
  if (input.action === "approve") {
    await revalidateWeb([{ path: "/", type: "layout" }]);
  }
  return { ok: true };
}

/**
 * An offer on or off (bound to the
 * specialist: `updateSpecialistOfferStateAction.bind(null, id)`).
 */
export async function updateSpecialistOfferStateAction(
  specialistId: string,
  input: { offerId: string; active: boolean },
): Promise<{ ok: true } | { ok: false; message: string }> {
  await requirePortalRole();
  try {
    await updateSpecialistOfferStateAdmin(await createClient(), input.offerId, {
      active: input.active,
    });
  } catch (error) {
    console.error("[specialists] offer change failed:", error);
    return { ok: false, message: "Spróbuj ponownie za chwilę." };
  }
  revalidatePath("/specjalisci");
  revalidatePath(`/specjalisci/${specialistId}`);
  // The offer's roster and pages list who offers each service.
  revalidatePath("/oferta", "layout");
  updateTag(CACHE_TAGS.specialists);
  // Offers feed the price list, the offer pages and the specialist pages.
  await revalidateWeb([{ path: "/", type: "layout" }]);
  return { ok: true };
}

export async function setSpecialistSlugAction(input: {
  specialistId: string;
  slug: string;
}): Promise<{ ok: true; slug: string } | { ok: false; message: string }> {
  await requirePortalRole();
  const parsed = publicSlugFormSchema.safeParse({ slug: input.slug });
  if (!parsed.success) {
    return {
      ok: false,
      message: parsed.error.issues[0]?.message ?? "Nieprawidłowy adres.",
    };
  }
  try {
    const slug = await setSpecialistPublicSlugAdmin(
      await createClient(),
      input.specialistId,
      parsed.data.slug,
    );
    revalidatePath("/specjalisci");
    revalidatePath(`/specjalisci/${input.specialistId}`);
    updateTag(CACHE_TAGS.specialists);
    // Links to the profile appear on the home, team and offer pages.
    await revalidateWeb([{ path: "/", type: "layout" }]);
    return { ok: true, slug };
  } catch (error) {
    console.error("[specialists] slug change failed:", error);
    const code =
      typeof error === "object" && error && "code" in error ? error.code : null;
    return {
      ok: false,
      message:
        code === "23505"
          ? "Ten adres ma już inny specjalista."
          : code === "42501"
            ? "Brak uprawnień administratora."
            : "Nie udało się zmienić adresu. Spróbuj ponownie.",
    };
  }
}

/** The specialist's colour in schedules and lists; null for automatic. */
export async function setSpecialistColorAction(input: {
  specialistId: string;
  color: string | null;
}): Promise<{ ok: true } | { ok: false; message: string }> {
  await requirePortalRole();
  const parsed = hexColorSchema.nullable().safeParse(input.color);
  if (!parsed.success) {
    return { ok: false, message: "Podaj kolor w formacie #RRGGBB." };
  }
  try {
    await setSpecialistColorAdmin(
      await createClient(),
      input.specialistId,
      parsed.data,
    );
    revalidatePath("/specjalisci");
    revalidatePath(`/specjalisci/${input.specialistId}`);
    updateTag(CACHE_TAGS.specialists);
    // The room schedules show it too.
    revalidatePath("/gabinety", "layout");
    return { ok: true };
  } catch (error) {
    console.error("[specialists] colour change failed:", error);
    return { ok: false, message: "Nie udało się zapisać koloru." };
  }
}

/** Everything that shows a specialist: the centre's lists, the site. */
async function refreshSpecialist(specialistId: string) {
  revalidatePath("/specjalisci");
  revalidatePath(`/specjalisci/${specialistId}`);
  revalidatePath("/kalendarz");
  updateTag(CACHE_TAGS.specialists);
  await revalidateWeb([{ path: "/", type: "layout" }]);
}

/** On the site and booked online, or hidden for a while. */
export async function setSpecialistVisibilityAction(
  specialistId: string,
  visible: boolean,
): Promise<{ ok: true } | { ok: false; message: string }> {
  await requirePortalRole();
  try {
    await setSpecialistVisibilityAdmin(
      await createClient(),
      specialistId,
      visible,
    );
    await refreshSpecialist(specialistId);
    return { ok: true };
  } catch (error) {
    console.error("[specialists] visibility change failed:", error);
    return { ok: false, message: "Nie udało się zmienić widoczności." };
  }
}

/**
 * Suspends a specialist (no site, no booking, no portal) or resumes them;
 * says how many visits are still booked with them.
 */
export async function setSpecialistActiveAction(
  specialistId: string,
  active: boolean,
): Promise<{ ok: true; upcoming: number } | { ok: false; message: string }> {
  await requirePortalRole();
  try {
    const upcoming = await setSpecialistActiveAdmin(
      await createClient(),
      specialistId,
      active,
    );
    await refreshSpecialist(specialistId);
    return { ok: true, upcoming };
  } catch (error) {
    console.error("[specialists] suspension change failed:", error);
    return { ok: false, message: "Nie udało się zmienić dostępu." };
  }
}
