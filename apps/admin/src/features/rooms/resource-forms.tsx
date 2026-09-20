"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  locationCreateSchema,
  roomCreateSchema,
  type LocationCreate,
  type RoomCreate,
} from "@repo/contracts";
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
import type { z } from "zod";

const FieldError = ({ message }: { message?: string }) =>
  message ? <p className="text-sm text-[var(--danger)]">{message}</p> : null;

export function LocationForm({
  defaultValues,
  pending,
  error,
  submitLabel,
  onSubmit,
}: {
  defaultValues?: LocationCreate;
  pending?: boolean;
  error?: string | null;
  submitLabel: string;
  onSubmit: (values: LocationCreate) => void;
}) {
  const form = useForm<
    z.input<typeof locationCreateSchema>,
    unknown,
    LocationCreate
  >({
    resolver: zodResolver(locationCreateSchema),
    defaultValues: defaultValues ?? {
      name: "",
      slug: "",
      addressLine1: null,
      addressLine2: null,
      postalCode: null,
      city: null,
      countryCode: "PL",
      active: true,
      publiclyVisible: true,
      sortOrder: 0,
    },
  });
  return (
    <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nazwa" error={form.formState.errors.name?.message}>
          <Input aria-label="Nazwa lokalizacji" {...form.register("name")} />
        </Field>
        <Field label="Slug" error={form.formState.errors.slug?.message}>
          <Input
            aria-label="Slug lokalizacji"
            placeholder="centrum-glowne"
            {...form.register("slug")}
          />
        </Field>
        <Field
          label="Adres"
          error={form.formState.errors.addressLine1?.message}
        >
          <Input
            aria-label="Adres"
            {...form.register("addressLine1", { setValueAs: nullable })}
          />
        </Field>
        <Field label="Adres — ciąg dalszy">
          <Input
            aria-label="Adres ciąg dalszy"
            {...form.register("addressLine2", { setValueAs: nullable })}
          />
        </Field>
        <Field label="Kod pocztowy">
          <Input
            aria-label="Kod pocztowy"
            {...form.register("postalCode", { setValueAs: nullable })}
          />
        </Field>
        <Field label="Miasto">
          <Input
            aria-label="Miasto"
            {...form.register("city", { setValueAs: nullable })}
          />
        </Field>
        <Field label="Kraj">
          <Input
            aria-label="Kraj"
            maxLength={2}
            {...form.register("countryCode")}
          />
        </Field>
        <Field label="Kolejność">
          <Input
            aria-label="Kolejność lokalizacji"
            type="number"
            {...form.register("sortOrder", { valueAsNumber: true })}
          />
        </Field>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <BooleanField form={form} name="active" label="Lokalizacja aktywna" />
        <BooleanField
          form={form}
          name="publiclyVisible"
          label="Widoczna publicznie"
        />
      </div>
      <Submit pending={pending} error={error} label={submitLabel} />
    </form>
  );
}

export function RoomForm({
  locations,
  defaultValues,
  pending,
  error,
  submitLabel,
  onSubmit,
}: {
  locations: { id: string; name: string }[];
  defaultValues?: RoomCreate;
  pending?: boolean;
  error?: string | null;
  submitLabel: string;
  onSubmit: (values: RoomCreate) => void;
}) {
  const form = useForm<z.input<typeof roomCreateSchema>, unknown, RoomCreate>({
    resolver: zodResolver(roomCreateSchema),
    defaultValues: defaultValues ?? {
      locationId: locations[0]?.id ?? "",
      name: "",
      slug: "",
      description: null,
      capacity: 1,
      active: true,
      publiclyVisible: false,
      sortOrder: 0,
    },
  });
  return (
    <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label="Lokalizacja"
          error={form.formState.errors.locationId?.message}
        >
          <Controller
            control={form.control}
            name="locationId"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger aria-label="Lokalizacja">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {locations.map((location) => (
                    <SelectItem key={location.id} value={location.id}>
                      {location.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </Field>
        <Field label="Nazwa" error={form.formState.errors.name?.message}>
          <Input aria-label="Nazwa gabinetu" {...form.register("name")} />
        </Field>
        <Field label="Slug" error={form.formState.errors.slug?.message}>
          <Input
            aria-label="Slug gabinetu"
            placeholder="gabinet-1"
            {...form.register("slug")}
          />
        </Field>
        <Field
          label="Pojemność"
          error={form.formState.errors.capacity?.message}
        >
          <Input
            aria-label="Pojemność"
            type="number"
            {...form.register("capacity", { valueAsNumber: true })}
          />
        </Field>
        <div className="sm:col-span-2">
          <Field
            label="Opis wewnętrzny"
            error={form.formState.errors.description?.message}
          >
            <Textarea
              aria-label="Opis wewnętrzny"
              rows={4}
              {...form.register("description", { setValueAs: nullable })}
            />
          </Field>
        </div>
        <Field label="Kolejność">
          <Input
            aria-label="Kolejność gabinetu"
            type="number"
            {...form.register("sortOrder", { valueAsNumber: true })}
          />
        </Field>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <BooleanField form={form} name="active" label="Gabinet aktywny" />
        <BooleanField
          form={form}
          name="publiclyVisible"
          label="Dozwolona ekspozycja publiczna"
        />
      </div>
      <Submit pending={pending} error={error} label={submitLabel} />
    </form>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
      <FieldError message={error} />
    </div>
  );
}

function BooleanField({
  form,
  name,
  label,
}: {
  form: any;
  name: string;
  label: string;
}) {
  return (
    <Controller
      control={form.control}
      name={name}
      render={({ field }) => (
        <label className="flex min-h-11 items-center justify-between gap-3 rounded-[var(--radius-control)] border border-[var(--border)] px-3 text-sm">
          <span>{label}</span>
          <Switch
            checked={field.value}
            onCheckedChange={field.onChange}
            aria-label={label}
          />
        </label>
      )}
    />
  );
}

function Submit({
  pending,
  error,
  label,
}: {
  pending?: boolean;
  error?: string | null;
  label: string;
}) {
  return (
    <>
      <FieldError message={error ?? undefined} />
      <div className="flex justify-end">
        <Button loading={pending} type="submit">
          {label}
        </Button>
      </div>
    </>
  );
}

const nullable = (value: string) => value || null;
