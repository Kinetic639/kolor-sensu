"use server";

import { requirePortalRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

// The centre cancels a visit (R9). The site (apps/web) holds the payments
// and the e-mails, so the request goes there with this admin's access
// token; the database checks it is an admin's. The client always gets
// all their money back.

type ActionResult =
  { ok: true; refundFailed: boolean } | { ok: false; message: string };

const MESSAGES: Record<string, string> = {
  not_cancellable: "Tej wizyty nie można już odwołać.",
  not_found: "Nie znaleziono wizyty.",
};

export async function cancelVisitAsCentreAction(
  appointmentId: string,
): Promise<ActionResult> {
  await requirePortalRole();
  const client = await createClient();
  const {
    data: { session },
  } = await client.auth.getSession();
  if (!session) return { ok: false, message: "Zaloguj się ponownie." };

  const url = new URL(
    `/api/centrum/wizyty/${encodeURIComponent(appointmentId)}/odwolanie`,
    process.env.NEXT_PUBLIC_WEB_URL || "http://localhost:3000",
  );
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { authorization: `Bearer ${session.access_token}` },
      cache: "no-store",
    });
    const body = (await response.json().catch(() => null)) as {
      error?: string;
      refundFailed?: boolean;
    } | null;
    if (!response.ok) {
      return {
        ok: false,
        message: MESSAGES[body?.error ?? ""] ?? "Nie udało się odwołać wizyty.",
      };
    }
    revalidatePath("/rezerwacje");
    return { ok: true, refundFailed: Boolean(body?.refundFailed) };
  } catch (error) {
    console.error("[visits] cancelling as the centre failed:", error);
    return {
      ok: false,
      message: "Nie udało się połączyć ze stroną rezerwacji.",
    };
  }
}
