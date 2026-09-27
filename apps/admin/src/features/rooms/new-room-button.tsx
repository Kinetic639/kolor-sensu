"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@repo/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@repo/ui/dialog";
import { Input } from "@repo/ui/input";
import { Label } from "@repo/ui/label";
import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { createRoomAction } from "./actions";
import { newRoomFormSchema, type NewRoomFormValues } from "./forms";
import type { LocationOption } from "./loaders";
import { LocationSelect } from "./location-select";

function FieldError({ id, message }: { id: string; message?: string }) {
  return message ? (
    <p className="text-sm text-[var(--danger)]" id={id} role="alert">
      {message}
    </p>
  ) : null;
}

/** Adds a room with the essentials, then opens its page for the rest. */
export function NewRoomButton({ locations }: { locations: LocationOption[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const {
    control,
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<NewRoomFormValues>({
    resolver: zodResolver(newRoomFormSchema),
    defaultValues: {
      name: "",
      locationId: locations.length === 1 ? locations[0]!.id : "",
      capacity: "1",
    },
  });

  const submit = handleSubmit((values) =>
    startTransition(async () => {
      const result = await createRoomAction(values);
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      toast.success("Dodano gabinet");
      setOpen(false);
      reset();
      router.push(`/gabinety/${result.roomId}`);
    }),
  );

  return (
    <Dialog onOpenChange={setOpen} open={open}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="size-4" aria-hidden="true" />
          Dodaj gabinet
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nowy gabinet</DialogTitle>
          <DialogDescription>
            Opis, zdjęcia i widoczność na stronie ustawisz na stronie gabinetu.
          </DialogDescription>
        </DialogHeader>
        <form className="space-y-4" noValidate onSubmit={submit}>
          <div className="space-y-1.5">
            <Label htmlFor="new-room-name">Nazwa</Label>
            <Input
              aria-describedby="new-room-name-error"
              aria-invalid={errors.name ? true : undefined}
              id="new-room-name"
              placeholder="np. Gabinet Zielony"
              {...register("name")}
            />
            <FieldError
              id="new-room-name-error"
              message={errors.name?.message}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="new-room-location">Lokalizacja</Label>
            <Controller
              control={control}
              name="locationId"
              render={({ field }) => (
                <LocationSelect
                  describedBy="new-room-location-error"
                  id="new-room-location"
                  invalid={Boolean(errors.locationId)}
                  locations={locations}
                  onChange={field.onChange}
                  value={field.value}
                />
              )}
            />
            <FieldError
              id="new-room-location-error"
              message={errors.locationId?.message}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="new-room-capacity">Pojemność (osoby)</Label>
            <Input
              aria-describedby="new-room-capacity-error"
              aria-invalid={errors.capacity ? true : undefined}
              id="new-room-capacity"
              inputMode="numeric"
              {...register("capacity")}
            />
            <FieldError
              id="new-room-capacity-error"
              message={errors.capacity?.message}
            />
          </div>
          <DialogFooter>
            <Button onClick={() => setOpen(false)} variant="secondary">
              Anuluj
            </Button>
            <Button loading={isPending} type="submit">
              Dodaj gabinet
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
