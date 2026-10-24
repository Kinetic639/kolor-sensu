"use server";

import { revalidateWeb } from "@repo/app-runtime/revalidate-web";
import {
  WORKSHOP_ADMIN_PROBLEMS,
  workshopInputSchema,
  type WorkshopInput,
} from "@repo/contracts/workshops";
import {
  completeWorkshop,
  confirmWorkshop,
  deleteWorkshop,
  forgetWorkshopParticipant,
  publishWorkshop,
  saveWorkshop,
  setWorkshopAttendance,
  setWorkshopVisibility,
  unpublishWorkshop,
  WorkshopAdminError,
  type WorkshopVisibility,
} from "@repo/supabase/workshops-admin";
import { revalidatePath } from "next/cache";
import { requirePortalRole } from "@/lib/auth";
import { centreSettings } from "@/lib/reference-data";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/use-save";
import { inputToPayload } from "./view-model";

// Warsztaty's saves (docs/product/workshops-plan.md, PR 2). The database
// checks the admin role, the workshop's rules, its leaders' and room's
// other plans; its refusals are said in Polish. A change the site shows
// refreshes Warsztaty, the workshop's page and the homepage.

function failure(error: unknown, fallback: string): ActionResult {
  if (error instanceof WorkshopAdminError) {
    if (error.code === "forbidden")
      return { ok: false, message: "Brak uprawnień do tej zmiany." };
    const problem = WORKSHOP_ADMIN_PROBLEMS[error.code];
    if (problem) return { ok: false, message: problem };
  }
  console.error("[workshops]", error);
  return { ok: false, message: fallback };
}

async function refreshSite(slug?: string) {
  revalidatePath("/warsztaty");
  await revalidateWeb([
    { path: "/warsztaty" },
    ...(slug ? [{ path: `/warsztaty/${slug}` }] : []),
    { path: "/" },
  ]);
}

export type SaveWorkshopResult =
  { ok: true; id: string } | { ok: false; message: string };

/** Saves the workshop whole (id null: a new draft). */
export async function saveWorkshopAction(
  id: string | null,
  input: WorkshopInput,
): Promise<SaveWorkshopResult> {
  await requirePortalRole();
  const parsed = workshopInputSchema.safeParse(input);
  if (!parsed.success)
    return {
      ok: false,
      message: parsed.error.issues[0]?.message ?? "Sprawdź pola.",
    };
  try {
    const { timezone } = await centreSettings();
    const saved = await saveWorkshop(
      await createClient(),
      id,
      inputToPayload(parsed.data, timezone),
    );
    await refreshSite(parsed.data.slug);
    return { ok: true, id: saved };
  } catch (error) {
    return failure(error, "Nie udało się zapisać warsztatu.") as {
      ok: false;
      message: string;
    };
  }
}

async function run(
  step: (client: Awaited<ReturnType<typeof createClient>>) => Promise<void>,
  slug: string,
  fallback: string,
): Promise<ActionResult> {
  await requirePortalRole();
  try {
    await step(await createClient());
    await refreshSite(slug);
    return { ok: true };
  } catch (error) {
    return failure(error, fallback);
  }
}

export async function publishWorkshopAction(id: string, slug: string) {
  return run(
    (client) => publishWorkshop(client, id),
    slug,
    "Nie udało się opublikować warsztatu.",
  );
}

export async function unpublishWorkshopAction(id: string, slug: string) {
  return run(
    (client) => unpublishWorkshop(client, id),
    slug,
    "Nie udało się wycofać warsztatu.",
  );
}

export async function deleteWorkshopAction(id: string, slug: string) {
  return run(
    (client) => deleteWorkshop(client, id),
    slug,
    "Nie udało się usunąć warsztatu.",
  );
}

export async function confirmWorkshopAction(id: string, slug: string) {
  return run(
    (client) => confirmWorkshop(client, id),
    slug,
    "Nie udało się potwierdzić warsztatu.",
  );
}

export type CancelWorkshopResult =
  | { ok: true; refunded: number; refundFailed: boolean }
  | { ok: false; message: string };

/**
 * Cancels the workshop: the site (apps/web) cancels every seat and gives
 * the paid ones back through Stripe; the request goes there with this
 * admin's access token, and the database checks it is an admin's.
 */
export async function cancelWorkshopAction(
  id: string,
  slug: string,
  reason: string,
): Promise<CancelWorkshopResult> {
  await requirePortalRole();
  const client = await createClient();
  const {
    data: { session },
  } = await client.auth.getSession();
  if (!session) return { ok: false, message: "Zaloguj się ponownie." };
  const url = new URL(
    `/api/centrum/warsztaty/${encodeURIComponent(id)}/odwolanie`,
    process.env.NEXT_PUBLIC_WEB_URL || "http://localhost:3000",
  );
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        authorization: `Bearer ${session.access_token}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ reason: reason.trim() || null }),
      cache: "no-store",
    });
    const answer = (await response.json().catch(() => null)) as {
      error?: string;
      refunded?: number;
      refundFailed?: boolean;
    } | null;
    if (!response.ok) {
      return {
        ok: false,
        message:
          (answer?.error && WORKSHOP_ADMIN_PROBLEMS[answer.error]) ||
          "Nie udało się odwołać warsztatu.",
      };
    }
    await refreshSite(slug);
    revalidatePath(`/warsztaty/${id}`);
    return {
      ok: true,
      refunded: answer?.refunded ?? 0,
      refundFailed: Boolean(answer?.refundFailed),
    };
  } catch (error) {
    console.error("[workshops] cancelling through the site failed:", error);
    return { ok: false, message: "Nie udało się połączyć ze stroną." };
  }
}

/** Whether the site shows Warsztaty in its menu and on its homepage. */
export async function setWorkshopVisibilityAction(
  visibility: Partial<WorkshopVisibility>,
): Promise<ActionResult> {
  await requirePortalRole();
  try {
    await setWorkshopVisibility(await createClient(), visibility);
    // The menu is on every page: the layout refreshes them all.
    await revalidateWeb([{ path: "/", type: "layout" }]);
    revalidatePath("/warsztaty");
    return { ok: true };
  } catch (error) {
    return failure(error, "Nie udało się zapisać ustawienia.");
  }
}

// ------------------------------------------------------------ participants

/** Asks the site (it moves money and sends e-mails) as this admin. */
async function askTheSite(
  path: string,
  body: unknown,
): Promise<
  { ok: true; answer: Record<string, unknown> } | { ok: false; message: string }
> {
  await requirePortalRole();
  const client = await createClient();
  const {
    data: { session },
  } = await client.auth.getSession();
  if (!session) return { ok: false, message: "Zaloguj się ponownie." };
  const url = new URL(
    path,
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
    const answer = ((await response.json().catch(() => null)) ?? {}) as Record<
      string,
      unknown
    >;
    if (!response.ok) {
      const code = typeof answer.error === "string" ? answer.error : "";
      const fields = answer.fields as Record<string, string> | undefined;
      return {
        ok: false,
        message:
          WORKSHOP_ADMIN_PROBLEMS[code] ??
          (fields ? Object.values(fields)[0] : undefined) ??
          "Nie udało się zapisać zmiany.",
      };
    }
    return { ok: true, answer };
  } catch (error) {
    console.error(`[workshops] ${path} failed:`, error);
    return { ok: false, message: "Nie udało się połączyć ze stroną." };
  }
}

export async function addParticipantAction(
  workshopId: string,
  participant: {
    name: string;
    email: string;
    phone: string;
    notes: string;
    paidOutside: boolean;
  },
): Promise<ActionResult> {
  const result = await askTheSite(
    `/api/centrum/warsztaty/${encodeURIComponent(workshopId)}/uczestnicy`,
    {
      name: participant.name,
      email: participant.email.trim(),
      phone: participant.phone.trim() || null,
      notes: participant.notes.trim() || null,
      paidOutside: participant.paidOutside,
    },
  );
  if (!result.ok) return result;
  revalidatePath(`/warsztaty/${workshopId}`);
  return { ok: true };
}

export async function cancelParticipantAction(
  workshopId: string,
  registrationId: string,
  refundMinor: number,
): Promise<ActionResult> {
  const result = await askTheSite(
    `/api/centrum/warsztaty/zapisy/${encodeURIComponent(registrationId)}/odwolanie`,
    { refundMinor },
  );
  if (!result.ok) return result;
  revalidatePath(`/warsztaty/${workshopId}`);
  if (result.answer.refundFailed)
    return {
      ok: false,
      message:
        "Zapis anulowany, ale zwrot się nie udał. Spróbujemy ponownie automatycznie w ciągu kwadransa.",
    };
  return { ok: true };
}

export async function messageParticipantsAction(
  workshopId: string,
  message: { subject: string; body: string },
): Promise<ActionResult> {
  const result = await askTheSite(
    `/api/centrum/warsztaty/${encodeURIComponent(workshopId)}/wiadomosc`,
    message,
  );
  if (!result.ok) return result;
  revalidatePath(`/warsztaty/${workshopId}`);
  if (Number(result.answer.failed) > 0)
    return {
      ok: false,
      message: `Wysłano ${String(result.answer.sent)}, nie udało się: ${String(result.answer.failed)}.`,
    };
  return { ok: true };
}

export async function setAttendanceAction(
  workshopId: string,
  registrationId: string,
  attended: boolean,
): Promise<ActionResult> {
  await requirePortalRole();
  try {
    await setWorkshopAttendance(await createClient(), registrationId, attended);
    revalidatePath(`/warsztaty/${workshopId}`);
    return { ok: true };
  } catch (error) {
    return failure(error, "Nie udało się zapisać obecności.");
  }
}

/** "Usuń dane": a participant's data, anonymised on their request. */
export async function forgetParticipantAction(
  workshopId: string,
  registrationId: string,
): Promise<ActionResult> {
  await requirePortalRole();
  try {
    await forgetWorkshopParticipant(await createClient(), registrationId);
    revalidatePath(`/warsztaty/${workshopId}`);
    return { ok: true };
  } catch (error) {
    return failure(error, "Nie udało się usunąć danych.");
  }
}

export async function completeWorkshopAction(id: string, slug: string) {
  return run(
    (client) => completeWorkshop(client, id),
    slug,
    "Nie udało się zakończyć warsztatu.",
  );
}
