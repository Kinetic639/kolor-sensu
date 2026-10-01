"use server";

import { requirePortalRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import {
  centreBookingMessage,
  resendLinkMessage,
  type CentreBookingActionResult,
  type CentreBookingValues,
} from "@repo/contracts/booking";
import type { ResendPaymentLinkResult } from "@repo/ui/visit-table";
import { revalidatePath } from "next/cache";

// "+ Nowa wizyta" in the calendar (K5). The site (apps/web) sends the
// e-mails, so the booking goes there with this user's access token; the
// database books as them and checks who may (an admin anyone, a
// specialist themselves). Reserved until the client pays online from the
// e-mailed link (R11).

export async function bookVisitAction(
  values: CentreBookingValues,
): Promise<CentreBookingActionResult> {
  await requirePortalRole();
  const client = await createClient();
  const {
    data: { session },
  } = await client.auth.getSession();
  if (!session) return { ok: false, message: "Zaloguj się ponownie." };

  const url = new URL(
    "/api/centrum/wizyty",
    process.env.NEXT_PUBLIC_WEB_URL || "http://localhost:3000",
  );
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        authorization: `Bearer ${session.access_token}`,
        "content-type": "application/json",
      },
      body: JSON.stringify(values),
      cache: "no-store",
    });
    const body = (await response.json().catch(() => null)) as
      | {
          ok: true;
          id: string;
          reference: string;
          paymentDueAt: string;
          emailed: "sent" | "skipped" | "failed";
        }
      | { ok: false; code?: string; fields?: Record<string, string> }
      | null;
    if (!response.ok || !body?.ok) {
      const refused = body && !body.ok ? body : null;
      return {
        ok: false,
        message: centreBookingMessage(refused?.code),
        fields: refused?.fields,
      };
    }
    revalidatePath("/kalendarz");
    revalidatePath("/rezerwacje");
    return {
      ok: true,
      id: body.id,
      reference: body.reference,
      paymentDueAt: body.paymentDueAt,
      emailed: body.emailed,
    };
  } catch (error) {
    console.error("[calendar] booking a visit failed:", error);
    return {
      ok: false,
      message: "Nie udało się połączyć ze stroną rezerwacji.",
    };
  }
}

/**
 * "Wyślij link do płatności" (R11): the site sends a reservation's link to
 * pay again, as this user; the database checks who may.
 */
export async function resendPaymentLinkAction(
  appointmentId: string,
): Promise<ResendPaymentLinkResult> {
  await requirePortalRole();
  const client = await createClient();
  const {
    data: { session },
  } = await client.auth.getSession();
  if (!session) return { ok: false, message: "Zaloguj się ponownie." };

  const url = new URL(
    `/api/centrum/wizyty/${encodeURIComponent(appointmentId)}/link`,
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
      emailed?: "sent" | "skipped" | "failed";
    } | null;
    if (!response.ok || !body?.emailed) {
      return { ok: false, message: resendLinkMessage(body?.error) };
    }
    return { ok: true, emailed: body.emailed };
  } catch (error) {
    console.error("[calendar] sending the link to pay failed:", error);
    return {
      ok: false,
      message: "Nie udało się połączyć ze stroną rezerwacji.",
    };
  }
}
