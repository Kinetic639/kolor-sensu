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
import type { Route } from "next";
import Link from "next/link";
import { useOptimistic, useState } from "react";
import {
  setSpecialistActiveAction,
  setSpecialistVisibilityAction,
} from "./actions";

// A specialist's page → Przegląd: their two settings, both off for a new
// specialist. Aktywny: takes new visits (online when also visible, and
// from the centre). Widoczny na stronie: their profile, once approved, on
// the site. Their portal works either way; booked visits stay. Turning
// "Aktywny" off asks first.

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
        return result.ok ? { ok: true } : result;
      },
      next ? "Specjalista jest aktywny" : "Specjalista jest nieaktywny",
    );

  return (
    <DetailSection note="rezerwacje i strona" title="Ustawienia specjalisty">
      <Row
        checked={state.active}
        description="Przyjmuje nowe wizyty: online (gdy jest też widoczny na stronie) i zapisywane przez centrum. Wyłączone: bez nowych wizyt; umówione zostają, portal działa."
        disabled={isPending}
        label="Aktywny"
        onChange={(next) => (next ? setActive(true) : setConfirming(true))}
      />
      <Row
        checked={onSite && state.publiclyVisible}
        description={
          onSite
            ? "Profil na stronie Specjaliści. Wyłączone: profil znika ze strony (i z rezerwacji online)."
            : "Najpierw zatwierdź profil specjalisty (zakładka Profil publiczny): niezatwierdzonego profilu nie można pokazać na stronie."
        }
        disabled={isPending || !onSite}
        label="Widoczny na stronie"
        onChange={(next) =>
          run(
            async () => {
              setState((now) => ({ ...now, publiclyVisible: next }));
              return setSpecialistVisibilityAction(specialistId, next);
            },
            next
              ? "Specjalista jest widoczny na stronie"
              : "Specjalista jest niewidoczny na stronie",
          )
        }
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
            Zobacz
          </Link>
        </p>
      ) : null}
      <AlertDialog onOpenChange={setConfirming} open={confirming}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Wyłączyć specjalistę?</AlertDialogTitle>
            <AlertDialogDescription>
              {name} nie przyjmie nowych wizyt: ani online, ani zapisywanych
              przez centrum.
              {upcoming > 0
                ? ` Umówione wizyty (${visitsLabel(upcoming)}) zostają.`
                : ""}{" "}
              Portal specjalisty działa dalej. Można to cofnąć w każdej chwili.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Anuluj</AlertDialogCancel>
            <AlertDialogAction onClick={() => setActive(false)}>
              Wyłącz
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DetailSection>
  );
}
