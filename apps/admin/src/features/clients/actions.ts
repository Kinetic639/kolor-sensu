"use server";

import { requirePortalRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import {
  clientDetailsSchema,
  clientMessage,
  type ClientDetailsValues,
  type ClientUpdateResult,
} from "@repo/contracts/clients";
import { ClientError, updateClient } from "@repo/supabase";
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
