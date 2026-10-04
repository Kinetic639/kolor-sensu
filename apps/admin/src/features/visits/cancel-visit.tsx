"use client";

import type { SettlementView, VisitRow } from "@repo/scheduling";
import { SettleButton } from "@repo/ui/settlement-list";
import {
  CancelVisitButton,
  MoveVisitLink,
  RefundVisitButton,
  ResendPaymentLinkButton,
} from "@repo/ui/visit-table";
import { resendPaymentLinkAction } from "@/features/calendar/actions";
import {
  cancelVisitAsCentreAction,
  refundVisitAsCentreAction,
  settleVisitAsCentreAction,
} from "./actions";

// What the centre does with a visit from its side panel (R9, R11, R12):
// send the link to pay again, move it (in the calendar), give money back
// (or a refund still owed, again), cancel it with the refund the admin
// chooses.

/** The refund a visit still owes, as the settling button shows it. */
function owedOf(row: VisitRow): SettlementView {
  const owed = new Intl.NumberFormat("pl-PL", {
    style: "currency",
    currency: row.currencyCode,
    maximumFractionDigits: 2,
    minimumFractionDigits: row.owedMinor % 100 ? 2 : 0,
  }).format(row.owedMinor / 100);
  return {
    id: row.id,
    reference: row.reference,
    title: "Zwrot do zlecenia",
    description: row.reference,
    owedMinor: row.owedMinor,
    owed,
    clientName: row.clientName,
    href: "",
  };
}

export function CentreVisitToolbar({
  row,
  label,
}: {
  row: VisitRow;
  /** `Jan Kowalski, czwartek, 1 października 2026, 09:00–09:50` */
  label: string;
}) {
  const visit = {
    id: row.id,
    reference: row.reference,
    label,
    refundableMinor: row.refundableMinor,
    currencyCode: row.currencyCode,
    email: row.email,
  };
  return (
    <>
      {row.resendable ? (
        <ResendPaymentLinkButton
          action={resendPaymentLinkAction}
          visitId={row.id}
        />
      ) : null}
      {row.movable ? (
        <MoveVisitLink href={`/kalendarz?data=${row.date}&przesun=${row.id}`} />
      ) : null}
      {/* A refund owed (Stripe refused it, or it is under way) is given
          again as it was, not as a new one on top. */}
      {row.owedMinor > 0 ? (
        <SettleButton action={settleVisitAsCentreAction} item={owedOf(row)} />
      ) : !row.cancellable && row.refundableMinor > 0 ? (
        <RefundVisitButton action={refundVisitAsCentreAction} visit={visit} />
      ) : null}
      {row.cancellable ? (
        <CancelVisitButton action={cancelVisitAsCentreAction} visit={visit} />
      ) : null}
    </>
  );
}
