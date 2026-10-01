import { centreCancelRequestSchema } from "@repo/contracts/centre-changes";
import { NextResponse } from "next/server";
import { cancelVisitAsCentre } from "@/features/booking/change-visit";
import { centreChangeDeps } from "@/features/booking/change-visit-server";
import { centreRequest, refusal } from "@/features/booking/centre-route";

// The admin portal cancels a visit (docs/product/booking-plan.md, R9, R12):
// at any time, giving back what the admin chose (all of it by default),
// with a reason the client is told. The money and the e-mails live here,
// with the site; the database checks the admin's role.

export async function POST(
  request: Request,
  { params }: RouteContext<"/api/centrum/wizyty/[id]/odwolanie">,
) {
  const { id } = await params;
  const checked = await centreRequest(request, id, centreCancelRequestSchema);
  if (!checked.ok) return checked.response;
  const result = await cancelVisitAsCentre(
    id,
    checked.body,
    await centreChangeDeps(checked.token),
  );
  if (!result.ok) return refusal(result.code);
  return NextResponse.json(result);
}
