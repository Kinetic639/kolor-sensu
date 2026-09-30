"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  centreBookingSchema,
  type CentreBooking,
  type CentreBookingActionResult,
  type CentreBookingValues,
} from "@repo/contracts/booking";
import type { NewVisitDefaults } from "@repo/scheduling";
import { CalendarPlus, X } from "lucide-react";
import { useQueryStates } from "nuqs";
import { useId, useMemo, useState, useTransition } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "../button";
import { Checkbox } from "../checkbox";
import { Input } from "../input";
import { Label } from "../label";
import { cn } from "../lib/utils";
import { PageLink as Link } from "../public-site/page-link";
import { Textarea } from "../textarea";
import { ClosePanelOnEscape } from "../visit-table/visit-panel-escape";
import { calendarParsers } from "./params";

// "+ Nowa wizyta" (K5), after the reference's form: who (an admin chooses
// the specialist), which service, how and where, when (the time picked in
// the grid, or typed), and the client, reachable by e-mail or phone. The
// visit is confirmed at once and paid on site; the confirmation goes by
// e-mail when asked. The site's server books it (the portal's action) and
// the database checks everything again; then its details open.

export interface NewVisitOffer {
  id: string;
  specialistId: string;
  serviceName: string;
  priceMinor: number;
  currencyCode: string;
  durationMinutes: number;
  modes: ("in_person" | "online")[];
}

export interface NewVisitPanelProps {
  /** One: a specialist booking for themselves. */
  specialists: { id: string; name: string }[];
  offers: NewVisitOffer[];
  rooms: { id: string; name: string; locationName?: string | null }[];
  defaults: NewVisitDefaults;
  action: (values: CentreBookingValues) => Promise<CentreBookingActionResult>;
  closeHref: string;
}

const MODE_LABELS = { in_person: "Stacjonarnie", online: "Online" } as const;

const selectClass =
  "h-10 w-full rounded-[var(--radius-control)] border border-[var(--border)] bg-[var(--surface)] px-3 text-sm text-[var(--text)] focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:outline-none aria-invalid:border-[var(--danger)]";

function money(minor: number, currencyCode: string) {
  return new Intl.NumberFormat("pl-PL", {
    style: "currency",
    currency: currencyCode,
    maximumFractionDigits: minor % 100 === 0 ? 0 : 2,
  }).format(minor / 100);
}

function FieldError({ id, message }: { id: string; message?: string }) {
  return message ? (
    <p className="text-xs text-[var(--danger)]" id={id} role="alert">
      {message}
    </p>
  ) : null;
}

export function NewVisitPanel({
  specialists,
  offers,
  rooms,
  defaults,
  action,
  closeHref,
}: NewVisitPanelProps) {
  const id = useId();
  const field = (name: string) => `${id}-${name}`;
  const [pending, startTransition] = useTransition();
  const [, setParams] = useQueryStates(
    {
      wizyta: calendarParsers.wizyta,
      nowa: calendarParsers.nowa,
      termin: calendarParsers.termin,
      kolumna: calendarParsers.kolumna,
    },
    { shallow: false, clearOnDefault: true },
  );

  const [specialistId, setSpecialistId] = useState(
    defaults.specialistId &&
      specialists.some((one) => one.id === defaults.specialistId)
      ? defaults.specialistId
      : specialists.length === 1
        ? specialists[0]!.id
        : "",
  );
  const theirs = useMemo(
    () => offers.filter((offer) => offer.specialistId === specialistId),
    [offers, specialistId],
  );
  const firstOffer = (mode: NewVisitDefaults["mode"]) =>
    theirs.find((offer) => !mode || offer.modes.includes(mode)) ?? theirs[0];

  const initialOffer = firstOffer(defaults.mode);
  const {
    control,
    register,
    handleSubmit,
    getValues,
    setValue,
    setError,
    formState: { errors },
  } = useForm<CentreBookingValues, unknown, CentreBooking>({
    resolver: zodResolver(centreBookingSchema),
    defaultValues: {
      offerId: initialOffer?.id ?? "",
      mode:
        defaults.mode && initialOffer?.modes.includes(defaults.mode)
          ? defaults.mode
          : (initialOffer?.modes[0] ?? "in_person"),
      date: defaults.date,
      time: defaults.time,
      roomId: defaults.roomId ?? (rooms.length === 1 ? rooms[0]!.id : null),
      name: "",
      email: "",
      phone: "",
      notes: "",
      sendEmail: true,
    },
  });
  const [offerId, mode, email] = useWatch({
    control,
    name: ["offerId", "mode", "email"],
  });
  const offer = offers.find((one) => one.id === offerId);

  const chooseSpecialist = (next: string) => {
    setSpecialistId(next);
    const nextOffer = offers.find((one) => one.specialistId === next);
    setValue("offerId", nextOffer?.id ?? "");
    if (nextOffer && !nextOffer.modes.includes(mode)) {
      setValue("mode", nextOffer.modes[0]!);
    }
  };
  const chooseOffer = (next: string) => {
    setValue("offerId", next, { shouldValidate: true });
    const nextOffer = offers.find((one) => one.id === next);
    if (nextOffer && !nextOffer.modes.includes(mode)) {
      setValue("mode", nextOffer.modes[0]!);
    }
  };

  // The form's own values go to the server: it checks them again.
  const submit = handleSubmit(() =>
    startTransition(async () => {
      const result = await action(getValues());
      if (!result.ok) {
        for (const [name, message] of Object.entries(result.fields ?? {})) {
          setError(name as keyof CentreBookingValues, { message });
        }
        toast.error(result.message);
        return;
      }
      toast.success(
        result.emailed === "sent"
          ? `Wizyta ${result.reference} zapisana. Klient dostał potwierdzenie e-mailem.`
          : result.emailed === "failed"
            ? `Wizyta ${result.reference} zapisana, ale e-mail się nie wysłał.`
            : `Wizyta ${result.reference} zapisana.`,
      );
      await setParams({
        wizyta: result.id,
        nowa: false,
        termin: null,
        kolumna: null,
      });
    }),
  );

  const invalid = (name: keyof CentreBookingValues) =>
    errors[name]
      ? { "aria-invalid": true, "aria-describedby": field(`${name}-error`) }
      : {};

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
            <CalendarPlus className="size-4" />
          </span>
          <div className="min-w-0">
            <h2
              className="text-lg leading-tight font-semibold text-[var(--text)]"
              id={field("title")}
            >
              Nowa wizyta
            </h2>
            <p className="mt-0.5 text-xs text-[var(--text-muted)]">
              Potwierdzona od razu, płatność na miejscu.
            </p>
          </div>
        </div>
        <Link
          aria-label="Zamknij formularz nowej wizyty"
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
          // No e-mail, no confirmation to send.
          if (!getValues("email")) setValue("sendEmail", false);
          void submit(event);
        }}
      >
        <div className="grid flex-1 content-start gap-4 overflow-y-auto p-4">
          <fieldset className="grid gap-3">
            <legend className="mb-1 text-xs font-semibold tracking-[0.04em] text-[var(--text-muted)] uppercase">
              Wizyta
            </legend>
            {specialists.length > 1 ? (
              <div className="grid gap-1.5">
                <Label htmlFor={field("specialist")}>Specjalista</Label>
                <select
                  className={selectClass}
                  id={field("specialist")}
                  onChange={(event) => chooseSpecialist(event.target.value)}
                  value={specialistId}
                >
                  <option disabled value="">
                    Wybierz specjalistę
                  </option>
                  {specialists.map((one) => (
                    <option key={one.id} value={one.id}>
                      {one.name}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}

            <div className="grid gap-1.5">
              <Label htmlFor={field("offerId")}>Usługa</Label>
              <select
                className={selectClass}
                disabled={!theirs.length}
                id={field("offerId")}
                onChange={(event) => chooseOffer(event.target.value)}
                value={offerId}
                {...invalid("offerId")}
              >
                <option disabled value="">
                  {specialistId
                    ? theirs.length
                      ? "Wybierz usługę"
                      : "Ten specjalista nie ma aktywnych usług"
                    : "Najpierw wybierz specjalistę"}
                </option>
                {theirs.map((one) => (
                  <option key={one.id} value={one.id}>
                    {one.serviceName}
                  </option>
                ))}
              </select>
              {offer ? (
                <p className="text-xs text-[var(--text-muted)] tabular-nums">
                  {offer.durationMinutes} min ·{" "}
                  {money(offer.priceMinor, offer.currencyCode)} · płatność na
                  miejscu
                </p>
              ) : null}
              <FieldError
                id={field("offerId-error")}
                message={errors.offerId?.message}
              />
            </div>

            {offer ? (
              <fieldset className="grid gap-1.5">
                <legend className="mb-1.5 text-sm font-medium text-[var(--text)]">
                  Forma
                </legend>
                <div className="flex gap-2">
                  {offer.modes.map((one) => (
                    <label
                      className={cn(
                        "flex flex-1 cursor-pointer items-center justify-center rounded-[var(--radius-control)] border px-3 py-2 text-sm font-medium transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-[var(--ring)]",
                        mode === one
                          ? "border-[var(--primary)] bg-[var(--primary-soft)] text-[var(--primary)]"
                          : "border-[var(--border)] text-[var(--text)] hover:bg-[var(--surface-muted)]",
                      )}
                      key={one}
                    >
                      <input
                        className="sr-only"
                        type="radio"
                        value={one}
                        {...register("mode")}
                      />
                      {MODE_LABELS[one]}
                    </label>
                  ))}
                </div>
              </fieldset>
            ) : null}

            {mode === "in_person" ? (
              <div className="grid gap-1.5">
                <Label htmlFor={field("roomId")}>Gabinet</Label>
                <Controller
                  control={control}
                  name="roomId"
                  render={({ field: room }) => (
                    <select
                      className={selectClass}
                      id={field("roomId")}
                      onBlur={room.onBlur}
                      onChange={(event) =>
                        room.onChange(event.target.value || null)
                      }
                      value={room.value ?? ""}
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
                  )}
                />
                <FieldError
                  id={field("roomId-error")}
                  message={errors.roomId?.message}
                />
              </div>
            ) : null}

            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label htmlFor={field("date")}>Dzień</Label>
                <Input
                  id={field("date")}
                  type="date"
                  {...register("date")}
                  {...invalid("date")}
                />
                <FieldError
                  id={field("date-error")}
                  message={errors.date?.message}
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor={field("time")}>Godzina</Label>
                <Input
                  id={field("time")}
                  step={300}
                  type="time"
                  {...register("time")}
                  {...invalid("time")}
                />
                <FieldError
                  id={field("time-error")}
                  message={errors.time?.message}
                />
              </div>
            </div>
          </fieldset>

          <fieldset className="grid gap-3 border-t border-[var(--border)] pt-4">
            <legend className="mb-1 text-xs font-semibold tracking-[0.04em] text-[var(--text-muted)] uppercase">
              Klient
            </legend>
            <div className="grid gap-1.5">
              <Label htmlFor={field("name")}>Imię i nazwisko</Label>
              <Input
                autoComplete="off"
                id={field("name")}
                {...register("name")}
                {...invalid("name")}
              />
              <FieldError
                id={field("name-error")}
                message={errors.name?.message}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor={field("email")}>E-mail</Label>
              <Input
                autoComplete="off"
                id={field("email")}
                inputMode="email"
                type="email"
                {...register("email")}
                {...invalid("email")}
              />
              <FieldError
                id={field("email-error")}
                message={errors.email?.message}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor={field("phone")}>Telefon</Label>
              <Input
                autoComplete="off"
                id={field("phone")}
                inputMode="tel"
                type="tel"
                {...register("phone")}
                {...invalid("phone")}
              />
              <FieldError
                id={field("phone-error")}
                message={errors.phone?.message}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor={field("notes")}>Uwagi (opcjonalnie)</Label>
              <Textarea
                id={field("notes")}
                rows={2}
                {...register("notes")}
                {...invalid("notes")}
              />
              <FieldError
                id={field("notes-error")}
                message={errors.notes?.message}
              />
            </div>
            <div className="grid gap-1">
              <div className="flex items-center gap-2">
                <Controller
                  control={control}
                  name="sendEmail"
                  render={({ field: send }) => (
                    <Checkbox
                      aria-describedby={
                        errors.sendEmail ? field("sendEmail-error") : undefined
                      }
                      checked={send.value && Boolean(email)}
                      disabled={!email}
                      id={field("sendEmail")}
                      onBlur={send.onBlur}
                      onCheckedChange={(checked) =>
                        send.onChange(checked === true)
                      }
                    />
                  )}
                />
                <Label className="font-normal" htmlFor={field("sendEmail")}>
                  Wyślij klientowi potwierdzenie e-mailem
                </Label>
              </div>
              <FieldError
                id={field("sendEmail-error")}
                message={errors.sendEmail?.message}
              />
            </div>
          </fieldset>
        </div>
        <footer className="flex items-center justify-end gap-2 border-t border-[var(--border)] p-3">
          <Button asChild size="sm" variant="outline">
            <Link href={closeHref} scroll={false}>
              Anuluj
            </Link>
          </Button>
          <Button loading={pending} size="sm" type="submit">
            Zapisz wizytę
          </Button>
        </footer>
      </form>
    </aside>
  );
}
