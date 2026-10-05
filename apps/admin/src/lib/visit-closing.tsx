import "server-only";

import { getVisitClosure } from "@repo/supabase/visit-closing";
import { VisitClosingForm } from "@repo/ui/visit-table";
import type { createClient } from "@/lib/supabase/server";
import { closeVisitAction } from "./close-visit-action";

// A visit's closing in its panel: for a held visit once begun, the form
// (or how it was closed). The database shows it only to the visit's
// specialist and the admins.

export async function panelClosing(
  client: Awaited<ReturnType<typeof createClient>>,
  visit: { id: string; status: string; startsAt: string } | null,
) {
  if (!visit || visit.status !== "confirmed") return null;
  if (new Date(visit.startsAt) > new Date()) return null;
  const closing = await getVisitClosure(client, visit.id).catch(() => null);
  return (
    <VisitClosingForm
      action={closeVisitAction}
      closing={closing}
      visitId={visit.id}
    />
  );
}
