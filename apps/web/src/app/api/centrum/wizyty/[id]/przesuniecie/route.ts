import { centreMoveSchema } from "@repo/contracts/centre-changes";
import { NextResponse } from "next/server";
import { rescheduleVisitAsCentre } from "@/features/booking/change-visit";
import { centreChangeDeps } from "@/features/booking/change-visit-server";
import { centreRequest, refusal } from "@/features/booking/centre-route";

// The admin portal moves a visit (R12): to any free time, room or form,
// whatever the client's windows; the client gets an e-mail with the new
// time and a new link.

export async function POST(
  request: Request,
  { params }: RouteContext<"/api/centrum/wizyty/[id]/przesuniecie">,
) {
  const { id } = await params;
  const checked = await centreRequest(request, id, centreMoveSchema);
  if (!checked.ok) return checked.response;
  const result = await rescheduleVisitAsCentre(
    id,
    checked.body,
    await centreChangeDeps(checked.token),
  );
  if (!result.ok) return refusal(result.code);
  return NextResponse.json(result);
}
