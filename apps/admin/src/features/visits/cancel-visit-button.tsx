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
  AlertDialogTrigger,
} from "@repo/ui/alert-dialog";
import { Button } from "@repo/ui/button";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import { cancelVisitAsCentreAction } from "./actions";

/** "Odwołaj": the centre cancels a visit, after saying what follows. */
export function CancelVisitButton({
  appointmentId,
  label,
  paid,
}: {
  appointmentId: string;
  /** `Jan Kowalski, środa 2 października, 11:00–11:50` */
  label: string;
  paid: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          aria-label={`Odwołaj wizytę: ${label}`}
          disabled={isPending}
          size="sm"
          variant="secondary"
        >
          Odwołaj
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Odwołać wizytę?</AlertDialogTitle>
          <AlertDialogDescription>
            {label}.{" "}
            {paid
              ? "Klient otrzyma pełny zwrot i e-mail z przeprosinami."
              : "Klient otrzyma e-mail o odwołaniu."}{" "}
            Termin wróci do puli wolnych terminów.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Nie odwołuj</AlertDialogCancel>
          <AlertDialogAction
            onClick={() =>
              startTransition(async () => {
                const result = await cancelVisitAsCentreAction(appointmentId);
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
