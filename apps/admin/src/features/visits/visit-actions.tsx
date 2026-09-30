"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@repo/ui/alert-dialog";
import {
  RowActionButton,
  RowActionLink,
  RowActions,
  RowActionSeparator,
} from "@repo/ui/row-actions";
import { Mail, Phone, XCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { cancelVisitAsCentreAction } from "./actions";

/**
 * A visit's "⋮" menu in the bookings table: reach the client, and cancel
 * (the client gets all their money back), after saying what follows.
 */
export function VisitActions({
  visit,
}: {
  visit: {
    id: string;
    reference: string;
    /** `Jan Kowalski, czwartek, 1 października 2026, 09:00–09:50` */
    label: string;
    phone: string | null;
    email: string | null;
    paid: boolean;
    cancellable: boolean;
  };
}) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [isPending, startTransition] = useTransition();

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

      <AlertDialog onOpenChange={setConfirming} open={confirming}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Odwołać wizytę {visit.reference}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              {visit.label}.{" "}
              {visit.paid
                ? "Klient otrzyma pełny zwrot i e-mail z przeprosinami."
                : "Klient otrzyma e-mail o odwołaniu."}{" "}
              Termin wróci do puli wolnych terminów.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Nie odwołuj</AlertDialogCancel>
            <AlertDialogAction
              disabled={isPending}
              onClick={() =>
                startTransition(async () => {
                  const result = await cancelVisitAsCentreAction(visit.id);
                  if (!result.ok) {
                    toast.error(result.message);
                    return;
                  }
                  toast[result.refundFailed ? "warning" : "success"](
                    result.refundFailed
                      ? "Wizyta odwołana, ale zwrot się nie udał. Zleć go w Stripe."
                      : "Wizyta odwołana",
                  );
                  router.refresh();
                })
              }
            >
              Odwołaj wizytę
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
