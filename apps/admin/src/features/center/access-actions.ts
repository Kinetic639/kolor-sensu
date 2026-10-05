"use server";

import { requirePortalRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { accessMessage, type AdminInviteResult } from "@repo/contracts/access";
import { AccessError, grantAdmin, revokeAdmin } from "@repo/supabase/access";
import { revalidatePath } from "next/cache";

// Ustawienia → Dostęp. The admin's access is given or taken in the
// database (which checks who asks); a new admin is invited through the
// site, which holds the service key and the e-mails, with this admin's
// access token.

type ActionResult = { ok: true } | { ok: false; message: string };

async function change(
  apply: (client: Awaited<ReturnType<typeof createClient>>) => Promise<void>,
): Promise<ActionResult> {
  await requirePortalRole();
  try {
    await apply(await createClient());
    revalidatePath("/ustawienia");
    return { ok: true };
  } catch (error) {
    if (!(error instanceof AccessError)) {
      console.error("[access] change failed:", error);
    }
    return {
      ok: false,
      message: accessMessage(
        error instanceof AccessError ? error.code : undefined,
      ),
    };
  }
}

export async function grantAdminAction(userId: string) {
  return change((client) => grantAdmin(client, userId));
}

export async function revokeAdminAction(userId: string) {
  return change((client) => revokeAdmin(client, userId));
}

export async function inviteAdminAction(
  values: Record<string, unknown>,
): Promise<AdminInviteResult> {
  await requirePortalRole();
  const client = await createClient();
  const {
    data: { session },
  } = await client.auth.getSession();
  if (!session) return { ok: false, message: "Zaloguj się ponownie." };
  try {
    const response = await fetch(
      new URL(
        "/api/centrum/dostep",
        process.env.NEXT_PUBLIC_WEB_URL || "http://localhost:3000",
      ),
      {
        method: "POST",
        headers: {
          authorization: `Bearer ${session.access_token}`,
          "content-type": "application/json",
        },
        body: JSON.stringify(values),
        cache: "no-store",
      },
    );
    const answer = (await response
      .json()
      .catch(() => null)) as AdminInviteResult | null;
    if (!answer) {
      return { ok: false, message: "Nie udało się wysłać zaproszenia." };
    }
    if (answer.ok) {
      revalidatePath("/ustawienia");
      revalidatePath("/specjalisci");
    }
    return answer;
  } catch (error) {
    console.error("[access] the invitation failed:", error);
    return { ok: false, message: "Nie udało się połączyć ze stroną." };
  }
}
