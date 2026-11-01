import type { WorkshopEmailKind } from "@repo/supabase/workshops";

// Warsztaty's part of the scheduled job (every 15 minutes, with the
// visits'; docs/product/workshops-plan.md, PR 5): seats whose hold, offer
// or payment time ran out end (their seats going to the waitlist); the
// admins hear of a minimum not reached in time and of an online workshop
// soon without its meeting link; money owed is given back
// (and the participant told); then every e-mail an event calls for goes,
// each claimed once in the database, so a second run sends nothing twice.

export interface OwedRefund {
  registrationId: string;
  reference: string;
  owedMinor: number;
}

export interface WorkshopJobDeps {
  expire: () => Promise<number>;
  remindMinimums: () => Promise<number>;
  /** Online workshops soon without their link, told to the admins. */
  remindLinks: () => Promise<number>;
  listOwed: () => Promise<OwedRefund[]>;
  /** What Stripe gave back; throws when it refuses. */
  refund: (owed: OwedRefund) => Promise<number>;
  listDue: () => Promise<{ reference: string; kind: WorkshopEmailKind }[]>;
  /** Never throws. */
  send: (
    reference: string,
    kind: WorkshopEmailKind,
  ) => Promise<"sent" | "skipped" | "failed">;
}

export async function runWorkshopJobs(deps: WorkshopJobDeps) {
  const expired = await deps.expire();
  const minimums = await deps.remindMinimums();
  const missingLinks = await deps.remindLinks();

  let refunds = 0;
  let refundsFailed = 0;
  for (const owed of await deps.listOwed()) {
    try {
      if ((await deps.refund(owed)) > 0) {
        refunds += 1;
        await deps.send(owed.reference, "refunded");
      }
    } catch (error) {
      console.error(`[workshops] owed refund ${owed.reference} failed:`, error);
      refundsFailed += 1;
    }
  }

  const tally = { sent: 0, skipped: 0, failed: 0 };
  for (const { reference, kind } of await deps.listDue()) {
    tally[await deps.send(reference, kind)] += 1;
  }
  return {
    expired,
    minimums,
    missingLinks,
    refunds,
    refundsFailed,
    emails: tally,
  };
}
