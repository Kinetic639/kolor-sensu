import { centreChangeMessage } from "@repo/contracts/centre-changes";
import { NextResponse } from "next/server";

// What the portals' change routes share (R9, R12): the signed-in user's
// access token comes with the request (the database checks their role),
// the visit's id is a UUID, the body is checked against the contract, and
// a refusal is answered with its code and a status.

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const STATUS: Record<string, number> = {
  invalid: 400,
  forbidden: 403,
  not_found: 404,
  not_cancellable: 409,
  not_reschedulable: 409,
  nothing_changed: 409,
  not_paid: 409,
  nothing_owed: 409,
  recently_settled: 409,
  refund_too_high: 422,
  room_required: 422,
  in_the_past: 422,
  not_bookable: 422,
  too_soon: 422,
  specialist_busy: 409,
  room_busy: 409,
  room_closed: 409,
  centre_closed: 409,
  time_off: 409,
};

export function refusal(code: string, fields?: Record<string, string>) {
  return NextResponse.json(
    { error: code, message: centreChangeMessage(code), fields },
    { status: STATUS[code] ?? 500 },
  );
}

/** A contract's schema, as far as this needs it. */
interface Checks<T> {
  safeParse(value: unknown):
    | { success: true; data: T }
    | {
        success: false;
        error: { issues: { path: PropertyKey[]; message: string }[] };
      };
}

/** The token and the checked body, or the answer to send instead. */
export async function centreRequest<T>(
  request: Request,
  id: string,
  schema: Checks<T>,
): Promise<
  { ok: true; token: string; body: T } | { ok: false; response: NextResponse }
> {
  const token = /^Bearer (\S+)$/.exec(
    request.headers.get("authorization") ?? "",
  )?.[1];
  if (!token) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }
  if (!UUID.test(id)) return { ok: false, response: refusal("not_found") };
  const parsed = schema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return {
      ok: false,
      response: refusal(
        "invalid",
        Object.fromEntries(
          parsed.error.issues.map((issue) => [
            String(issue.path[0] ?? "form"),
            issue.message,
          ]),
        ),
      ),
    };
  }
  return { ok: true, token, body: parsed.data };
}
