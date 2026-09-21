"use client";
import { combineDateTimeToIso, splitIsoToDateTime } from "@repo/contracts";
import type { WorkshopCreate, WorkshopModality } from "@repo/contracts";
import { Button } from "@repo/ui/button";
import { Input } from "@repo/ui/input";
import { Label } from "@repo/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/ui/select";
import { Switch } from "@repo/ui/switch";
import { Textarea } from "@repo/ui/textarea";
import { Controller, useForm } from "react-hook-form";
import type { WorkshopFormOptions } from "./types";

export interface WorkshopFormDefaults {
  title: string;
  slug: string;
  shortDescription: string | null;
  longDescription: string | null;
  specialistId: string;
  modality: WorkshopModality;
  locationId: string | null;
  roomId: string | null;
  startsAt: string;
  endsAt: string;
  priceMinor: number;
  capacity: number;
  registrationEnabled: boolean;
  coverImagePath: string | null;
}

interface WorkshopFormValues {
  title: string;
  slug: string;
  shortDescription: string;
  longDescription: string;
  specialistId: string;
  modality: WorkshopModality;
  locationId: string;
  roomId: string;
  date: string;
  startTime: string;
  endTime: string;
  priceInput: string;
  capacity: number;
  registrationEnabled: boolean;
  coverImagePath: string;
}

function emptyDefaults(): WorkshopFormValues {
  return {
    title: "",
    slug: "",
    shortDescription: "",
    longDescription: "",
    specialistId: "",
    modality: "in_person",
    locationId: "",
    roomId: "",
    date: "",
    startTime: "",
    endTime: "",
    priceInput: "0",
    capacity: 12,
    registrationEnabled: false,
    coverImagePath: "",
  };
}

function toFormValues(defaults: WorkshopFormDefaults): WorkshopFormValues {
  const { date, time: startTime } = splitIsoToDateTime(defaults.startsAt);
  const { time: endTime } = splitIsoToDateTime(defaults.endsAt);
  return {
    title: defaults.title,
    slug: defaults.slug,
    shortDescription: defaults.shortDescription ?? "",
    longDescription: defaults.longDescription ?? "",
    specialistId: defaults.specialistId,
    modality: defaults.modality,
    locationId: defaults.locationId ?? "",
    roomId: defaults.roomId ?? "",
    date,
    startTime,
    endTime,
    priceInput: (defaults.priceMinor / 100).toFixed(2),
    capacity: defaults.capacity,
    registrationEnabled: defaults.registrationEnabled,
    coverImagePath: defaults.coverImagePath ?? "",
  };
}

export function WorkshopForm({
  defaultValues,
  options,
  pending,
  error,
  submitLabel,
  onSubmit,
}: {
  defaultValues?: WorkshopFormDefaults;
  options: WorkshopFormOptions;
  pending?: boolean;
  error?: string | null;
  submitLabel: string;
  onSubmit: (values: WorkshopCreate) => void;
}) {
  const {
    register,
    control,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<WorkshopFormValues>({
    defaultValues: defaultValues
      ? toFormValues(defaultValues)
      : emptyDefaults(),
  });
  const modality = watch("modality");
  const locationId = watch("locationId");
  const rooms = options.rooms.filter((room) => room.locationId === locationId);

  const fieldError = (message?: string) =>
    message ? (
      <p className="text-sm text-[var(--danger)]" role="alert">
        {message}
      </p>
    ) : null;

  const submit = handleSubmit((values) => {
    const priceMinor = Math.round(Number(values.priceInput || "0") * 100);
    onSubmit({
      title: values.title,
      slug: values.slug,
      shortDescription: values.shortDescription || null,
      longDescription: values.longDescription || null,
      specialistId: values.specialistId,
      modality: values.modality,
      locationId:
        values.modality === "online" ? null : values.locationId || null,
      roomId: values.modality === "online" ? null : values.roomId || null,
      startsAt: combineDateTimeToIso(values.date, values.startTime),
      endsAt: combineDateTimeToIso(values.date, values.endTime),
      priceMinor,
      currencyCode: "PLN",
      capacity: Number(values.capacity),
      registrationEnabled: values.registrationEnabled,
      coverImagePath: values.coverImagePath || null,
    });
  });

  return (
    <form className="space-y-4" onSubmit={submit}>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="workshop-title">Tytuł</Label>
          <Input
            id="workshop-title"
            required
            {...register("title", { required: true })}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="workshop-slug">Slug</Label>
          <Input
            id="workshop-slug"
            placeholder="jak-radzic-sobie-ze-stresem"
            required
            {...register("slug", { required: true })}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Prowadzący specjalista</Label>
          <Controller
            control={control}
            name="specialistId"
            rules={{ required: true }}
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger aria-label="Prowadzący specjalista">
                  <SelectValue placeholder="Wybierz specjalistę" />
                </SelectTrigger>
                <SelectContent>
                  {options.specialists.map((specialist) => (
                    <SelectItem key={specialist.id} value={specialist.id}>
                      {specialist.displayName}
                      {specialist.professionalTitle
                        ? ` · ${specialist.professionalTitle}`
                        : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          {fieldError(errors.specialistId ? "Wybierz specjalistę." : undefined)}
        </div>
        <div className="space-y-1.5">
          <Label>Modalność</Label>
          <Controller
            control={control}
            name="modality"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger aria-label="Modalność">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="in_person">Stacjonarnie</SelectItem>
                  <SelectItem value="online">Online</SelectItem>
                </SelectContent>
              </Select>
            )}
          />
        </div>
        {modality === "in_person" ? (
          <>
            <div className="space-y-1.5">
              <Label>Lokalizacja</Label>
              <Controller
                control={control}
                name="locationId"
                rules={{ required: modality === "in_person" }}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger aria-label="Lokalizacja">
                      <SelectValue placeholder="Wybierz lokalizację" />
                    </SelectTrigger>
                    <SelectContent>
                      {options.locations.map((location) => (
                        <SelectItem key={location.id} value={location.id}>
                          {location.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {fieldError(
                errors.locationId
                  ? "Warsztat stacjonarny wymaga lokalizacji."
                  : undefined,
              )}
            </div>
            <div className="space-y-1.5">
              <Label>Gabinet (opcjonalnie)</Label>
              <Controller
                control={control}
                name="roomId"
                render={({ field }) => (
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                    disabled={!locationId}
                  >
                    <SelectTrigger aria-label="Gabinet">
                      <SelectValue placeholder="Bez przypisanego gabinetu" />
                    </SelectTrigger>
                    <SelectContent>
                      {rooms.map((room) => (
                        <SelectItem key={room.id} value={room.id}>
                          {room.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          </>
        ) : null}
        <div className="space-y-1.5">
          <Label htmlFor="workshop-date">Data</Label>
          <Input
            id="workshop-date"
            type="date"
            required
            {...register("date", { required: true })}
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="workshop-start-time">Godzina rozpoczęcia</Label>
            <Input
              id="workshop-start-time"
              type="time"
              required
              {...register("startTime", { required: true })}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="workshop-end-time">Godzina zakończenia</Label>
            <Input
              id="workshop-end-time"
              type="time"
              required
              {...register("endTime", { required: true })}
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="workshop-price">Cena (zł)</Label>
          <Input
            id="workshop-price"
            type="number"
            min={0}
            step="0.01"
            {...register("priceInput")}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="workshop-capacity">Liczba miejsc</Label>
          <Input
            id="workshop-capacity"
            type="number"
            min={1}
            max={500}
            required
            {...register("capacity", { required: true, valueAsNumber: true })}
          />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="workshop-short">Krótki opis</Label>
          <Textarea
            id="workshop-short"
            rows={3}
            {...register("shortDescription")}
          />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="workshop-long">Opis</Label>
          <Textarea
            id="workshop-long"
            rows={6}
            {...register("longDescription")}
          />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="workshop-cover">
            Ścieżka zdjęcia okładki (opcjonalnie)
          </Label>
          <Input id="workshop-cover" {...register("coverImagePath")} />
        </div>
      </div>
      <Controller
        control={control}
        name="registrationEnabled"
        render={({ field }) => (
          <label className="flex min-h-11 items-center justify-between gap-3 rounded-[var(--radius-control)] border border-[var(--border)] px-3 text-sm">
            <span>Zapisy będą dostępne</span>
            <Switch
              checked={field.value}
              onCheckedChange={field.onChange}
              aria-label="Zapisy będą dostępne"
            />
          </label>
        )}
      />
      {error ? (
        <p className="text-sm text-[var(--danger)]" role="alert">
          {error}
        </p>
      ) : null}
      <div className="flex justify-end">
        <Button loading={pending} type="submit">
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
