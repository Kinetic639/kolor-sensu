"use server";

import { requirePortalRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import {
  clientDetailsSchema,
  clientMessage,
  type ClientDetailsValues,
  type ClientUpdateResult,
} from "@repo/contracts/clients";
import { ClientError, forgetClient, updateClient } from "@repo/supabase";
import { revalidatePath } from "next/cache";

// Correcting a client's details and the centre's note (R15). The database
// checks the admin's role and the details again.

export async function updateClientAction(
  clientId: string,
  values: ClientDetailsValues,
): Promise<ClientUpdateResult> {
  await requirePortalRole();
  const parsed = clientDetailsSchema.safeParse(values);
  if (!parsed.success) {
    return {
      ok: false,
      message: clientMessage("invalid_details"),
      fields: Object.fromEntries(
        parsed.error.issues.map((issue) => [
          String(issue.path[0] ?? "form"),
          issue.message,
        ]),
      ),
    };
  }
  try {
    const { upcomingUpdated } = await updateClient(
      await createClient(),
      clientId,
      parsed.data,
    );
    revalidatePath("/klienci");
    revalidatePath(`/klienci/${clientId}`);
    revalidatePath("/rezerwacje");
    revalidatePath("/kalendarz");
    return { ok: true, upcomingUpdated };
  } catch (error) {
    if (error instanceof ClientError) {
      return {
        ok: false,
        message: clientMessage(error.code),
        fields:
          error.code === "email_taken"
            ? { email: clientMessage("email_taken") }
            : undefined,
      };
    }
    console.error("[clients] saving a client failed:", error);
    return { ok: false, message: clientMessage(undefined) };
  }
}

/**
 * Removes who the client was, at their request (RODO). The database
 * refuses while a visit is to come or money is owed back to them.
 */
export async function forgetClientAction(
  clientId: string,
): Promise<{ ok: true } | { ok: false; message: string }> {
  await requirePortalRole();
  try {
    await forgetClient(await createClient(), clientId);
    revalidatePath("/klienci");
    revalidatePath(`/klienci/${clientId}`);
    revalidatePath("/rezerwacje");
    revalidatePath("/kalendarz");
    return { ok: true };
  } catch (error) {
    if (error instanceof ClientError) {
      return { ok: false, message: clientMessage(error.code) };
    }
    console.error("[clients] removing a client's details failed:", error);
    return { ok: false, message: "Nie udało się usunąć danych klienta." };
  }
}
