"use server";

import { requirePortalRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import {
  clientDetailsSchema,
  clientMessage,
  type ClientDetailsValues,
  type ClientUpdateResult,
} from "@repo/contracts/clients";
import {
  ClientError,
  forgetClient,
  mergeClients,
  searchClients,
  updateClient,
} from "@repo/supabase";
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

/** Other clients by name, e-mail or phone (the merge's search). */
export async function findClientsAction(query: string) {
  await requirePortalRole();
  if (query.trim().length < 2) return [];
  const { clients } = await searchClients(await createClient(), {
    query: query.trim().slice(0, 100),
    sort: "name",
    descending: false,
    limit: 8,
    offset: 0,
  });
  return clients.map(({ id, name, email, phone }) => ({
    id,
    name,
    email,
    phone,
  }));
}

/** Merges the other card into this one (its visits come over). */
export async function mergeClientAction(
  keepId: string,
  mergeId: string,
): Promise<{ ok: true; moved: number } | { ok: false; message: string }> {
  await requirePortalRole();
  try {
    const moved = await mergeClients(await createClient(), keepId, mergeId);
    revalidatePath("/klienci");
    revalidatePath(`/klienci/${keepId}`);
    revalidatePath("/rezerwacje");
    return { ok: true, moved };
  } catch (error) {
    if (error instanceof ClientError) {
      return { ok: false, message: clientMessage(error.code) };
    }
    console.error("[clients] merging failed:", error);
    return { ok: false, message: "Nie udało się połączyć klientów." };
  }
}
