import {
  WorkshopAdminError,
  type centreResendWorkshopLink,
} from "@repo/supabase/workshops-admin";
import type { WorkshopEmailKind } from "@repo/supabase/workshops";

// The admin sends a participant's link again (Warsztat · 6, card 8): the
// database lets the e-mail of the seat's state go once more (checking the
// admin, and not more often than every five minutes), then it is sent as
// the first one was, with a new link; the earlier links still work.

export type ResendWorkshopLinkResult =
  | { ok: true; reference: string; emailed: "sent" | "skipped" | "failed" }
  | { ok: false; code: string };

export async function resendWorkshopLink(
  registrationId: string,
  deps: {
    allow: (
      registrationId: string,
    ) => ReturnType<typeof centreResendWorkshopLink>;
    /** Never throws. */
    send: (
      reference: string,
      kind: WorkshopEmailKind,
    ) => Promise<"sent" | "skipped" | "failed">;
  },
): Promise<ResendWorkshopLinkResult> {
  let allowed: { reference: string; kind: WorkshopEmailKind };
  try {
    allowed = await deps.allow(registrationId);
  } catch (error) {
    if (error instanceof WorkshopAdminError)
      return { ok: false, code: error.code };
    throw error;
  }
  return {
    ok: true,
    reference: allowed.reference,
    emailed: await deps.send(allowed.reference, allowed.kind),
  };
}
