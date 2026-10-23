import { workshopMessageRequestSchema } from "@repo/contracts/workshops";
import { NextResponse } from "next/server";
import { centreRequest } from "@/features/booking/centre-route";
import { messageAsCentre } from "@/features/workshops/centre-participants";
import { refusalStatus } from "@/features/workshops/centre-status";

// The admin portal writes to everyone signed up for a workshop (docs/
// product/workshops-plan.md, PR 6): kept in the database (which checks the
// admin's role), sent from here.

export async function POST(
  request: Request,
  { params }: RouteContext<"/api/centrum/warsztaty/[id]/wiadomosc">,
) {
  const { id } = await params;
  const checked = await centreRequest(
    request,
    id,
    workshopMessageRequestSchema,
  );
  if (!checked.ok) return checked.response;
  const result = await messageAsCentre(id, checked.body, checked.token);
  if (!result.ok)
    return NextResponse.json(
      { error: result.code },
      { status: refusalStatus(result.code) },
    );
  return NextResponse.json(result);
}
