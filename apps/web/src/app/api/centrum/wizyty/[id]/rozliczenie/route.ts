import { centreSettleRequestSchema } from "@repo/contracts/centre-changes";
import { NextResponse } from "next/server";
import { settleVisitAsCentre } from "@/features/booking/change-visit";
import { centreChangeDeps } from "@/features/booking/change-visit-server";
import { centreRequest, refusal } from "@/features/booking/centre-route";

// The admin portal settles what is still owed (R14): a refund Stripe
// refused, or a payment for a visit that never was. The database says how
// much; the site refunds it and tells the client.

export async function POST(
  request: Request,
  { params }: RouteContext<"/api/centrum/wizyty/[id]/rozliczenie">,
) {
  const { id } = await params;
  const checked = await centreRequest(request, id, centreSettleRequestSchema);
  if (!checked.ok) return checked.response;
  const result = await settleVisitAsCentre(
    id,
    await centreChangeDeps(checked.token),
  );
  if (!result.ok) return refusal(result.code);
  return NextResponse.json(result);
}
