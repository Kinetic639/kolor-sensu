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
import { DetailSection } from "@repo/ui/detail-page";
import { Switch } from "@repo/ui/switch";
import { toast } from "@repo/ui/toast";
import type { Route } from "next";
import Link from "next/link";
import { useOptimistic, useState } from "react";
import {
  setSpecialistActiveAction,
  setSpecialistVisibilityAction,
} from "./actions";

// A specialist's page → Ustawienia: on the site or hidden for a while (the
// centre still books them, their portal works), and active or suspended
// (no site, no online booking, no portal; booked visits stay for the
// centre to move or cancel). Suspending asks first.

const visitsLabel = (count: number) =>
  count === 1
    ? "1 umówiona wizyta"
    : count % 10 >= 2 &&
        count % 10 <= 4 &&
        (count % 100 < 12 || count % 100 > 14)
      ? `${count} umówione wizyty`
      : `${count} umówionych wizyt`;

function Row({
  label,
  description,
  checked,
  disabled,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <label className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-0.5 border-b border-[color-mix(in_srgb,var(--border)_60%,transparent)] px-3.5 py-2.5 last:border-b-0">
      <span className="text-[0.8125rem] font-semibold text-[var(--text)]">
        {label}
      </span>
      <Switch
        aria-label={label}
        checked={checked}
        className="row-span-2"
        disabled={disabled}
        onCheckedChange={onChange}
        size="sm"
      />
      <span className="text-[0.75rem] text-[var(--text-muted)]">
        {description}
      </span>
    </label>
  );
}

export function SpecialistAccess({
  specialistId,
  name,
  active,
  publiclyVisible,
  onSite,
  upcoming,
}: {
  specialistId: string;
  name: string;
  active: boolean;
  publiclyVisible: boolean;
  /** Their profile approved (else nothing of theirs is on the site yet). */
  onSite: boolean;
  /** Visits still booked with them. */
  upcoming: number;
}) {
  const { isPending, run } = useSave();
  const [state, setState] = useOptimistic({ active, publiclyVisible });
  const [confirming, setConfirming] = useState(false);

  const setActive = (next: boolean) =>
    run(
      async () => {
        setState((now) => ({ ...now, active: next }));
        const result = await setSpecialistActiveAction(specialistId, next);
        if (result.ok && !next && result.upcoming > 0) {
          toast.info(
            `Do przełożenia lub odwołania: ${visitsLabel(result.upcoming)}.`,
          );
        }
        return result.ok ? { ok: true } : result;
      },
      next ? "Przywrócono specjalistę" : "Zawieszono specjalistę",
    );

  return (
    <DetailSection
      note="strona, rezerwacje, portal"
      title="Widoczność i dostęp"
    >
      <Row
        checked={state.publiclyVisible}
        description={
          onSite
            ? "Wyłączone: profil znika ze strony i z rezerwacji online. Centrum nadal zapisuje wizyty, portal działa."
            : "Profil nie jest jeszcze zatwierdzony: specjalista pojawi się na stronie dopiero po zatwierdzeniu profilu (o ile to jest włączone)."
        }
        disabled={isPending || !state.active}
        label="Na stronie"
        onChange={(next) =>
          run(
            async () => {
              setState((now) => ({ ...now, publiclyVisible: next }));
              return setSpecialistVisibilityAction(specialistId, next);
            },
            next
              ? "Specjalista jest na stronie"
              : "Ukryto specjalistę na stronie",
          )
        }
      />
      <Row
        checked={state.active}
        description="Dostęp do portalu specjalisty. Wyłączone (zawieszony): bez strony, rezerwacji online i nowych wizyt od centrum; nie zaloguje się do portalu. Umówione wizyty zostają."
        disabled={isPending}
        label="Aktywny"
        onChange={(next) => (next ? setActive(true) : setConfirming(true))}
      />
      {!state.active && upcoming > 0 ? (
        <p
          className="bg-[var(--warning-soft)] px-3.5 py-2 text-[0.75rem] text-[var(--warning-foreground)]"
          role="status"
        >
          {name} ma jeszcze {visitsLabel(upcoming)}.{" "}
          <Link
            className="font-medium underline underline-offset-4"
            href={
              `/rezerwacje?specjalista=${specialistId}&status=potwierdzone&status=oczekujace` as Route
            }
          >
            Przełóż lub odwołaj
          </Link>
        </p>
      ) : null}
      <AlertDialog onOpenChange={setConfirming} open={confirming}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Zawiesić specjalistę?</AlertDialogTitle>
            <AlertDialogDescription>
              {name} zniknie ze strony i z rezerwacji, centrum nie zapisze już
              nowych wizyt, a logowanie do portalu specjalisty zostanie
              zablokowane.
              {upcoming > 0
                ? ` Do przełożenia lub odwołania w Rezerwacjach: ${visitsLabel(upcoming)}.`
                : ""}{" "}
              Można to cofnąć w każdej chwili.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Anuluj</AlertDialogCancel>
            <AlertDialogAction onClick={() => setActive(false)}>
              Zawieś
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DetailSection>
  );
}
