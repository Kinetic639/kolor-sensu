"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  roomAvailabilityExceptionCreateSchema,
  type RoomAvailabilityException,
  type RoomAvailabilityExceptionCreate,
} from "@repo/contracts";
import { Button } from "@repo/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@repo/ui/dialog";
import { Input } from "@repo/ui/input";
import { Label } from "@repo/ui/label";
import { EmptyState } from "@repo/ui/portal-content";
import { RoomAvailabilityExceptionItem } from "@repo/ui/room-admin";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/ui/select";
import { Controller, useForm } from "react-hook-form";
import { useState } from "react";
import type { z } from "zod";

const labels = {
  closed_all_day: "Zamknięte cały dzień",
  blocked_interval: "Blokada godzinowa",
  extra_available_interval: "Dodatkowa dostępność",
} as const;

export function AvailabilityExceptions({
  roomId,
  items,
  pending,
  error,
  onCreate,
  onUpdate,
  onRemove,
}: {
  roomId: string;
  items: RoomAvailabilityException[];
  pending?: boolean;
  error?: string | null;
  onCreate: (value: RoomAvailabilityExceptionCreate) => void;
  onUpdate: (id: string, value: RoomAvailabilityExceptionCreate) => void;
  onRemove: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<RoomAvailabilityException | null>(
    null,
  );
  const beginEdit = (item: RoomAvailabilityException | null) => {
    setEditing(item);
    setOpen(true);
  };
  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => beginEdit(null)}>Dodaj wyjątek</Button>
      </div>
      {items.length ? (
        <ul className="space-y-3">
          {items.map((item) => (
            <li key={item.id}>
              <RoomAvailabilityExceptionItem
                {...item}
                actions={
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => beginEdit(item)}
                    >
                      Edytuj
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => onRemove(item.id)}
                    >
                      Usuń
                    </Button>
                  </div>
                }
              />
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState
          title="Brak wyjątków dostępności"
          description="Normalny tydzień obowiązuje bez datowych zamknięć lub dodatkowych godzin."
        />
      )}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editing ? "Edytuj wyjątek" : "Dodaj wyjątek"}
            </DialogTitle>
            <DialogDescription>
              Zmiana dotyczy wyłącznie dostępności fizycznego gabinetu.
            </DialogDescription>
          </DialogHeader>
          <ExceptionForm
            key={editing?.id ?? "new"}
            roomId={roomId}
            item={editing}
            pending={pending}
            error={error}
            onSubmit={(value) => {
              editing ? onUpdate(editing.id, value) : onCreate(value);
              setOpen(false);
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ExceptionForm({
  roomId,
  item,
  pending,
  error,
  onSubmit,
}: {
  roomId: string;
  item: RoomAvailabilityException | null;
  pending?: boolean;
  error?: string | null;
  onSubmit: (value: RoomAvailabilityExceptionCreate) => void;
}) {
  const form = useForm<
    z.input<typeof roomAvailabilityExceptionCreateSchema>,
    unknown,
    RoomAvailabilityExceptionCreate
  >({
    resolver: zodResolver(roomAvailabilityExceptionCreateSchema),
    defaultValues: item
      ? ({
          roomId,
          date: item.date,
          type: item.type,
          startsAt: item.startsAt,
          endsAt: item.endsAt,
          reason: item.reason,
        } as RoomAvailabilityExceptionCreate)
      : {
          roomId,
          date: new Date().toISOString().slice(0, 10),
          type: "closed_all_day",
          startsAt: null,
          endsAt: null,
          reason: null,
        },
  });
  const type = form.watch("type");
  return (
    <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>Data</Label>
          <Input
            aria-label="Data wyjątku"
            type="date"
            {...form.register("date")}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Rodzaj</Label>
          <Controller
            control={form.control}
            name="type"
            render={({ field }) => (
              <Select
                value={field.value}
                onValueChange={(value) => {
                  field.onChange(value);
                  if (value === "closed_all_day") {
                    form.setValue("startsAt", null);
                    form.setValue("endsAt", null);
                  } else {
                    form.setValue("startsAt", "12:00");
                    form.setValue("endsAt", "13:00");
                  }
                }}
              >
                <SelectTrigger aria-label="Rodzaj wyjątku">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(labels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </div>
        {type !== "closed_all_day" ? (
          <>
            <div className="space-y-1.5">
              <Label>Od</Label>
              <Input
                aria-label="Wyjątek od"
                type="time"
                {...form.register("startsAt")}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Do</Label>
              <Input
                aria-label="Wyjątek do"
                type="time"
                {...form.register("endsAt")}
              />
            </div>
          </>
        ) : null}
        <div className="space-y-1.5 sm:col-span-2">
          <Label>Powód</Label>
          <Input
            aria-label="Powód"
            {...form.register("reason", {
              setValueAs: (value) => value || null,
            })}
          />
        </div>
      </div>
      {error ? <p className="text-sm text-[var(--danger)]">{error}</p> : null}
      <div className="flex justify-end">
        <Button loading={pending} type="submit">
          Zapisz wyjątek
        </Button>
      </div>
    </form>
  );
}
