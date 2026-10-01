"use client";

import type { VisitRow } from "@repo/scheduling";
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
} from "./actions";

// What the centre does with a visit from its side panel (R9, R11, R12):
// send the link to pay again, move it (in the calendar), give money back,
// cancel it with the refund the admin chooses.

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
      {!row.cancellable && row.refundableMinor > 0 ? (
        <RefundVisitButton action={refundVisitAsCentreAction} visit={visit} />
      ) : null}
      {row.cancellable ? (
        <CancelVisitButton action={cancelVisitAsCentreAction} visit={visit} />
      ) : null}
    </>
  );
}
