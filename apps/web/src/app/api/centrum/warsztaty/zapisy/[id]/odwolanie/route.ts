import { workshopParticipantCancelSchema } from "@repo/contracts/workshops";
import { NextResponse } from "next/server";
import { centreRequest } from "@/features/booking/centre-route";
import { cancelParticipantAsCentre } from "@/features/workshops/centre-cancel";
import { refusalStatus } from "@/features/workshops/centre-status";

// The admin portal cancels one participant (docs/product/
// workshops-plan.md, PR 6), giving back what the admin chose, here, with
// the site's Stripe keys; the participant hears of it.

export async function POST(
  request: Request,
  { params }: RouteContext<"/api/centrum/warsztaty/zapisy/[id]/odwolanie">,
) {
  const { id } = await params;
  const checked = await centreRequest(
    request,
    id,
    workshopParticipantCancelSchema,
  );
  if (!checked.ok) return checked.response;
  const result = await cancelParticipantAsCentre(
    id,
    checked.body.refundMinor,
    checked.token,
  );
  if (!result.ok)
    return NextResponse.json(
      { error: result.code },
      { status: refusalStatus(result.code) },
    );
  return NextResponse.json(result);
}
