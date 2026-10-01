"use client";

import {
  RowActionButton,
  RowActionLink,
  RowActions,
  RowActionSeparator,
} from "@repo/ui/row-actions";
import {
  CancelVisitDialog,
  RefundVisitDialog,
  type CentreVisit,
} from "@repo/ui/visit-table";
import { Banknote, CalendarClock, Mail, Phone, XCircle } from "lucide-react";
import { useState } from "react";
import {
  cancelVisitAsCentreAction,
  refundVisitAsCentreAction,
} from "./actions";

/**
 * A visit's "⋮" menu in the bookings table: reach the client; move it (in
 * the calendar), give money back, or cancel it with the refund the admin
 * chooses (R12), after saying what follows.
 */
export function VisitActions({
  visit,
}: {
  visit: CentreVisit & {
    phone: string | null;
    cancellable: boolean;
    movable: boolean;
    /** The visit's local date, for the calendar. */
    date: string;
  };
}) {
  const [confirming, setConfirming] = useState<"cancel" | "refund" | null>(
    null,
  );
  const refundable = !visit.cancellable && visit.refundableMinor > 0;
  const centre = visit.movable || refundable || visit.cancellable;
  return (
    <>
      <RowActions label={visit.reference}>
        {visit.phone ? (
          <RowActionLink
            href={`tel:${visit.phone.replace(/\s/g, "")}`}
            icon={<Phone aria-hidden="true" className="size-4" />}
          >
            Zadzwoń
          </RowActionLink>
        ) : null}
        {visit.email ? (
          <RowActionLink
            href={`mailto:${visit.email}`}
            icon={<Mail aria-hidden="true" className="size-4" />}
          >
            Napisz e-mail
          </RowActionLink>
        ) : null}
        {centre && (visit.phone || visit.email) ? <RowActionSeparator /> : null}
        {visit.movable ? (
          <RowActionLink
            href={`/kalendarz?data=${visit.date}&przesun=${visit.id}`}
            icon={<CalendarClock aria-hidden="true" className="size-4" />}
          >
            Przesuń wizytę
          </RowActionLink>
        ) : null}
        {refundable ? (
          <RowActionButton
            icon={<Banknote aria-hidden="true" className="size-4" />}
            onSelect={() => setConfirming("refund")}
          >
            Zwróć pieniądze
          </RowActionButton>
        ) : null}
        {visit.cancellable ? (
          <RowActionButton
            destructive
            icon={<XCircle aria-hidden="true" className="size-4" />}
            onSelect={() => setConfirming("cancel")}
          >
            Odwołaj wizytę
          </RowActionButton>
        ) : null}
      </RowActions>
      {confirming === "cancel" ? (
        <CancelVisitDialog
          action={cancelVisitAsCentreAction}
          onOpenChange={(open) => setConfirming(open ? "cancel" : null)}
          open
          visit={visit}
        />
      ) : null}
      {confirming === "refund" ? (
        <RefundVisitDialog
          action={refundVisitAsCentreAction}
          onOpenChange={(open) => setConfirming(open ? "refund" : null)}
          open
          visit={visit}
        />
      ) : null}
    </>
  );
}
