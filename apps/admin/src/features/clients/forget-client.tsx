"use client";

import { useSave } from "@/lib/use-save";
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
import { Button } from "@repo/ui/button";
import { UserX } from "lucide-react";
import { useState } from "react";
import { forgetClientAction } from "./actions";

// A client's card: their details removed at their request (RODO). What
// goes and what stays is said before; the database refuses while a visit
// is to come or money is owed back to them.

export function ForgetClientButton({
  clientId,
  name,
}: {
  clientId: string;
  name: string;
}) {
  const { isPending, run } = useSave();
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button
        onClick={() => setOpen(true)}
        size="sm"
        type="button"
        variant="secondary"
      >
        <UserX aria-hidden="true" />
        Usuń dane klienta
      </Button>
      <AlertDialog onOpenChange={setOpen} open={open}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Usunąć dane klienta?</AlertDialogTitle>
            <AlertDialogDescription>
              Dane klienta „{name}” (imię i nazwisko, e-mail, telefon, notatki)
              znikną z karty, wizyt i powiadomień, a odpowiedzi z testu zostaną
              usunięte. Wizyty i płatności zostają, opisane jako „Klient
              usunięty”. Tego nie da się cofnąć.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Anuluj</AlertDialogCancel>
            <AlertDialogAction
              disabled={isPending}
              onClick={() =>
                run(() => forgetClientAction(clientId), "Usunięto dane klienta")
              }
            >
              Usuń dane
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
