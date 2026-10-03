"use client";

import {
  parseMoneyInput,
  type CentreChangeResult,
} from "@repo/contracts/centre-changes";
import { Banknote, CalendarClock, XCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useId, useState, useTransition } from "react";
import { toast } from "../toast";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../alert-dialog";
import { Button } from "../button";
import { IconButton, IconLink } from "../icon-action";
import { Input } from "../input";
import { Label } from "../label";
import { Textarea } from "../textarea";

// The centre settling a visit its own way (docs/product/booking-plan.md,
// R12), admins only: cancelling at any time with the refund the admin
// chooses (all of it by default; less keeps costs for a late cancellation),
// giving money back later, moving a visit. The portal's actions ask the
// site, which refunds through Stripe and tells the client; the database
// checks it all again.

export interface CentreVisit {
  id: string;
  reference: string;
  /** `Jan Kowalski, czwartek, 1 października 2026, 09:00–09:50` */
  label: string;
  /** What is left of the payment to give back, in grosze (0: nothing). */
  refundableMinor: number;
  currencyCode: string;
  /** Where the e-mail about it goes; none: the client is told another way. */
  email: string | null;
}

export type CancelAction = (
  visitId: string,
  choice: { refundMinor: number | null; reason: string | null },
) => Promise<CentreChangeResult>;

export type RefundAction = (
  visitId: string,
  choice: { refundMinor: number; reason: string | null },
) => Promise<CentreChangeResult>;

function money(minor: number, currencyCode: string) {
  return new Intl.NumberFormat("pl-PL", {
    style: "currency",
    currency: currencyCode,
    maximumFractionDigits: minor % 100 === 0 ? 0 : 2,
  }).format(minor / 100);
}

/** `200` or `200,50`, as typed back into the field. */
function asInput(minor: number) {
  return minor % 100 === 0
    ? String(minor / 100)
    : (minor / 100).toFixed(2).replace(".", ",");
}

/** The amount to give back and why: the fields both dialogs share. */
function RefundFields({
  visit,
  amount,
  onAmount,
  reason,
  onReason,
  error,
  allowZero,
}: {
  visit: CentreVisit;
  amount: string;
  onAmount: (value: string) => void;
  reason: string;
  onReason: (value: string) => void;
  error: string | null;
  allowZero: boolean;
}) {
  const id = useId();
  const minor = parseMoneyInput(amount);
  const kept =
    minor !== null && minor <= visit.refundableMinor
      ? visit.refundableMinor - minor
      : null;
  return (
    <div className="grid gap-3">
      <div className="grid gap-1.5">
        <Label htmlFor={`${id}-amount`}>Kwota zwrotu (zł)</Label>
        <Input
          aria-describedby={`${id}-amount-hint`}
          aria-invalid={error ? true : undefined}
          id={`${id}-amount`}
          inputMode="decimal"
          onChange={(event) => onAmount(event.target.value)}
          value={amount}
        />
        <p
          className="text-xs text-[var(--text-muted)]"
          id={`${id}-amount-hint`}
        >
          Najwyżej {money(visit.refundableMinor, visit.currencyCode)}
          {allowZero ? "; 0, jeśli bez zwrotu" : ""}.
          {kept !== null && kept > 0
            ? ` Zatrzymane: ${money(kept, visit.currencyCode)}.`
            : ""}
        </p>
        {error ? (
          <p className="text-xs font-medium text-[var(--danger)]" role="alert">
            {error}
          </p>
        ) : null}
      </div>
      <ReasonField onReason={onReason} reason={reason} />
    </div>
  );
}

function ReasonField({
  reason,
  onReason,
}: {
  reason: string;
  onReason: (value: string) => void;
}) {
  const id = useId();
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={id}>Powód (zobaczy go klient)</Label>
      <Textarea
        id={id}
        maxLength={500}
        onChange={(event) => onReason(event.target.value)}
        placeholder="np. odwołanie w dniu wizyty, koszty operacyjne"
        rows={2}
        value={reason}
      />
    </div>
  );
}

function checkAmount(
  amount: string,
  visit: CentreVisit,
  allowZero: boolean,
): { minor: number } | { error: string } {
  const minor = parseMoneyInput(amount);
  if (minor === null) return { error: "Podaj kwotę, np. 150 albo 150,50." };
  if (minor > visit.refundableMinor) {
    return {
      error: `Najwyżej ${money(visit.refundableMinor, visit.currencyCode)}.`,
    };
  }
  if (!allowZero && minor === 0) return { error: "Podaj kwotę zwrotu." };
  return { minor };
}

function settled(result: CentreChangeResult, done: string) {
  if (!result.ok) {
    toast.error(result.message);
    return false;
  }
  if (result.refundFailed) {
    toast.warning(`${done}, ale zwrot się nie udał. Zleć go w Stripe.`);
  } else {
    toast.success(done);
  }
  return true;
}

export function CancelVisitDialog({
  visit,
  open,
  onOpenChange,
  action,
}: {
  visit: CentreVisit;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  action: CancelAction;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const paid = visit.refundableMinor > 0;
  const [amount, setAmount] = useState(asInput(visit.refundableMinor));
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  const confirm = () => {
    const checked = paid
      ? checkAmount(amount, visit, true)
      : { minor: 0 as number };
    if ("error" in checked) {
      setError(checked.error);
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await action(visit.id, {
        refundMinor: paid ? checked.minor : null,
        reason: reason.trim() || null,
      });
      if (settled(result, "Wizyta odwołana")) {
        onOpenChange(false);
        router.refresh();
      }
    });
  };

  return (
    <AlertDialog onOpenChange={onOpenChange} open={open}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Odwołać wizytę {visit.reference}?</AlertDialogTitle>
          <AlertDialogDescription>
            {visit.label}.{" "}
            {visit.email
              ? paid
                ? "Klient dostanie e-mail z kwotą zwrotu i powodem."
                : "Wizyta nie jest opłacona, więc nie ma czego zwracać. Klient dostanie e-mail o odwołaniu."
              : "Klient nie ma adresu e-mail: powiadom go telefonicznie."}{" "}
            Termin wróci do puli wolnych terminów.
          </AlertDialogDescription>
        </AlertDialogHeader>
        {paid ? (
          <RefundFields
            allowZero
            amount={amount}
            error={error}
            onAmount={setAmount}
            onReason={setReason}
            reason={reason}
            visit={visit}
          />
        ) : (
          <ReasonField onReason={setReason} reason={reason} />
        )}
        <AlertDialogFooter>
          <AlertDialogCancel>Nie odwołuj</AlertDialogCancel>
          <Button loading={pending} onClick={confirm} variant="destructive">
            Odwołaj wizytę
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function RefundVisitDialog({
  visit,
  open,
  onOpenChange,
  action,
}: {
  visit: CentreVisit;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  action: RefundAction;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [amount, setAmount] = useState(asInput(visit.refundableMinor));
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  const confirm = () => {
    const checked = checkAmount(amount, visit, false);
    if ("error" in checked) {
      setError(checked.error);
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await action(visit.id, {
        refundMinor: checked.minor,
        reason: reason.trim() || null,
      });
      if (settled(result, "Zwrot zlecony")) {
        onOpenChange(false);
        router.refresh();
      }
    });
  };

  return (
    <AlertDialog onOpenChange={onOpenChange} open={open}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Zwrot za wizytę {visit.reference}</AlertDialogTitle>
          <AlertDialogDescription>
            {visit.label}. Pieniądze wrócą tą samą metodą, którą klient
            zapłacił, zwykle w ciągu kilku dni roboczych.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <RefundFields
          allowZero={false}
          amount={amount}
          error={error}
          onAmount={setAmount}
          onReason={setReason}
          reason={reason}
          visit={visit}
        />
        <AlertDialogFooter>
          <AlertDialogCancel>Anuluj</AlertDialogCancel>
          <Button loading={pending} onClick={confirm}>
            Zwróć pieniądze
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

/** "Odwołaj wizytę" in a visit's side panel. */
export function CancelVisitButton({
  visit,
  action,
}: {
  visit: CentreVisit;
  action: CancelAction;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <IconButton
        destructive
        icon={<XCircle aria-hidden="true" />}
        label="Odwołaj wizytę"
        onClick={() => setOpen(true)}
      />
      {open ? (
        <CancelVisitDialog
          action={action}
          onOpenChange={setOpen}
          open={open}
          visit={visit}
        />
      ) : null}
    </>
  );
}

/** "Zwróć pieniądze" in a visit's side panel. */
export function RefundVisitButton({
  visit,
  action,
}: {
  visit: CentreVisit;
  action: RefundAction;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <IconButton
        icon={<Banknote aria-hidden="true" />}
        label="Zwróć pieniądze"
        onClick={() => setOpen(true)}
      />
      {open ? (
        <RefundVisitDialog
          action={action}
          onOpenChange={setOpen}
          open={open}
          visit={visit}
        />
      ) : null}
    </>
  );
}

/** "Przesuń wizytę": to the calendar, to pick the new place. */
export function MoveVisitLink({ href }: { href: string }) {
  return (
    <IconLink
      href={href}
      icon={<CalendarClock aria-hidden="true" />}
      label="Przesuń wizytę"
    />
  );
}
