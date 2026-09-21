"use server";
import { requirePortalRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import {
  cancelWorkshop,
  completeWorkshop,
  createWorkshop,
  publishWorkshop,
  updateWorkshop,
} from "@repo/supabase";
import type { WorkshopCreate, WorkshopUpdate } from "@repo/contracts";
import { revalidatePath } from "next/cache";
import {
  loadAdminWorkshopDetail,
  loadAdminWorkshops,
  loadWorkshopFormOptions,
} from "./loaders";

function safeMessage(error: unknown) {
  if (
    typeof error === "object" &&
    error &&
    "code" in error &&
    error.code === "23505"
  )
    return "Warsztat z takim slugiem już istnieje.";
  if (
    typeof error === "object" &&
    error &&
    "code" in error &&
    (error.code === "23503" || error.code === "23514")
  )
    return "Wybrany gabinet nie należy do wybranej lokalizacji lub dane naruszają regułę modalności.";
  if (
    typeof error === "object" &&
    error &&
    "code" in error &&
    error.code === "PGRST116"
  )
    return "Nie można wykonać tej zmiany z bieżącego statusu warsztatu.";
  if (
    typeof error === "object" &&
    error &&
    "name" in error &&
    error.name === "ZodError"
  )
    return "Sprawdź poprawność danych formularza.";
  return "Nie udało się zapisać warsztatu. Spróbuj ponownie.";
}

export async function getAdminWorkshopsAction() {
  await requirePortalRole();
  return loadAdminWorkshops();
}

export async function getAdminWorkshopAction(id: string) {
  await requirePortalRole();
  return loadAdminWorkshopDetail(id);
}

export async function getWorkshopFormOptionsAction() {
  await requirePortalRole();
  return loadWorkshopFormOptions();
}

export async function createWorkshopAction(input: WorkshopCreate) {
  await requirePortalRole();
  try {
    const workshop = await createWorkshop(await createClient(), input);
    revalidatePath("/warsztaty");
    return { ok: true as const, workshopId: workshop.id };
  } catch (error) {
    return { ok: false as const, message: safeMessage(error) };
  }
}

export async function updateWorkshopAction(id: string, input: WorkshopUpdate) {
  await requirePortalRole();
  try {
    await updateWorkshop(await createClient(), id, input);
    revalidatePath("/warsztaty");
    revalidatePath(`/warsztaty/${id}`);
    return { ok: true as const };
  } catch (error) {
    return { ok: false as const, message: safeMessage(error) };
  }
}

async function transition(
  id: string,
  action: (
    client: Awaited<ReturnType<typeof createClient>>,
    id: string,
  ) => Promise<unknown>,
) {
  await requirePortalRole();
  try {
    await action(await createClient(), id);
    revalidatePath("/warsztaty");
    revalidatePath(`/warsztaty/${id}`);
    return { ok: true as const };
  } catch (error) {
    return { ok: false as const, message: safeMessage(error) };
  }
}

export async function publishWorkshopAction(id: string) {
  return transition(id, publishWorkshop);
}

export async function cancelWorkshopAction(id: string) {
  return transition(id, cancelWorkshop);
}

export async function completeWorkshopAction(id: string) {
  return transition(id, completeWorkshop);
}
