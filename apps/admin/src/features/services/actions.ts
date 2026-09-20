"use server";
import { requirePortalRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createService, updateService } from "@repo/supabase";
import type { ServiceCreate, ServiceUpdate } from "@repo/contracts";
import { revalidatePath } from "next/cache";
import { loadAdminServiceDetail, loadAdminServices } from "./loaders";

function safeMessage(error: unknown) {
  if (
    typeof error === "object" &&
    error &&
    "code" in error &&
    error.code === "23505"
  )
    return "Usługa z takim slugiem już istnieje.";
  if (
    typeof error === "object" &&
    error &&
    "name" in error &&
    error.name === "ZodError"
  )
    return "Sprawdź poprawność danych formularza.";
  return "Nie udało się zapisać usługi. Spróbuj ponownie.";
}
export async function getAdminServicesAction() {
  await requirePortalRole();
  return loadAdminServices();
}
export async function getAdminServiceAction(id: string) {
  await requirePortalRole();
  return loadAdminServiceDetail(id);
}
export async function createServiceAction(input: ServiceCreate) {
  await requirePortalRole();
  try {
    const service = await createService(await createClient(), input);
    revalidatePath("/oferta");
    return { ok: true as const, serviceId: service.id };
  } catch (error) {
    return { ok: false as const, message: safeMessage(error) };
  }
}
export async function updateServiceAction(id: string, input: ServiceUpdate) {
  await requirePortalRole();
  try {
    await updateService(await createClient(), id, input);
    revalidatePath("/oferta");
    revalidatePath(`/oferta/${id}`);
    return { ok: true as const };
  } catch (error) {
    return { ok: false as const, message: safeMessage(error) };
  }
}
