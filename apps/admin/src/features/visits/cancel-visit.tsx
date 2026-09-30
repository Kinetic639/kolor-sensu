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
import { IconButton } from "@repo/ui/icon-action";
import { XCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { cancelVisitAsCentreAction } from "./actions";

// The centre cancelling a visit, after saying what follows: the client
// gets all their money back and an e-mail. From the row's "⋮" menu or the
// side panel.

export interface CancellableVisit {
  id: string;
  reference: string;
  /** `Jan Kowalski, czwartek, 1 października 2026, 09:00–09:50` */
  label: string;
  paid: boolean;
  /** Where the e-mail about it goes; none: the client is told another way. */
  email: string | null;
}

export function CancelVisitDialog({
  visit,
  open,
  onOpenChange,
}: {
  visit: CancellableVisit;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  return (
    <AlertDialog onOpenChange={onOpenChange} open={open}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Odwołać wizytę {visit.reference}?</AlertDialogTitle>
          <AlertDialogDescription>
            {visit.label}. {visit.paid ? "Klient otrzyma pełny zwrot. " : ""}
            {visit.email
              ? visit.paid
                ? "Klient dostanie e-mail z przeprosinami."
                : "Klient dostanie e-mail o odwołaniu."
              : "Klient nie ma adresu e-mail: powiadom go telefonicznie."}{" "}
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
                if (result.refundFailed) {
                  toast.warning(
                    "Wizyta odwołana, ale zwrot się nie udał. Zleć go w Stripe.",
                  );
                } else {
                  toast.success("Wizyta odwołana");
                }
                router.refresh();
              })
            }
          >
            Odwołaj wizytę
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

/** "Odwołaj wizytę" in the side panel's toolbar: an icon with a tooltip. */
export function CancelVisitButton({ visit }: { visit: CancellableVisit }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <IconButton
        destructive
        icon={<XCircle aria-hidden="true" />}
        label="Odwołaj wizytę"
        onClick={() => setOpen(true)}
      />
      <CancelVisitDialog onOpenChange={setOpen} open={open} visit={visit} />
    </>
  );
}
