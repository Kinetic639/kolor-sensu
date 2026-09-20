"use server";

import { requirePortalRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import {
  reviewSpecialistProfileDraft,
  updateSpecialistOfferStateAdmin,
} from "@repo/supabase";
import { revalidatePath } from "next/cache";
import { loadAdminSpecialistDetail, loadAdminSpecialists } from "./loaders";

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
}) {
  await requirePortalRole();
  const client = await createClient();
  await reviewSpecialistProfileDraft(client, {
    action: input.action,
    draftId: input.draftId,
    comment: input.comment?.trim() || null,
  });
  revalidatePath("/specjalisci");
  revalidatePath(`/specjalisci/${input.specialistId}`);
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
}
