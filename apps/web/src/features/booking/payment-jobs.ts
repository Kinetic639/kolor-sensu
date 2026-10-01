import { timingSafeEqual } from "node:crypto";
import type { DueBookingEmail } from "@repo/supabase";
import type { VisitEmailKind } from "./email/send-visit-email";

// The scheduled job behind pay-later (docs/product/booking-plan.md, R11),
// every 15 minutes: cancel the reservations not paid in time, then send
// what is due (the payment reminders a day and six hours before, the
// cancellations for want of payment, the reminders a day before a paid
// visit). The database says what is due and claims each e-mail, so a
// second run, or one overlapping, sends nothing twice. It also cancels
// lazily whenever someone books, so the calendar never waits for this job.

export interface PaymentJobDeps {
  cancelUnpaid: () => Promise<string[]>;
  listDue: () => Promise<DueBookingEmail[]>;
  /** Never throws. */
  send: (
    reference: string,
    kind: VisitEmailKind,
  ) => Promise<"sent" | "skipped" | "failed">;
}

export async function runPaymentJobs(deps: PaymentJobDeps) {
  const cancelled = await deps.cancelUnpaid();
  const due = await deps.listDue();
  const tally = { sent: 0, skipped: 0, failed: 0 };
  for (const { reference, kind } of due) {
    if (kind === "rescheduled" || kind === "refunded") continue;
    tally[await deps.send(reference, kind)] += 1;
  }
  return { cancelled, ...tally };
}

/** The database's schedule sends `Authorization: Bearer <CRON_SECRET>`. */
export function isCronRequest(request: Request, secret: string | undefined) {
  if (!secret) return false;
  const given = Buffer.from(request.headers.get("authorization") ?? "");
  const expected = Buffer.from(`Bearer ${secret}`);
  return given.length === expected.length && timingSafeEqual(given, expected);
}
