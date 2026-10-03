"use client";

import type { CentreChangeResult } from "@repo/contracts/centre-changes";
import type { SettlementView } from "@repo/scheduling";
import { Banknote } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "./alert-dialog";
import { Button } from "./button";

// Money still owed to clients (docs/product/booking-plan.md, R14): a refund
// Stripe refused, or a payment for a visit that never was. The admin gives
// it back from here: the site refunds what the database says is owed and
// tells the client.

export type SettleAction = (visitId: string) => Promise<CentreChangeResult>;

export function SettleButton({
  item,
  action,
}: {
  item: SettlementView;
  action: SettleAction;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  const confirm = () =>
    startTransition(async () => {
      const result = await action(item.id);
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      if (result.refundFailed) {
        toast.warning(
          `Stripe znowu odmówił zwrotu ${item.owed}. Sprawdź płatność w panelu Stripe.`,
        );
      } else {
        toast.success(`Zwrot ${item.owed} zlecony`);
      }
      setOpen(false);
      router.refresh();
    });

  return (
    <>
      <Button onClick={() => setOpen(true)} size="sm">
        <Banknote aria-hidden="true" />
        Zwróć {item.owed}
      </Button>
      <AlertDialog onOpenChange={setOpen} open={open}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Zwrócić {item.owed} klientowi {item.clientName}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Wizyta {item.reference}. Pieniądze wrócą tą samą metodą, którą
              klient zapłacił, zwykle w ciągu kilku dni roboczych. Klient
              dostanie e-mail o zwrocie.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Anuluj</AlertDialogCancel>
            <Button loading={pending} onClick={confirm}>
              Zwróć {item.owed}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export function SettlementList({
  items,
  action,
}: {
  items: SettlementView[];
  action: SettleAction;
}) {
  if (!items.length) return null;
  return (
    <ul aria-label="Do rozliczenia" className="space-y-3">
      {items.map((item) => (
        <li
          className="rounded-[var(--radius-control)] border border-[var(--danger-soft)] bg-[var(--surface)] p-3"
          key={item.id}
        >
          <p className="flex items-baseline justify-between gap-2 text-sm font-semibold text-[var(--text)]">
            <span>{item.title}</span>
            <span className="shrink-0 text-[var(--danger)]">{item.owed}</span>
          </p>
          <p className="mt-0.5 text-xs text-[var(--text-muted)]">
            {item.description}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <SettleButton action={action} item={item} />
            <Button asChild size="sm" variant="ghost">
              <Link href={item.href as Route}>Szczegóły</Link>
            </Button>
          </div>
        </li>
      ))}
    </ul>
  );
}
