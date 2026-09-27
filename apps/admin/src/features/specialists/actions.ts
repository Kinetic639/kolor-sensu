"use server";

import { requirePortalRole } from "@/lib/auth";
import { revalidateWeb } from "@repo/app-runtime/revalidate-web";
import { createClient } from "@/lib/supabase/server";
import {
  reviewSpecialistProfileDraft,
  updateSpecialistOfferStateAdmin,
} from "@repo/supabase";
import { revalidatePath } from "next/cache";
import { loadAdminSpecialistDetail, loadAdminSpecialists } from "./loaders";
import { reviewErrorMessage } from "./review-errors";

export async function getAdminSpecialistsAction() {
  await requirePortalRole();
  return loadAdminSpecialists();
}

export async function getAdminSpecialistDetailAction(specialistId: string) {
  await requirePortalRole();
  return loadAdminSpecialistDetail(specialistId);
}

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
  // An approved profile shows on the site's home, team, profile and offer
  // pages; a rejection changes nothing public.
  if (input.action === "approve") {
    await revalidateWeb([{ path: "/", type: "layout" }]);
  }
  return { ok: true };
}

export async function updateSpecialistOfferStateAction(input: {
  specialistId: string;
  offerId: string;
  active: boolean;
  acceptingNewClients: boolean;
}) {
  await requirePortalRole();
  await updateSpecialistOfferStateAdmin(await createClient(), input.offerId, {
    active: input.active,
    acceptingNewClients: input.acceptingNewClients,
  });
  revalidatePath(`/specjalisci/${input.specialistId}`);
  // Offers feed the price list, the offer pages and the specialist pages.
  await revalidateWeb([{ path: "/", type: "layout" }]);
}
