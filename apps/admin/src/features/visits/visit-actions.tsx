"use client";

import {
  RowActionButton,
  RowActionLink,
  RowActions,
  RowActionSeparator,
} from "@repo/ui/row-actions";
import { Mail, Phone, XCircle } from "lucide-react";
import { useState } from "react";
import { CancelVisitDialog, type CancellableVisit } from "./cancel-visit";

/**
 * A visit's "⋮" menu in the bookings table: reach the client, and cancel
 * (the client gets all their money back), after saying what follows.
 */
export function VisitActions({
  visit,
}: {
  visit: CancellableVisit & {
    phone: string | null;
    email: string | null;
    cancellable: boolean;
  };
}) {
  const [confirming, setConfirming] = useState(false);
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
        {visit.cancellable ? (
          <>
            {visit.phone || visit.email ? <RowActionSeparator /> : null}
            <RowActionButton
              destructive
              icon={<XCircle aria-hidden="true" className="size-4" />}
              onSelect={() => setConfirming(true)}
            >
              Odwołaj wizytę
            </RowActionButton>
          </>
        ) : null}
      </RowActions>
      <CancelVisitDialog
        onOpenChange={setConfirming}
        open={confirming}
        visit={visit}
      />
    </>
  );
}
