"use server";

import {
  centreChangeMessage,
  type CentreChangeResult,
  type CentreMoveValues,
} from "@repo/contracts/centre-changes";
import { requirePortalRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

// The centre settles visits its own way (R9, R12): cancels at any time with
// the refund the admin chose, gives money back later, moves a visit. The
// site (apps/web) holds the payments and the e-mails, so the request goes
// there with this admin's access token; the database checks it is an
// admin's.

async function askTheSite(
  appointmentId: string,
  path: "odwolanie" | "zwrot" | "przesuniecie" | "rozliczenie",
  body: unknown,
): Promise<CentreChangeResult> {
  await requirePortalRole();
  const client = await createClient();
  const {
    data: { session },
  } = await client.auth.getSession();
  if (!session) return { ok: false, message: "Zaloguj się ponownie." };

  const url = new URL(
    `/api/centrum/wizyty/${encodeURIComponent(appointmentId)}/${path}`,
    process.env.NEXT_PUBLIC_WEB_URL || "http://localhost:3000",
  );
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        authorization: `Bearer ${session.access_token}`,
        "content-type": "application/json",
      },
      body: JSON.stringify(body),
      cache: "no-store",
    });
    const answer = (await response.json().catch(() => null)) as {
      error?: string;
      fields?: Record<string, string>;
      refundFailed?: boolean;
    } | null;
    if (!response.ok) {
      return {
        ok: false,
        message: centreChangeMessage(answer?.error),
        fields: answer?.fields,
      };
    }
    revalidatePath("/rezerwacje");
    revalidatePath("/kalendarz");
    revalidatePath("/");
    return { ok: true, refundFailed: Boolean(answer?.refundFailed) };
  } catch (error) {
    console.error(`[visits] ${path} as the centre failed:`, error);
    return {
      ok: false,
      message: "Nie udało się połączyć ze stroną rezerwacji.",
    };
  }
}

export async function cancelVisitAsCentreAction(
  appointmentId: string,
  choice: { refundMinor: number | null; reason: string | null },
): Promise<CentreChangeResult> {
  return askTheSite(appointmentId, "odwolanie", choice);
}

export async function refundVisitAsCentreAction(
  appointmentId: string,
  choice: { refundMinor: number; reason: string | null },
): Promise<CentreChangeResult> {
  return askTheSite(appointmentId, "zwrot", choice);
}

export async function moveVisitAsCentreAction(
  appointmentId: string,
  move: CentreMoveValues,
): Promise<CentreChangeResult> {
  return askTheSite(appointmentId, "przesuniecie", move);
}

/** Gives back what is still owed (R14): the database says how much. */
export async function settleVisitAsCentreAction(
  appointmentId: string,
): Promise<CentreChangeResult> {
  return askTheSite(appointmentId, "rozliczenie", {});
}
