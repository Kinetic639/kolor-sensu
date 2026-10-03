"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  clientDetailsSchema,
  type ClientDetailsValues,
  type ClientUpdateResult,
} from "@repo/contracts/clients";
import { Pencil } from "lucide-react";
import { useRouter } from "next/navigation";
import { useId, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "../toast";
import { Button } from "../button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../dialog";
import { Input } from "../input";
import { Label } from "../label";
import { Textarea } from "../textarea";

// Correcting a client's details and the centre's note (R15). The visits
// still to come follow the new details; past ones keep what the client
// gave then. The database checks it all again.

export type EditClientAction = (
  clientId: string,
  values: ClientDetailsValues,
) => Promise<ClientUpdateResult>;

function upcomingNote(count: number) {
  if (count === 0) return "";
  if (count === 1) return " Zmieniono też 1 nadchodzącą wizytę.";
  const last = count % 10;
  const lastTwo = count % 100;
  const word =
    last >= 2 && last <= 4 && (lastTwo < 12 || lastTwo > 14)
      ? "nadchodzące wizyty"
      : "nadchodzących wizyt";
  return ` Zmieniono też ${count} ${word}.`;
}

export function EditClientButton({
  clientId,
  details,
  action,
}: {
  clientId: string;
  details: ClientDetailsValues;
  action: EditClientAction;
}) {
  const router = useRouter();
  const id = useId();
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const form = useForm<ClientDetailsValues>({
    resolver: zodResolver(clientDetailsSchema),
    defaultValues: {
      name: details.name,
      email: details.email,
      phone: details.phone ?? "",
      notes: details.notes ?? "",
    },
  });
  const { errors, isSubmitting } = form.formState;

  const submit = form.handleSubmit(async (values) => {
    setMessage(null);
    const result = await action(clientId, values);
    if (!result.ok) {
      for (const [field, text] of Object.entries(result.fields ?? {})) {
        form.setError(field as keyof ClientDetailsValues, { message: text });
      }
      setMessage(result.message);
      return;
    }
    toast.success(
      `Zapisano dane klienta.${upcomingNote(result.upcomingUpdated)}`,
    );
    setOpen(false);
    router.refresh();
  });

  const field = (
    name: keyof ClientDetailsValues,
    label: string,
    input: React.ReactNode,
  ) => (
    <div className="grid gap-1.5">
      <Label htmlFor={`${id}-${name}`}>{label}</Label>
      {input}
      {errors[name] ? (
        <p
          className="text-xs font-medium text-[var(--danger)]"
          id={`${id}-${name}-error`}
          role="alert"
        >
          {errors[name]?.message}
        </p>
      ) : null}
    </div>
  );
  const described = (name: keyof ClientDetailsValues) =>
    errors[name]
      ? { "aria-invalid": true, "aria-describedby": `${id}-${name}-error` }
      : {};

  return (
    <Dialog
      onOpenChange={(next) => {
        setOpen(next);
        if (next) {
          form.reset();
          setMessage(null);
        }
      }}
      open={open}
    >
      <Button onClick={() => setOpen(true)} size="sm" variant="secondary">
        <Pencil aria-hidden="true" />
        Edytuj dane
      </Button>
      <DialogContent>
        <form noValidate onSubmit={submit}>
          <DialogHeader>
            <DialogTitle>Dane klienta</DialogTitle>
            <DialogDescription>
              Nadchodzące wizyty przejmą nowe dane (e-maile pójdą na nowy
              adres). Minione wizyty zostają bez zmian.
            </DialogDescription>
          </DialogHeader>
          <div className="my-4 grid gap-3">
            {field(
              "name",
              "Imię i nazwisko",
              <Input
                autoComplete="off"
                id={`${id}-name`}
                {...described("name")}
                {...form.register("name")}
              />,
            )}
            {field(
              "email",
              "E-mail",
              <Input
                autoComplete="off"
                id={`${id}-email`}
                inputMode="email"
                type="email"
                {...described("email")}
                {...form.register("email")}
              />,
            )}
            {field(
              "phone",
              "Telefon (opcjonalnie)",
              <Input
                autoComplete="off"
                id={`${id}-phone`}
                inputMode="tel"
                type="tel"
                {...described("phone")}
                {...form.register("phone")}
              />,
            )}
            {field(
              "notes",
              "Notatka centrum (widzą ją tylko administratorzy)",
              <Textarea
                id={`${id}-notes`}
                maxLength={5000}
                rows={4}
                {...described("notes")}
                {...form.register("notes")}
              />,
            )}
            {message ? (
              <p
                className="rounded-[var(--radius-control)] bg-[var(--danger-soft)] px-3 py-2 text-sm text-[var(--danger)]"
                role="alert"
              >
                {message}
              </p>
            ) : null}
          </div>
          <DialogFooter>
            <Button
              onClick={() => setOpen(false)}
              type="button"
              variant="ghost"
            >
              Anuluj
            </Button>
            <Button loading={isSubmitting} type="submit">
              Zapisz
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
