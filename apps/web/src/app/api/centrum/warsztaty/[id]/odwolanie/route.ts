import { workshopCancelRequestSchema } from "@repo/contracts/workshops";
import { NextResponse } from "next/server";
import { centreRequest } from "@/features/booking/centre-route";
import { cancelWorkshopAsCentre } from "@/features/workshops/centre-cancel";

// The admin portal cancels a workshop (docs/product/workshops-plan.md,
// PR 2): every seat goes and the paid ones are refunded in full, here,
// with the site's Stripe keys; the database checks the admin's role.

export async function POST(
  request: Request,
  { params }: RouteContext<"/api/centrum/warsztaty/[id]/odwolanie">,
) {
  const { id } = await params;
  const checked = await centreRequest(request, id, workshopCancelRequestSchema);
  if (!checked.ok) return checked.response;
  const result = await cancelWorkshopAsCentre(
    id,
    checked.body.reason || null,
    checked.token,
  );
  if (!result.ok) {
    const status =
      result.code === "forbidden"
        ? 403
        : result.code === "not_cancellable"
          ? 409
          : 500;
    return NextResponse.json({ error: result.code }, { status });
  }
  return NextResponse.json(result);
}
