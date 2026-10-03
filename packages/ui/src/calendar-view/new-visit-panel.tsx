"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  centreBookingSchema,
  type CentreBooking,
  type CentreBookingActionResult,
  type CentreBookingValues,
} from "@repo/contracts/booking";
import type { NewVisitDefaults } from "@repo/scheduling";
import { X } from "lucide-react";
import { useQueryStates } from "nuqs";
import { useId, useMemo, useState, useTransition } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { toast } from "../toast";
import { Button } from "../button";
import { Input } from "../input";
import { Label } from "../label";
import { cn } from "../lib/utils";
import { PageLink as Link } from "../public-site/page-link";
import { Textarea } from "../textarea";
import { ClosePanelOnEscape } from "../visit-table/visit-panel-escape";
import { calendarParsers } from "./params";

// "+ Nowa wizyta" (K5), after the reference's form: who (an admin chooses
// the specialist), which service, how and where, when (the time picked in
// the grid, or typed), and the client, with the e-mail the link to pay
// goes to. Nothing is paid on site (R11): the visit is reserved until the
// client pays online, by the time the centre's settings give (Ustawienia).
// The site's server books it (the portal's action) and the database checks
// everything again; then its details open.

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
  "h-8 w-full rounded-[5px] border border-[var(--border)] bg-[var(--surface)] px-2.5 text-[0.8125rem] text-[var(--text)] focus-visible:border-[var(--primary)] focus-visible:ring-2 focus-visible:ring-[color-mix(in_srgb,var(--primary)_18%,transparent)] focus-visible:outline-none aria-invalid:border-[var(--danger)]";

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
    },
  });
  const [offerId, mode] = useWatch({ control, name: ["offerId", "mode"] });
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
      const reserved = `Wizyta ${result.reference} zarezerwowana`;
      if (result.emailed === "failed") {
        toast.warning(
          `${reserved}, ale e-mail z linkiem do płatności się nie wysłał. Skontaktuj się z klientem.`,
        );
      } else {
        toast.success(
          result.emailed === "sent"
            ? `${reserved}. Klient dostał e-mail z linkiem do płatności.`
            : `${reserved}.`,
        );
      }
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
      className="fixed inset-y-0 right-0 z-40 flex w-full max-w-sm flex-col overflow-hidden border-l border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-overlay)] xl:static xl:z-auto xl:w-96 xl:max-w-none xl:shrink-0 xl:shadow-none"
    >
      <ClosePanelOnEscape href={closeHref} />
      <header className="flex shrink-0 items-start justify-between gap-2 border-b border-[var(--border)] px-3.5 pt-2.5 pb-2">
        <div className="flex min-w-0 items-start gap-3">
          <div className="min-w-0">
            <h2
              className="text-[0.9375rem] leading-tight font-semibold text-[var(--text)]"
              id={field("title")}
            >
              Nowa wizyta
            </h2>
            <p className="mt-0.5 text-[0.75rem] text-[var(--text-muted)]">
              Rezerwacja opłacana online z linku w e-mailu.
            </p>
          </div>
        </div>
        <Link
          aria-label="Zamknij formularz nowej wizyty"
          className="-mr-1.5 inline-flex size-7 shrink-0 items-center justify-center rounded-[5px] text-[var(--text-muted)] hover:bg-[var(--surface-muted)] hover:text-[var(--text)] focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:outline-none"
          href={closeHref}
          scroll={false}
        >
          <X aria-hidden="true" className="size-4" />
        </Link>
      </header>

      <form
        className="flex min-h-0 flex-1 flex-col [&_input]:rounded-[5px] [&_input]:text-[0.8125rem] [&_input:not([type=radio])]:h-8 [&_label]:text-[0.75rem] [&_label]:font-medium [&_label]:text-[var(--text-muted)] [&_textarea]:rounded-[5px] [&_textarea]:text-[0.8125rem]"
        noValidate
        onSubmit={(event) => void submit(event)}
      >
        <div className="grid flex-1 content-start gap-3.5 overflow-y-auto px-3.5 py-3">
          <fieldset className="grid gap-3">
            <legend className="mb-1 text-[0.6875rem] font-semibold tracking-[0.03em] text-[var(--text-muted)]">
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
                  {money(offer.priceMinor, offer.currencyCode)}
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
            <legend className="mb-1 text-[0.6875rem] font-semibold tracking-[0.03em] text-[var(--text-muted)]">
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
          </fieldset>
          <p className="rounded-[var(--radius-control)] bg-[var(--surface-muted)] p-3 text-xs leading-relaxed text-[var(--text)]">
            Klient dostanie e-mail z linkiem do płatności online. Termin
            płatności wynika z ustawień centrum; nieopłacona w terminie
            rezerwacja zostanie anulowana.
          </p>
        </div>
        <footer className="flex h-11 shrink-0 items-center justify-end gap-1.5 border-t border-[var(--border)] px-2">
          <Button asChild size="sm" variant="outline">
            <Link href={closeHref} scroll={false}>
              Anuluj
            </Link>
          </Button>
          <Button loading={pending} size="sm" type="submit">
            Zarezerwuj wizytę
          </Button>
        </footer>
      </form>
    </aside>
  );
}
