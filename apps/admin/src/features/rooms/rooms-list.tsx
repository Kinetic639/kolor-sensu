"use client";

import { zodResolver } from "@hookform/resolvers/zod";
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
import { StatusBadge } from "@repo/ui/portal-content";
import { TagListField } from "@repo/ui/specialist-profile";
import { Switch } from "@repo/ui/switch";
import { Textarea } from "@repo/ui/textarea";
import { Globe } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { saveRoomProfileAction } from "./actions";
import {
  roomProfileFormSchema,
  toRoomProfileFormValues,
  type RoomProfileFormValues,
} from "./forms";
import type { AdminRoomWithProfile } from "./loaders";

function RoomProfileForm({
  room,
  pending,
  onCancel,
  onSubmit,
}: {
  room: AdminRoomWithProfile;
  pending: boolean;
  onCancel: () => void;
  onSubmit: (values: RoomProfileFormValues) => void;
}) {
  const {
    control,
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RoomProfileFormValues>({
    resolver: zodResolver(roomProfileFormSchema),
    defaultValues: toRoomProfileFormValues(room.publicProfile, room.name),
  });

  return (
    <form className="space-y-4" noValidate onSubmit={handleSubmit(onSubmit)}>
      <div className="space-y-1.5">
        <Label htmlFor="room-display-name">Nazwa na stronie</Label>
        <Input
          aria-describedby="room-display-name-error"
          aria-invalid={errors.displayName ? true : undefined}
          id="room-display-name"
          {...register("displayName")}
        />
        {errors.displayName ? (
          <p
            className="text-sm text-[var(--danger)]"
            id="room-display-name-error"
            role="alert"
          >
            {errors.displayName.message}
          </p>
        ) : null}
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="room-short">Krótki opis</Label>
        <Textarea id="room-short" rows={2} {...register("shortDescription")} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="room-long">Opis</Label>
        <Textarea id="room-long" rows={5} {...register("longDescription")} />
      </div>
      <Controller
        control={control}
        name="amenities"
        render={({ field }) => (
          <TagListField
            description="Np. fotele, klimatyzacja, wyciszenie."
            id="room-amenities"
            label="Udogodnienia"
            maxItems={50}
            maxLength={100}
            onChange={field.onChange}
            values={field.value}
          />
        )}
      />
      <div className="space-y-1.5">
        <Label htmlFor="room-accessibility">Dostępność</Label>
        <Textarea
          aria-describedby="room-accessibility-hint"
          id="room-accessibility"
          rows={2}
          {...register("accessibilityNotes")}
        />
        <p
          className="text-xs text-[var(--text-muted)]"
          id="room-accessibility-hint"
        >
          Np. winda, próg, toaleta dostosowana do potrzeb osób z
          niepełnosprawnościami.
        </p>
      </div>
      <Controller
        control={control}
        name="published"
        render={({ field }) => (
          <label className="flex min-h-11 items-center justify-between gap-3 rounded-[var(--radius-control)] border border-[var(--border)] px-3 text-sm">
            <span>Opublikowany na stronie</span>
            <Switch
              aria-label="Opublikowany na stronie"
              checked={field.value}
              onCheckedChange={field.onChange}
            />
          </label>
        )}
      />
      {room.publiclyVisible ? null : (
        <p className="rounded-[var(--radius-control)] bg-[var(--warning-soft)] p-3 text-sm text-[var(--text)]">
          Gabinet jest oznaczony jako wewnętrzny, więc nie pojawi się na stronie
          nawet po opublikowaniu profilu.
        </p>
      )}
      <DialogFooter>
        <Button onClick={onCancel} variant="secondary">
          Anuluj
        </Button>
        <Button loading={pending} type="submit">
          Zapisz profil
        </Button>
      </DialogFooter>
    </form>
  );
}

export function RoomsList({ rooms }: { rooms: AdminRoomWithProfile[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState<AdminRoomWithProfile | null>(null);
  const [isPending, startTransition] = useTransition();

  function save(room: AdminRoomWithProfile, values: RoomProfileFormValues) {
    startTransition(async () => {
      const result = await saveRoomProfileAction(room.id, values);
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      setEditing(null);
      toast.success("Zapisano profil gabinetu");
      router.refresh();
    });
  }

  return (
    <>
      <ul className="space-y-3">
        {rooms.map((room) => (
          <li key={room.id}>
            <Card className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-heading font-semibold text-[var(--text)]">
                  {room.name}
                </p>
                <p className="text-sm text-[var(--text-muted)]">
                  {room.locationName} &middot; pojemność {room.capacity}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge tone={room.active ? "success" : "neutral"}>
                  {room.active ? "Aktywny" : "Nieaktywny"}
                </StatusBadge>
                <StatusBadge tone={room.publiclyVisible ? "info" : "neutral"}>
                  {room.publiclyVisible ? "Publiczny" : "Wewnętrzny"}
                </StatusBadge>
                <StatusBadge
                  tone={room.publicProfile?.published ? "success" : "neutral"}
                >
                  {room.publicProfile?.published
                    ? "Profil opublikowany"
                    : room.publicProfile
                      ? "Profil nieopublikowany"
                      : "Brak profilu"}
                </StatusBadge>
                <Button
                  aria-label={`Profil publiczny: ${room.name}`}
                  onClick={() => setEditing(room)}
                  size="sm"
                  variant="secondary"
                >
                  <Globe className="size-4" aria-hidden="true" />
                  Profil publiczny
                </Button>
              </div>
            </Card>
          </li>
        ))}
      </ul>
      <Dialog
        onOpenChange={(open) => {
          if (!open) setEditing(null);
        }}
        open={editing !== null}
      >
        <DialogContent className="max-h-[90dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Profil publiczny: {editing?.name ?? "gabinet"}
            </DialogTitle>
            <DialogDescription>
              Treści widoczne na stronie w zakładce Gabinety.
            </DialogDescription>
          </DialogHeader>
          {editing ? (
            <RoomProfileForm
              key={editing.id}
              onCancel={() => setEditing(null)}
              onSubmit={(values) => save(editing, values)}
              pending={isPending}
              room={editing}
            />
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}
