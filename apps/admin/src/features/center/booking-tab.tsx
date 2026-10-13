"use client";

import { numberRange } from "@/lib/number-range";
import { useSave } from "@/lib/use-save";
import { zodResolver } from "@hookform/resolvers/zod";
import type { CenterSettings } from "@repo/contracts";
import { DetailSection } from "@repo/ui/detail-page";
import { Label } from "@repo/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/ui/select";
import { Controller, useForm } from "react-hook-form";
import { updateBookingSettingsAction } from "./actions";
import { Field, SaveRow, SwitchRow } from "./fields";
import {
  bookingSettingsFormSchema,
  SLOT_STEPS,
  toBookingSettingsFormValues,
  PAYMENT_REMINDERS,
  VISIT_REMINDERS,
  type BookingSettingsFormValues,
} from "./forms";

// Ustawienia → Rezerwacje online: how clients book on the site and what
// they may change themselves, in one form (its sections side by side on
// a wide screen, the save at the bottom). A change applies at once to new
// bookings; booked visits keep theirs.

export function BookingTab({ settings }: { settings: CenterSettings }) {
  const { isPending, run } = useSave();
  const defaults = toBookingSettingsFormValues(settings);
  const {
    control,
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<BookingSettingsFormValues>({
    resolver: zodResolver(bookingSettingsFormSchema),
    defaultValues: defaults,
  });
  // Its saved value in the server's HTML too (`withValue`).
  const number = (name: keyof BookingSettingsFormValues) => ({
    ...register(name, { valueAsNumber: true }),
    defaultValue: defaults[name] as number,
  });
  const field = (
    name: keyof BookingSettingsFormValues,
    label: string,
    hint: string,
  ) => (
    <Field
      error={errors[name]?.message}
      hint={hint}
      id={`booking-${name}`}
      inputMode="numeric"
      label={label}
      registration={number(name)}
      type="number"
      {...numberRange(bookingSettingsFormSchema.shape[name])}
    />
  );

  // A reminder's choice: so many hours before, or not at all.
  const reminder = (
    name: "visitReminder" | "paymentReminder",
    label: string,
    choices: readonly string[],
    before: (hours: string) => string,
    note: string,
  ) => {
    const id = `booking-${name}`;
    const words = (one: string) =>
      one === "off" ? "Nie wysyłaj" : before(one);
    return (
      <div className="grid content-start gap-1.5">
        <Label htmlFor={id}>{label}</Label>
        <Controller
          control={control}
          name={name}
          render={({ field: choice }) => (
            <Select onValueChange={choice.onChange} value={choice.value}>
              <SelectTrigger aria-describedby={`${id}-note`} id={id}>
                {/* Its words in the server's HTML too. */}
                <SelectValue>{words(choice.value)}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {choices.map((one) => (
                  <SelectItem key={one} value={one}>
                    {words(one)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
        <p
          className="text-[0.75rem] text-[var(--text-muted)]"
          id={`${id}-note`}
        >
          {note}
        </p>
      </div>
    );
  };

  return (
    <form
      className="flex min-h-0 flex-1 flex-col bg-[var(--surface)]"
      noValidate
      onSubmit={handleSubmit((values) =>
        run(
          () => updateBookingSettingsAction(values),
          "Zapisano ustawienia rezerwacji",
          () => reset(values),
        ),
      )}
    >
      <div className="min-h-0 flex-1 overflow-y-auto lg:grid lg:grid-cols-2 lg:overflow-hidden">
        <div className="min-w-0 border-[var(--border)] lg:overflow-y-auto lg:border-r">
          <DetailSection title="Rezerwacje online">
            <Controller
              control={control}
              name="bookingEnabled"
              render={({ field: toggle }) => (
                <SwitchRow
                  checked={toggle.value}
                  description="Wyłączone: strona nie przyjmuje nowych rezerwacji. Umówione wizyty zostają."
                  label="Klienci rezerwują na stronie"
                  onCheckedChange={toggle.onChange}
                />
              )}
            />
          </DetailSection>
          <DetailSection title="Terminy">
            <div className="grid gap-3.5 px-3.5 py-3 sm:grid-cols-2">
              <div className="grid content-start gap-1.5">
                <Label htmlFor="booking-step">Siatka grafiku</Label>
                <Controller
                  control={control}
                  name="slotStepMinutes"
                  render={({ field: step }) => (
                    <Select onValueChange={step.onChange} value={step.value}>
                      <SelectTrigger
                        aria-describedby="booking-step-note"
                        id="booking-step"
                      >
                        {/* Its words in the server's HTML too. */}
                        <SelectValue>co {step.value} min</SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {SLOT_STEPS.map((one) => (
                          <SelectItem key={one} value={one}>
                            co {one} min
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                <p
                  className="text-[0.75rem] text-[var(--text-muted)]"
                  id="booking-step-note"
                >
                  Na niej zaczynają się wizyty i godziny dostępności (60: o
                  pełnych godzinach).
                </p>
              </div>
              {field(
                "defaultVisitBufferMinutes",
                "Czas po wizycie dla nowych usług (min)",
                "Każda usługa ma własny (Oferta → usługa); ten jest na start.",
              )}
              {field(
                "minBookingLeadHours",
                "Minimalne wyprzedzenie (godz.)",
                "Najkrótszy czas od rezerwacji do wizyty.",
              )}
              {field(
                "maxBookingHorizonDays",
                "Rezerwacje na (dni do przodu)",
                "Jak daleko w przód klienci widzą wolne terminy.",
              )}
              {field(
                "holdMinutes",
                "Blokada wybranego terminu (min)",
                "Tyle klient ma na podanie danych; płatność przedłuża ją do 30 min.",
              )}
            </div>
          </DetailSection>
        </div>
        <div className="min-w-0 lg:overflow-y-auto">
          <DetailSection title="Zmiany i odwołania przez klienta">
            <div className="grid gap-3.5 px-3.5 py-3 sm:grid-cols-2">
              {field(
                "cancellationWindowHours",
                "Odwołanie ze zwrotem do (godz. przed)",
                "Wcześniej: pełny zwrot. Później: bez zwrotu.",
              )}
              {field(
                "rescheduleWindowHours",
                "Samodzielne przełożenie do (godz. przed)",
                "Później tylko przez kontakt z centrum.",
              )}
              {field(
                "maxSelfReschedules",
                "Ile razy klient sam przełoży wizytę",
                "0 wyłącza samodzielne przełożenie.",
              )}
            </div>
          </DetailSection>
          <DetailSection note="tylko online" title="Płatność">
            <div className="grid gap-3.5 px-3.5 py-3 sm:grid-cols-2">
              {field(
                "paymentDueHours",
                "Zapłata najpóźniej (godz. przed)",
                "Nieopłacona rezerwacja jest anulowana. Bliżej wizyty klient płaci od razu.",
              )}
              {field(
                "centrePaymentLinkHours",
                "Ważność linku do płatności (godz.)",
                "Dla wizyt zapisanych przez centrum bliżej niż powyżej.",
              )}
            </div>
          </DetailSection>
          <DetailSection title="Przypomnienia e-mail">
            <div className="grid gap-3.5 px-3.5 py-3 sm:grid-cols-2">
              {reminder(
                "paymentReminder",
                "O zapłacie",
                PAYMENT_REMINDERS,
                (one) => `${one} godz. przed terminem zapłaty`,
                "Do rezerwacji nieopłaconych. Ostatnie wezwanie idzie zawsze 6 godz. przed terminem, potem rezerwacja jest anulowana.",
              )}
              {reminder(
                "visitReminder",
                "O wizycie",
                VISIT_REMINDERS,
                (one) => `${one} godz. przed wizytą`,
                "Do opłaconych wizyt zarezerwowanych wcześniej niż ten czas.",
              )}
            </div>
          </DetailSection>
        </div>
      </div>
      <div className="shrink-0 border-t border-[var(--border)] px-3.5 py-2">
        <SaveRow dirty={isDirty} pending={isPending}>
          Zapisz ustawienia
        </SaveRow>
      </div>
    </form>
  );
}
