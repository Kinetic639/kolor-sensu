import { listWorkshopParticipants } from "@repo/supabase/workshops-admin";
import { participantsCsv } from "@/features/workshops/participants-view";
import { requirePortalRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

// A workshop's participants as a CSV file (docs/product/workshops-plan.md,
// PR 6): the admin's own client, so the database's rules decide what it
// may read.

export async function GET(
  _request: Request,
  { params }: RouteContext<"/warsztaty/[id]/uczestnicy.csv">,
) {
  await requirePortalRole();
  const { id } = await params;
  const participants = await listWorkshopParticipants(await createClient(), id);
  return new Response(`\uFEFF${participantsCsv(participants)}`, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="uczestnicy-${id.slice(0, 8)}.csv"`,
      "cache-control": "no-store",
    },
  });
}
