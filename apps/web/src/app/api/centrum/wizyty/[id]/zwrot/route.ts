import { centreRefundRequestSchema } from "@repo/contracts/centre-changes";
import { NextResponse } from "next/server";
import { refundVisitAsCentre } from "@/features/booking/change-visit";
import { centreChangeDeps } from "@/features/booking/change-visit-server";
import { centreRequest, refusal } from "@/features/booking/centre-route";

// The admin portal gives money back later (R12): a late cancellation
// forgiven, a visit that went wrong; up to what is left of the payment.

export async function POST(
  request: Request,
  { params }: RouteContext<"/api/centrum/wizyty/[id]/zwrot">,
) {
  const { id } = await params;
  const checked = await centreRequest(request, id, centreRefundRequestSchema);
  if (!checked.ok) return checked.response;
  const result = await refundVisitAsCentre(
    id,
    checked.body,
    await centreChangeDeps(checked.token),
  );
  if (!result.ok) return refusal(result.code);
  return NextResponse.json(result);
}
