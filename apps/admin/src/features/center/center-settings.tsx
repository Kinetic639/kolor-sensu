"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import type {
  CenterPublicProfile,
  CenterSettings as CenterSettingsData,
  Location,
} from "@repo/contracts";
import { Badge } from "@repo/ui/badge";
import { Button } from "@repo/ui/button";
import { Card } from "@repo/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@repo/ui/dialog";
import { Input } from "@repo/ui/input";
import { Label } from "@repo/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/ui/select";
import { EmptyState, PageTitle, SectionHeader } from "@repo/ui/portal-content";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@repo/ui/tabs";
import { TagListField } from "@repo/ui/specialist-profile";
import { Switch } from "@repo/ui/switch";
import { Textarea } from "@repo/ui/textarea";
import { MapPin, Pencil, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition, type ReactNode } from "react";
import {
  Controller,
  useForm,
  type UseFormRegisterReturn,
} from "react-hook-form";
import { toast } from "@repo/ui/toast";
import {
  saveLocationAction,
  updateBookingSettingsAction,
  updateCenterProfileAction,
} from "./actions";
import {
  bookingSettingsFormSchema,
  centerProfileFormSchema,
  SLOT_STEPS,
  toBookingSettingsFormValues,
  locationFormSchema,
  toCenterProfileFormValues,
  toLocationFormValues,
  type BookingSettingsFormValues,
  type CenterProfileFormValues,
  type LocationFormValues,
} from "./forms";
import { slugify } from "@/lib/slugify";

function TextField({
  id,
  label,
  error,
  hint,
  registration,
  multiline = false,
  ...inputProps
}: {
  id: string;
  label: ReactNode;
  error?: string;
  hint?: string;
  registration: UseFormRegisterReturn;
  multiline?: boolean;
  type?: string;
  inputMode?: "email" | "tel" | "url" | "numeric";
  placeholder?: string;
}) {
  const describedBy =
    [hint ? `${id}-hint` : null, error ? `${id}-error` : null]
      .filter(Boolean)
      .join(" ") || undefined;
  const shared = {
    "aria-describedby": describedBy,
    "aria-invalid": error ? true : undefined,
    id,
    ...registration,
  };
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      {multiline ? (
        <Textarea rows={3} {...shared} />
      ) : (
        <Input {...inputProps} {...shared} />
      )}
      {hint ? (
        <p className="text-xs text-[var(--text-muted)]" id={`${id}-hint`}>
          {hint}
        </p>
      ) : null}
      {error ? (
        <p
          className="text-sm text-[var(--danger)]"
          id={`${id}-error`}
          role="alert"
        >
          {error}
        </p>
      ) : null}
    </div>
  );
}

function SwitchField({
  label,
  checked,
  onCheckedChange,
}: {
  label: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex min-h-11 items-center justify-between gap-3 rounded-[var(--radius-control)] border border-[var(--border)] px-3 text-sm">
      <span>{label}</span>
      <Switch
        aria-label={label}
        checked={checked}
        onCheckedChange={onCheckedChange}
      />
    </label>
  );
}

function useSaving() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  function run(
    action: () => Promise<{ ok: true } | { ok: false; message: string }>,
    success: string,
    after?: () => void,
  ) {
    startTransition(async () => {
      const result = await action();
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      toast.success(success);
      after?.();
      router.refresh();
    });
  }
  return { isPending, run };
}

function CenterProfileCard({
  profile,
}: {
  profile: CenterPublicProfile | null;
}) {
  const { isPending, run } = useSaving();
  const {
    control,
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<CenterProfileFormValues>({
    resolver: zodResolver(centerProfileFormSchema),
    defaultValues: toCenterProfileFormValues(profile),
  });

  return (
    <Card>
      <SectionHeader
        title="Profil publiczny centrum"
        description="Nazwa, opis i dane kontaktowe widoczne w nagłówku, stopce i na stronie Kontakt."
      />
      <form
        className="mt-5 space-y-4"
        noValidate
        onSubmit={handleSubmit((values) =>
          run(
            () => updateCenterProfileAction(values),
            "Zapisano profil centrum",
            () => reset(values),
          ),
        )}
      >
        <TextField
          error={errors.displayName?.message}
          id="center-name"
          label="Nazwa centrum"
          registration={register("displayName")}
        />
        <TextField
          error={errors.shortDescription?.message}
          id="center-description"
          label="Krótki opis"
          multiline
          registration={register("shortDescription")}
        />
        <div className="grid gap-4 md:grid-cols-2">
          <TextField
            error={errors.publicPhone?.message}
            id="center-phone"
            inputMode="tel"
            label="Telefon"
            placeholder="+48 600 700 800"
            registration={register("publicPhone")}
            type="tel"
          />
          <TextField
            error={errors.publicEmail?.message}
            id="center-email"
            inputMode="email"
            label="E-mail"
            placeholder="kontakt@kolorsensu.pl"
            registration={register("publicEmail")}
            type="email"
          />
          <TextField
            error={errors.websiteUrl?.message}
            id="center-website"
            inputMode="url"
            label="Strona www"
            placeholder="https://"
            registration={register("websiteUrl")}
            type="url"
          />
          <TextField
            error={errors.instagramUrl?.message}
            id="center-instagram"
            inputMode="url"
            label="Instagram"
            placeholder="https://instagram.com/…"
            registration={register("instagramUrl")}
            type="url"
          />
          <TextField
            error={errors.facebookUrl?.message}
            id="center-facebook"
            inputMode="url"
            label="Facebook"
            placeholder="https://facebook.com/…"
            registration={register("facebookUrl")}
            type="url"
          />
        </div>
        <Controller
          control={control}
          name="published"
          render={({ field }) => (
            <SwitchField
              checked={field.value}
              label="Profil opublikowany na stronie"
              onCheckedChange={field.onChange}
            />
          )}
        />
        <div className="flex justify-end">
          <Button disabled={!isDirty} loading={isPending} type="submit">
            Zapisz profil
          </Button>
        </div>
      </form>
    </Card>
  );
}

function LocationForm({
  location,
  pending,
  onCancel,
  onSubmit,
}: {
  location: Location | null;
  pending: boolean;
  onCancel: () => void;
  onSubmit: (values: LocationFormValues) => void;
}) {
  const {
    control,
    register,
    handleSubmit,
    setValue,
    getFieldState,
    formState: { errors },
  } = useForm<LocationFormValues>({
    resolver: zodResolver(locationFormSchema),
    defaultValues: toLocationFormValues(location),
  });
  const nameField = register("name");

  return (
    <form className="space-y-4" noValidate onSubmit={handleSubmit(onSubmit)}>
      <TextField
        error={errors.name?.message}
        id="location-name"
        label="Nazwa"
        registration={{
          ...nameField,
          onChange: async (event) => {
            await nameField.onChange(event);
            // A new location's slug follows its name until edited by hand.
            if (!location && !getFieldState("slug").isDirty) {
              setValue("slug", slugify(event.target.value));
            }
          },
        }}
      />
      <TextField
        error={errors.slug?.message}
        hint="Część adresu strony, np. gabinet-mokotow."
        id="location-slug"
        label="Adres (slug)"
        registration={register("slug")}
      />
      <TextField
        error={errors.addressLine1?.message}
        id="location-address-1"
        label="Ulica i numer"
        registration={register("addressLine1")}
      />
      <TextField
        error={errors.addressLine2?.message}
        id="location-address-2"
        label="Dodatkowa linia adresu"
        registration={register("addressLine2")}
      />
      <div className="grid gap-4 sm:grid-cols-[10rem_1fr]">
        <TextField
          error={errors.postalCode?.message}
          id="location-postal-code"
          label="Kod pocztowy"
          registration={register("postalCode")}
        />
        <TextField
          error={errors.city?.message}
          id="location-city"
          label="Miasto"
          registration={register("city")}
        />
      </div>
      <TextField
        error={errors.publicDescription?.message}
        hint="Widoczny na stronie Gabinety nad listą gabinetów w tej lokalizacji."
        id="location-description"
        label="Opis lokalizacji"
        multiline
        registration={register("publicDescription")}
      />
      <Controller
        control={control}
        name="amenities"
        render={({ field }) => (
          <TagListField
            description="Np. winda, parking, wejście od strony placu, poczekalnia."
            id="location-amenities"
            label="Udogodnienia"
            maxItems={30}
            maxLength={100}
            onChange={field.onChange}
            values={field.value}
          />
        )}
      />
      <TextField
        error={errors.accessibilityNotes?.message}
        hint="Np. próg przy wejściu, szerokość drzwi, toaleta dostosowana do potrzeb osób z niepełnosprawnościami."
        id="location-accessibility"
        label="Dostępność"
        multiline
        registration={register("accessibilityNotes")}
      />
      <div className="grid gap-3 sm:grid-cols-2">
        {(
          [
            ["publiclyVisible", "Widoczna na stronie"],
            ["active", "Aktywna"],
          ] as const
        ).map(([name, label]) => (
          <Controller
            control={control}
            key={name}
            name={name}
            render={({ field }) => (
              <SwitchField
                checked={field.value}
                label={label}
                onCheckedChange={field.onChange}
              />
            )}
          />
        ))}
      </div>
      <DialogFooter>
        <Button onClick={onCancel} variant="secondary">
          Anuluj
        </Button>
        <Button loading={pending} type="submit">
          {location ? "Zapisz zmiany" : "Dodaj lokalizację"}
        </Button>
      </DialogFooter>
    </form>
  );
}

function formatAddress(location: Location) {
  return [
    location.addressLine1,
    location.addressLine2,
    [location.postalCode, location.city].filter(Boolean).join(" "),
  ]
    .filter(Boolean)
    .join(", ");
}

function LocationsCard({ locations }: { locations: Location[] }) {
  const { isPending, run } = useSaving();
  const [editing, setEditing] = useState<Location | "new" | null>(null);
  const current = editing === "new" ? null : editing;

  const addButton = (
    <Button onClick={() => setEditing("new")} variant="secondary">
      <Plus className="size-4" aria-hidden="true" />
      Dodaj lokalizację
    </Button>
  );

  return (
    <Card>
      <SectionHeader
        action={locations.length ? addButton : undefined}
        description="Adresy centrum. Widoczne lokalizacje pojawiają się na stronie Kontakt i Gabinety."
        title="Lokalizacje"
      />
      {locations.length ? (
        <ul className="mt-3 divide-y divide-[var(--border)]">
          {locations.map((location) => (
            <li
              className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between"
              key={location.id}
            >
              <div className="flex min-w-0 gap-3">
                <MapPin
                  className="mt-0.5 size-5 shrink-0 text-[var(--primary)]"
                  aria-hidden="true"
                />
                <div className="min-w-0">
                  <p className="font-semibold text-[var(--text)]">
                    {location.name}
                  </p>
                  <p className="text-sm text-[var(--text-muted)]">
                    {formatAddress(location) || "Brak adresu"}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <Badge variant={location.active ? "success" : "neutral"}>
                      {location.active ? "Aktywna" : "Nieaktywna"}
                    </Badge>
                    <Badge
                      variant={location.publiclyVisible ? "info" : "neutral"}
                    >
                      {location.publiclyVisible
                        ? "Widoczna na stronie"
                        : "Ukryta na stronie"}
                    </Badge>
                  </div>
                </div>
              </div>
              <Button
                aria-label={`Edytuj: ${location.name}`}
                onClick={() => setEditing(location)}
                size="sm"
                variant="secondary"
              >
                <Pencil className="size-4" aria-hidden="true" />
                Edytuj
              </Button>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState
          action={addButton}
          className="mt-4"
          description="Dodaj adres centrum, aby pokazać go na stronie."
          title="Brak lokalizacji"
        />
      )}

      <Dialog
        onOpenChange={(open) => {
          if (!open) setEditing(null);
        }}
        open={editing !== null}
      >
        <DialogContent className="max-h-[90dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {current ? `Edytuj: ${current.name}` : "Dodaj lokalizację"}
            </DialogTitle>
            <DialogDescription>
              Adres i widoczność lokalizacji na stronie.
            </DialogDescription>
          </DialogHeader>
          {editing === null ? null : (
            <LocationForm
              key={current?.id ?? "new"}
              location={current}
              onCancel={() => setEditing(null)}
              onSubmit={(values) =>
                run(
                  () => saveLocationAction(current?.id ?? null, values),
                  current ? "Zapisano lokalizację" : "Dodano lokalizację",
                  () => setEditing(null),
                )
              }
              pending={isPending}
            />
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}

function BookingSettingsCard({ settings }: { settings: CenterSettingsData }) {
  const { isPending, run } = useSaving();
  const {
    control,
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<BookingSettingsFormValues>({
    resolver: zodResolver(bookingSettingsFormSchema),
    defaultValues: toBookingSettingsFormValues(settings),
  });
  const number = (name: keyof BookingSettingsFormValues) =>
    register(name, { valueAsNumber: true });

  return (
    <Card>
      <SectionHeader
        title="Rezerwacje online"
        description="Jak klienci umawiają wizyty na stronie i co mogą w nich sami zmienić. Zmiany obowiązują od razu dla nowych rezerwacji; umówione wizyty zostają bez zmian."
      />
      <form
        className="mt-5 space-y-6"
        noValidate
        onSubmit={handleSubmit((values) =>
          run(
            () => updateBookingSettingsAction(values),
            "Zapisano ustawienia rezerwacji",
            () => reset(values),
          ),
        )}
      >
        <Controller
          control={control}
          name="bookingEnabled"
          render={({ field }) => (
            <SwitchField
              checked={field.value}
              label="Rezerwacje online włączone"
              onCheckedChange={field.onChange}
            />
          )}
        />

        <fieldset className="space-y-4">
          <legend className="text-sm font-semibold text-[var(--text)]">
            Terminy
          </legend>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="booking-step">Siatka godzin</Label>
              <Controller
                control={control}
                name="slotStepMinutes"
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger id="booking-step">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SLOT_STEPS.map((step) => (
                        <SelectItem key={step} value={step}>
                          co {step} min
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              <p className="text-xs text-[var(--text-muted)]">
                Co ile minut mogą zaczynać się wizyty (60: o pełnych godzinach).
              </p>
            </div>
            <TextField
              error={errors.defaultVisitBufferMinutes?.message}
              hint="Czas po każdej wizycie, zanim zacznie się następna."
              id="booking-buffer"
              inputMode="numeric"
              label="Przerwa między wizytami (min)"
              registration={number("defaultVisitBufferMinutes")}
              type="number"
            />
            <TextField
              error={errors.minBookingLeadHours?.message}
              hint="Najkrótszy czas od rezerwacji do wizyty."
              id="booking-lead"
              inputMode="numeric"
              label="Minimalne wyprzedzenie (godz.)"
              registration={number("minBookingLeadHours")}
              type="number"
            />
            <TextField
              error={errors.maxBookingHorizonDays?.message}
              hint="Jak daleko w przód klienci widzą wolne terminy."
              id="booking-horizon"
              inputMode="numeric"
              label="Rezerwacje na (dni do przodu)"
              registration={number("maxBookingHorizonDays")}
              type="number"
            />
            <TextField
              error={errors.holdMinutes?.message}
              hint="Tyle czasu klient ma na podanie danych; przejście do płatności przedłuża blokadę do 30 min."
              id="booking-hold"
              inputMode="numeric"
              label="Blokada wybranego terminu (min)"
              registration={number("holdMinutes")}
              type="number"
            />
          </div>
        </fieldset>

        <fieldset className="space-y-4">
          <legend className="text-sm font-semibold text-[var(--text)]">
            Zmiany i odwołania przez klienta
          </legend>
          <div className="grid gap-4 md:grid-cols-2">
            <TextField
              error={errors.cancellationWindowHours?.message}
              hint="Odwołanie wcześniej: pełny zwrot. Później: bez zwrotu."
              id="booking-cancel"
              inputMode="numeric"
              label="Odwołanie ze zwrotem do (godz. przed wizytą)"
              registration={number("cancellationWindowHours")}
              type="number"
            />
            <TextField
              error={errors.rescheduleWindowHours?.message}
              hint="Później przełożenie tylko przez kontakt z centrum."
              id="booking-reschedule"
              inputMode="numeric"
              label="Samodzielne przełożenie do (godz. przed wizytą)"
              registration={number("rescheduleWindowHours")}
              type="number"
            />
            <TextField
              error={errors.maxSelfReschedules?.message}
              hint="Kolejne przełożenia przez kontakt z centrum; 0 wyłącza samodzielne przełożenie."
              id="booking-reschedules"
              inputMode="numeric"
              label="Ile razy klient może sam przełożyć wizytę"
              registration={number("maxSelfReschedules")}
              type="number"
            />
          </div>
        </fieldset>

        <fieldset className="space-y-4">
          <legend className="text-sm font-semibold text-[var(--text)]">
            Płatność
          </legend>
          <p className="text-xs text-[var(--text-muted)]">
            Wizyty opłaca się tylko online. Klient może zarezerwować i zapłacić
            później; nieopłacona rezerwacja jest anulowana.
          </p>
          <div className="grid gap-4 md:grid-cols-2">
            <TextField
              error={errors.paymentDueHours?.message}
              hint="Bliżej wizyty klient płaci od razu przy rezerwacji."
              id="booking-payment-due"
              inputMode="numeric"
              label="Zapłata najpóźniej (godz. przed wizytą)"
              registration={number("paymentDueHours")}
              type="number"
            />
            <TextField
              error={errors.centrePaymentLinkHours?.message}
              hint="Dla wizyt zapisanych przez centrum bliżej niż powyżej; najpóźniej godzinę przed wizytą."
              id="booking-payment-link"
              inputMode="numeric"
              label="Ważność linku do płatności (godz.)"
              registration={number("centrePaymentLinkHours")}
              type="number"
            />
          </div>
        </fieldset>

        <Button disabled={!isDirty} loading={isPending} type="submit">
          Zapisz ustawienia rezerwacji
        </Button>
      </form>
    </Card>
  );
}

export function CenterSettings({
  profile,
  locations,
  settings,
}: {
  profile: CenterPublicProfile | null;
  locations: Location[];
  settings: CenterSettingsData;
}) {
  return (
    <div className="space-y-5">
      <PageTitle>Ustawienia centrum</PageTitle>
      <Tabs defaultValue="profile">
        <TabsList>
          <TabsTrigger value="profile">Profil centrum</TabsTrigger>
          <TabsTrigger value="locations">Lokalizacje</TabsTrigger>
          <TabsTrigger value="booking">Rezerwacje online</TabsTrigger>
        </TabsList>
        <TabsContent value="profile">
          <CenterProfileCard profile={profile} />
        </TabsContent>
        <TabsContent value="locations">
          <LocationsCard locations={locations} />
        </TabsContent>
        <TabsContent value="booking">
          <BookingSettingsCard settings={settings} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
