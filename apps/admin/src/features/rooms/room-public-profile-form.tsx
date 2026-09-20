"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  roomPublicProfileSchema,
  type RoomPublicProfileInput,
} from "@repo/contracts";
import { Button } from "@repo/ui/button";
import { Input } from "@repo/ui/input";
import { Label } from "@repo/ui/label";
import { Switch } from "@repo/ui/switch";
import { Textarea } from "@repo/ui/textarea";
import { Controller, useForm } from "react-hook-form";
import type { z } from "zod";

export function RoomPublicProfileForm({
  defaultValues,
  pending,
  error,
  onSubmit,
}: {
  defaultValues: RoomPublicProfileInput;
  pending?: boolean;
  error?: string | null;
  onSubmit: (values: RoomPublicProfileInput) => void;
}) {
  const form = useForm<
    z.input<typeof roomPublicProfileSchema>,
    unknown,
    RoomPublicProfileInput
  >({ resolver: zodResolver(roomPublicProfileSchema), defaultValues });
  const fieldError = (message?: string) =>
    message ? <p className="text-sm text-[var(--danger)]">{message}</p> : null;
  return (
    <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>Nazwa publiczna</Label>
          <Input
            aria-label="Nazwa publiczna"
            {...form.register("displayName")}
          />
          {fieldError(form.formState.errors.displayName?.message)}
        </div>
        <div className="space-y-1.5">
          <Label>Ścieżka obrazu</Label>
          <Input
            aria-label="Ścieżka obrazu"
            placeholder="Opcjonalna integracja Storage później"
            {...form.register("imagePath", { setValueAs: nullable })}
          />
          {fieldError(form.formState.errors.imagePath?.message)}
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label>Krótki opis</Label>
          <Textarea
            aria-label="Krótki opis"
            rows={3}
            {...form.register("shortDescription", { setValueAs: nullable })}
          />
          {fieldError(form.formState.errors.shortDescription?.message)}
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label>Długi opis</Label>
          <Textarea
            aria-label="Długi opis"
            rows={6}
            {...form.register("longDescription", { setValueAs: nullable })}
          />
          {fieldError(form.formState.errors.longDescription?.message)}
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label>Informacje o dostępności architektonicznej</Label>
          <Textarea
            aria-label="Informacje o dostępności architektonicznej"
            rows={4}
            {...form.register("accessibilityNotes", { setValueAs: nullable })}
          />
          {fieldError(form.formState.errors.accessibilityNotes?.message)}
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label>Udogodnienia</Label>
          <Input
            aria-label="Udogodnienia"
            placeholder="np. winda, toaleta dostępna — oddziel przecinkami"
            defaultValue={defaultValues.amenities.join(", ")}
            onChange={(event) =>
              form.setValue(
                "amenities",
                event.target.value
                  .split(",")
                  .map((item) => item.trim())
                  .filter(Boolean),
                { shouldValidate: true },
              )
            }
          />
          {fieldError(form.formState.errors.amenities?.message)}
        </div>
      </div>
      <Controller
        control={form.control}
        name="published"
        render={({ field }) => (
          <label className="flex min-h-12 items-center justify-between rounded-[var(--radius-control)] border border-[var(--border)] px-4">
            <span>
              <strong className="block text-sm">Profil opublikowany</strong>
              <span className="text-xs text-[var(--text-muted)]">
                Publiczna ekspozycja wymaga również aktywnego i publicznego
                gabinetu.
              </span>
            </span>
            <Switch
              checked={field.value}
              onCheckedChange={field.onChange}
              aria-label="Profil opublikowany"
            />
          </label>
        )}
      />
      {error ? <p className="text-sm text-[var(--danger)]">{error}</p> : null}
      <div className="flex justify-end">
        <Button loading={pending} type="submit">
          Zapisz profil publiczny
        </Button>
      </div>
    </form>
  );
}

const nullable = (value: string) => value || null;
