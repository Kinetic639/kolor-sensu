import { NextResponse } from "next/server";
import { cancelVisitAsCentre } from "@/features/booking/change-visit";
import { centreCancelDeps } from "@/features/booking/change-visit-server";

// The admin portal cancels a visit (docs/product/booking-plan.md, R9). The
// money and the e-mails live here, with the site; the admin's access token
// comes with the request and the database checks it is an admin's. Always
// the full refund.

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(
  request: Request,
  { params }: RouteContext<"/api/centrum/wizyty/[id]/odwolanie">,
) {
  const { id } = await params;
  const token = /^Bearer (\S+)$/.exec(
    request.headers.get("authorization") ?? "",
  )?.[1];
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!UUID.test(id)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const result = await cancelVisitAsCentre(id, centreCancelDeps(token));
  if (!result.ok) {
    const status =
      result.code === "not_found"
        ? 404
        : result.code === "not_cancellable"
          ? 409
          : 403;
    return NextResponse.json({ error: result.code }, { status });
  }
  return NextResponse.json(result);
}
