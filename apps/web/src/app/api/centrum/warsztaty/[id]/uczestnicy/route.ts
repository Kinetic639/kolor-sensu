import { workshopParticipantRequestSchema } from "@repo/contracts/workshops";
import { NextResponse } from "next/server";
import { centreRequest } from "@/features/booking/centre-route";
import { addParticipantAsCentre } from "@/features/workshops/centre-participants";
import { refusalStatus } from "@/features/workshops/centre-status";

// The admin portal adds someone to a workshop (docs/product/
// workshops-plan.md, PR 6): they get their confirmation, or the link to
// pay, by e-mail from here; the database checks the admin's role.

export async function POST(
  request: Request,
  { params }: RouteContext<"/api/centrum/warsztaty/[id]/uczestnicy">,
) {
  const { id } = await params;
  const checked = await centreRequest(
    request,
    id,
    workshopParticipantRequestSchema,
  );
  if (!checked.ok) return checked.response;
  const result = await addParticipantAsCentre(id, checked.body, checked.token);
  if (!result.ok)
    return NextResponse.json(
      { error: result.code },
      { status: refusalStatus(result.code) },
    );
  return NextResponse.json(result);
}
