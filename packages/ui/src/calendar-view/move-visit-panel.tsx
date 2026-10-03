"use client";

import {
  centreMoveSchema,
  type CentreChangeResult,
  type CentreMoveValues,
} from "@repo/contracts/centre-changes";
import { CalendarClock, X } from "lucide-react";
import { useQueryStates } from "nuqs";
import { useId, useState, useTransition } from "react";
import { toast } from "../toast";
import { Button } from "../button";
import { cn } from "../lib/utils";
import { Input } from "../input";
import { Label } from "../label";
import { PageLink as Link } from "../public-site/page-link";
import { Textarea } from "../textarea";
import { ClosePanelOnEscape } from "../visit-table/visit-panel-escape";
import { calendarParsers } from "./params";

// Moving a visit as the centre (docs/product/booking-plan.md, R12), admins
// only: the place picked in the grid (or typed), whatever the client's
// windows; the specialist stays. The site's server moves it (the portal's
// action), the database checks the specialist and the room are free, and
// the client gets an e-mail with the new time and a new link.

export interface MoveVisitPanelProps {
  visit: {
    id: string;
    reference: string;
    clientName: string;
    serviceName: string;
    specialistName: string;
    /** `środa, 2 października 2030, 11:00–11:50 · Gabinet 1` */
    current: string;
  };
  defaults: {
    date: string;
    time: string;
    mode: "in_person" | "online";
    roomId: string | null;
  };
  rooms: { id: string; name: string; locationName?: string | null }[];
  action: (
    visitId: string,
    move: CentreMoveValues,
  ) => Promise<CentreChangeResult>;
  closeHref: string;
}

const MODE_LABELS = { in_person: "Stacjonarnie", online: "Online" } as const;

const selectClass =
  "h-10 w-full rounded-[var(--radius-control)] border border-[var(--border)] bg-[var(--surface)] px-3 text-sm text-[var(--text)] focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:outline-none aria-invalid:border-[var(--danger)]";

function FieldError({ id, message }: { id: string; message?: string }) {
  return message ? (
    <p className="text-xs text-[var(--danger)]" id={id} role="alert">
      {message}
    </p>
  ) : null;
}

export function MoveVisitPanel({
  visit,
  defaults,
  rooms,
  action,
  closeHref,
}: MoveVisitPanelProps) {
  const id = useId();
  const field = (name: string) => `${id}-${name}`;
  const [pending, startTransition] = useTransition();
  const [, setParams] = useQueryStates(
    {
      wizyta: calendarParsers.wizyta,
      nowa: calendarParsers.nowa,
      termin: calendarParsers.termin,
      kolumna: calendarParsers.kolumna,
      przesun: calendarParsers.przesun,
    },
    { shallow: false, clearOnDefault: true },
  );
  const [values, setValues] = useState<CentreMoveValues>({
    ...defaults,
    roomId: defaults.roomId ?? (rooms.length === 1 ? rooms[0]!.id : null),
    reason: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const set = (change: Partial<CentreMoveValues>) =>
    setValues((current) => ({ ...current, ...change }));
  const invalid = (name: string) =>
    errors[name]
      ? { "aria-invalid": true, "aria-describedby": field(`${name}-error`) }
      : {};

  const submit = () => {
    const move = {
      ...values,
      roomId: values.mode === "in_person" ? values.roomId : null,
    };
    const checked = centreMoveSchema.safeParse(move);
    if (!checked.success) {
      setErrors(
        Object.fromEntries(
          checked.error.issues.map((issue) => [
            String(issue.path[0]),
            issue.message,
          ]),
        ),
      );
      return;
    }
    setErrors({});
    startTransition(async () => {
      const result = await action(visit.id, move);
      if (!result.ok) {
        setErrors(result.fields ?? {});
        toast.error(result.message);
        return;
      }
      toast.success(
        `Wizyta ${visit.reference} przesunięta. Klient dostanie e-mail z nowym terminem.`,
      );
      await setParams({
        wizyta: visit.id,
        nowa: false,
        termin: null,
        kolumna: null,
        przesun: null,
      });
    });
  };

  return (
    <aside
      aria-labelledby={field("title")}
      className="fixed inset-y-0 right-0 z-40 flex w-full max-w-md flex-col overflow-hidden border-l border-[var(--border)] bg-[var(--surface)] shadow-xl xl:sticky xl:top-4 xl:z-auto xl:max-h-[calc(100dvh-7rem)] xl:w-[26rem] xl:shrink-0 xl:rounded-[var(--radius-surface)] xl:border xl:shadow-[var(--shadow-surface)]"
    >
      <ClosePanelOnEscape href={closeHref} />
      <header className="flex items-start justify-between gap-3 border-b border-[var(--border)] bg-[var(--primary-soft)] p-4">
        <div className="flex min-w-0 items-start gap-3">
          <span
            aria-hidden="true"
            className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-[var(--primary)] text-[var(--primary-foreground)] shadow-sm"
          >
            <CalendarClock className="size-4" />
          </span>
          <div className="min-w-0">
            <h2
              className="text-lg leading-tight font-semibold text-[var(--text)]"
              id={field("title")}
            >
              Przesuń wizytę
            </h2>
            <p className="mt-0.5 text-xs text-[var(--text-muted)]">
              {visit.reference} · {visit.clientName}
            </p>
          </div>
        </div>
        <Link
          aria-label="Zamknij przesuwanie wizyty"
          className="inline-flex size-8 shrink-0 items-center justify-center rounded-[var(--radius-control)] text-[var(--text-muted)] hover:bg-[var(--surface-muted)] hover:text-[var(--text)] focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:outline-none"
          href={closeHref}
          scroll={false}
        >
          <X aria-hidden="true" className="size-4" />
        </Link>
      </header>

      <form
        className="flex min-h-0 flex-1 flex-col"
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          submit();
        }}
      >
        <div className="grid flex-1 content-start gap-4 overflow-y-auto p-4">
          <dl className="grid grid-cols-[6.5rem_minmax(0,1fr)] gap-x-3 gap-y-1 rounded-[var(--radius-control)] bg-[var(--surface-muted)] p-3 text-xs">
            <dt className="text-[var(--text-muted)]">Teraz</dt>
            <dd className="text-[var(--text)]">{visit.current}</dd>
            <dt className="text-[var(--text-muted)]">Usługa</dt>
            <dd className="text-[var(--text)]">{visit.serviceName}</dd>
            <dt className="text-[var(--text-muted)]">Specjalista</dt>
            <dd className="text-[var(--text)]">{visit.specialistName}</dd>
          </dl>

          <fieldset className="grid gap-3">
            <legend className="mb-1 text-xs font-semibold tracking-[0.04em] text-[var(--text-muted)] uppercase">
              Nowy termin
            </legend>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label htmlFor={field("date")}>Dzień</Label>
                <Input
                  id={field("date")}
                  onChange={(event) => set({ date: event.target.value })}
                  type="date"
                  value={values.date}
                  {...invalid("date")}
                />
                <FieldError id={field("date-error")} message={errors.date} />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor={field("time")}>Godzina</Label>
                <Input
                  id={field("time")}
                  onChange={(event) => set({ time: event.target.value })}
                  step={300}
                  type="time"
                  value={values.time}
                  {...invalid("time")}
                />
                <FieldError id={field("time-error")} message={errors.time} />
              </div>
            </div>

            <fieldset className="grid gap-1.5">
              <legend className="mb-1.5 text-sm font-medium text-[var(--text)]">
                Forma
              </legend>
              <div className="flex gap-2">
                {(["in_person", "online"] as const).map((one) => (
                  <label
                    className={cn(
                      "flex flex-1 cursor-pointer items-center justify-center rounded-[var(--radius-control)] border px-3 py-2 text-sm font-medium transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-[var(--ring)]",
                      values.mode === one
                        ? "border-[var(--primary)] bg-[var(--primary-soft)] text-[var(--primary)]"
                        : "border-[var(--border)] text-[var(--text)] hover:bg-[var(--surface-muted)]",
                    )}
                    key={one}
                  >
                    <input
                      checked={values.mode === one}
                      className="sr-only"
                      name={field("mode")}
                      onChange={() => set({ mode: one })}
                      type="radio"
                      value={one}
                    />
                    {MODE_LABELS[one]}
                  </label>
                ))}
              </div>
            </fieldset>

            {values.mode === "in_person" ? (
              <div className="grid gap-1.5">
                <Label htmlFor={field("roomId")}>Gabinet</Label>
                <select
                  className={selectClass}
                  id={field("roomId")}
                  onChange={(event) =>
                    set({ roomId: event.target.value || null })
                  }
                  value={values.roomId ?? ""}
                  {...invalid("roomId")}
                >
                  <option value="">Wybierz gabinet</option>
                  {rooms.map((one) => (
                    <option key={one.id} value={one.id}>
                      {one.locationName
                        ? `${one.name} · ${one.locationName}`
                        : one.name}
                    </option>
                  ))}
                </select>
                <FieldError
                  id={field("roomId-error")}
                  message={errors.roomId}
                />
              </div>
            ) : null}

            <div className="grid gap-1.5">
              <Label htmlFor={field("reason")}>
                Powód (zobaczy go klient, opcjonalnie)
              </Label>
              <Textarea
                id={field("reason")}
                maxLength={500}
                onChange={(event) => set({ reason: event.target.value })}
                rows={2}
                value={values.reason ?? ""}
              />
            </div>
          </fieldset>
          <p className="rounded-[var(--radius-control)] bg-[var(--surface-muted)] p-3 text-xs leading-relaxed text-[var(--text)]">
            Bez ograniczeń dla klientów: wystarczy, że specjalista i gabinet są
            wtedy wolni. Klient dostanie e-mail z nowym terminem i linkiem do
            wizyty.
          </p>
        </div>
        <footer className="flex items-center justify-end gap-2 border-t border-[var(--border)] p-3">
          <Button asChild size="sm" variant="outline">
            <Link href={closeHref} scroll={false}>
              Anuluj
            </Link>
          </Button>
          <Button loading={pending} size="sm" type="submit">
            Przesuń wizytę
          </Button>
        </footer>
      </form>
    </aside>
  );
}
