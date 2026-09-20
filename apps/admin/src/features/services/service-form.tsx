"use client";
import { zodResolver } from "@hookform/resolvers/zod";
import { serviceCreateSchema, type ServiceCreate } from "@repo/contracts";
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
import { categoryLabels } from "./view-model";

type InputValues = z.input<typeof serviceCreateSchema>;
export function ServiceForm({
  defaultValues,
  pending,
  error,
  submitLabel,
  onSubmit,
}: {
  defaultValues?: ServiceCreate;
  pending?: boolean;
  error?: string | null;
  submitLabel: string;
  onSubmit: (values: ServiceCreate) => void;
}) {
  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<InputValues, unknown, ServiceCreate>({
    resolver: zodResolver(serviceCreateSchema),
    defaultValues: defaultValues ?? {
      name: "",
      slug: "",
      shortDescription: null,
      description: null,
      category: "other",
      defaultDurationMinutes: 50,
      active: true,
      publiclyVisible: true,
      bookingEnabled: false,
      sortOrder: 0,
    },
  });
  const fieldError = (message?: string) =>
    message ? (
      <p className="text-sm text-[var(--danger)]" role="alert">
        {message}
      </p>
    ) : null;
  return (
    <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="service-name">Nazwa</Label>
          <Input id="service-name" {...register("name")} />
          {fieldError(errors.name?.message)}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="service-slug">Slug</Label>
          <Input
            id="service-slug"
            placeholder="psychoterapia-indywidualna"
            {...register("slug")}
          />
          {fieldError(errors.slug?.message)}
        </div>
        <div className="space-y-1.5">
          <Label>Kategoria</Label>
          <Controller
            control={control}
            name="category"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger aria-label="Kategoria">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(categoryLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="service-duration">Domyślny czas (min)</Label>
          <Input
            id="service-duration"
            type="number"
            {...register("defaultDurationMinutes", { valueAsNumber: true })}
          />
          {fieldError(errors.defaultDurationMinutes?.message)}
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="service-short">Krótki opis</Label>
          <Textarea
            id="service-short"
            rows={3}
            {...register("shortDescription", {
              setValueAs: (value) => value || null,
            })}
          />
          {fieldError(errors.shortDescription?.message)}
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="service-description">Opis</Label>
          <Textarea
            id="service-description"
            rows={6}
            {...register("description", {
              setValueAs: (value) => value || null,
            })}
          />
          {fieldError(errors.description?.message)}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="service-order">Kolejność</Label>
          <Input
            id="service-order"
            type="number"
            {...register("sortOrder", { valueAsNumber: true })}
          />
          {fieldError(errors.sortOrder?.message)}
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        {(
          [
            ["active", "Usługa aktywna"],
            ["publiclyVisible", "Widoczna publicznie"],
            ["bookingEnabled", "Dostępna w bookingu"],
          ] as const
        ).map(([name, label]) => (
          <Controller
            key={name}
            control={control}
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
        ))}
      </div>
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
