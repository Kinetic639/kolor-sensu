import "server-only";
import { getVisitIntake } from "@repo/supabase/intakes";
import { visitPanelIntake } from "@repo/ui/visit-table";
import type { createClient } from "@/lib/supabase/server";

// The questionnaire before a consultation, for a visit's side panel: the
// database lets only the centre and the visit's specialist read it (none
// for anyone else, or where it was not given). A failure only leaves it
// out of the panel.

export async function panelIntake(
  client: Awaited<ReturnType<typeof createClient>>,
  visitId: string,
  timeZone: string,
) {
  try {
    const intake = await getVisitIntake(client, visitId);
    return intake ? visitPanelIntake(intake, timeZone) : null;
  } catch (error) {
    console.error("[visits] intake not read:", error);
    return null;
  }
}
