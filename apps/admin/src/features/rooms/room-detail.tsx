"use client";

import { createClient } from "@/lib/supabase/client";
import { zodResolver } from "@hookform/resolvers/zod";
import { ROOM_IMAGE_LIMIT } from "@repo/contracts";
import { uploadRoomImage } from "@repo/supabase";
import { Button } from "@repo/ui/button";
import { Card } from "@repo/ui/card";
import { ImageCropDialog } from "@repo/ui/image-crop-dialog";
import { Input } from "@repo/ui/input";
import { Label } from "@repo/ui/label";
import {
  PageHeader,
  SectionHeader,
  StatusBadge,
} from "@repo/ui/portal-content";
import { SortableImageGallery } from "@repo/ui/sortable-image-gallery";
import { TagListField } from "@repo/ui/specialist-profile";
import { Switch } from "@repo/ui/switch";
import { Textarea } from "@repo/ui/textarea";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import {
  removeRoomImageAction,
  reorderRoomImagesAction,
  roomImagesChangedAction,
  saveRoomDetailsAction,
  saveRoomProfileAction,
  setRoomMainImageAction,
} from "./actions";
import {
  roomDetailsFormSchema,
  roomProfileFormSchema,
  toRoomDetailsFormValues,
  toRoomProfileFormValues,
  type RoomDetailsFormValues,
  type RoomProfileFormValues,
} from "./forms";
import type { AdminRoomDetailModel } from "./loaders";

// The original may be large; only the cropped photo (well under 5 MB) is kept.
const SOURCE_IMAGE_MAX_BYTES = 20 * 1024 * 1024;
const PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"];

type ActionResult = { ok: true } | { ok: false; message: string };

function FieldError({ id, message }: { id: string; message?: string }) {
  return message ? (
    <p className="text-sm text-[var(--danger)]" id={id} role="alert">
      {message}
    </p>
  ) : null;
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

function useSave() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  function run(
    action: () => Promise<ActionResult>,
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

function RoomPhotos({ model }: { model: AdminRoomDetailModel }) {
  const router = useRouter();
  const { isPending, run } = useSave();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cropUrl, setCropUrl] = useState<string | null>(null);
  const cropUrlRef = useRef<string | null>(null);

  function closeCrop() {
    if (cropUrlRef.current) URL.revokeObjectURL(cropUrlRef.current);
    cropUrlRef.current = null;
    setCropUrl(null);
  }
  useEffect(() => closeCrop, []);

  function onAdd(file: File) {
    if (!PHOTO_TYPES.includes(file.type)) {
      setError("Wybierz plik JPG, PNG lub WebP.");
      return;
    }
    if (file.size > SOURCE_IMAGE_MAX_BYTES) {
      setError("Plik jest za duży. Maksymalny rozmiar to 20 MB.");
      return;
    }
    setError(null);
    closeCrop();
    const url = URL.createObjectURL(file);
    cropUrlRef.current = url;
    setCropUrl(url);
  }

  async function onCropConfirm(image: Blob) {
    const extension = image.type === "image/png" ? "png" : "webp";
    const file = new File([image], `room.${extension}`, { type: image.type });
    setUploading(true);
    try {
      await uploadRoomImage(createClient(), model.room.id, file);
      await roomImagesChangedAction(model.room.id);
      closeCrop();
      toast.success("Dodano zdjęcie");
      router.refresh();
    } catch (uploadError) {
      const code =
        typeof uploadError === "object" && uploadError && "code" in uploadError
          ? uploadError.code
          : null;
      setError(
        code === "23514"
          ? "Gabinet może mieć najwyżej 5 zdjęć."
          : "Nie udało się dodać zdjęcia. Spróbuj ponownie.",
      );
      closeCrop();
    } finally {
      setUploading(false);
    }
  }

  return (
    <Card>
      <SectionHeader
        title="Zdjęcia"
        description="Zdjęcie główne pokazujemy na liście gabinetów. Kolejność zmienisz, przeciągając zdjęcia."
      />
      <SortableImageGallery
        className="mt-4"
        error={error}
        images={model.images}
        label="Zdjęcia gabinetu"
        max={ROOM_IMAGE_LIMIT}
        onAdd={onAdd}
        onRemove={(imageId) =>
          run(
            () => removeRoomImageAction(model.room.id, imageId),
            "Usunięto zdjęcie",
          )
        }
        onReorder={(imageIds) =>
          run(
            () => reorderRoomImagesAction(model.room.id, imageIds),
            "Zapisano kolejność zdjęć",
          )
        }
        onSetMain={(imageId) =>
          run(
            () => setRoomMainImageAction(model.room.id, imageId),
            "Ustawiono zdjęcie główne",
          )
        }
        pending={isPending || uploading}
      />
      <ImageCropDialog
        aspect="landscape"
        imageUrl={cropUrl}
        onConfirm={onCropConfirm}
        onOpenChange={(open) => {
          if (!open) closeCrop();
        }}
        open={cropUrl !== null}
        pending={uploading}
        title="Dopasuj zdjęcie gabinetu"
      />
    </Card>
  );
}

function RoomProfileCard({ model }: { model: AdminRoomDetailModel }) {
  const { isPending, run } = useSave();
  const {
    control,
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<RoomProfileFormValues>({
    resolver: zodResolver(roomProfileFormSchema),
    defaultValues: toRoomProfileFormValues(
      model.publicProfile,
      model.room.name,
    ),
  });

  return (
    <Card>
      <SectionHeader
        title="Profil publiczny"
        description="Treści widoczne na stronie w zakładce Gabinety."
      />
      <form
        className="mt-5 space-y-4"
        noValidate
        onSubmit={handleSubmit((values) =>
          run(
            () => saveRoomProfileAction(model.room.id, values),
            "Zapisano profil gabinetu",
            () => reset(values),
          ),
        )}
      >
        <div className="space-y-1.5">
          <Label htmlFor="room-display-name">Nazwa na stronie</Label>
          <Input
            aria-describedby="room-display-name-error"
            aria-invalid={errors.displayName ? true : undefined}
            id="room-display-name"
            {...register("displayName")}
          />
          <FieldError
            id="room-display-name-error"
            message={errors.displayName?.message}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="room-short">Krótki opis</Label>
          <Textarea
            id="room-short"
            rows={2}
            {...register("shortDescription")}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="room-long">Opis</Label>
          <Textarea id="room-long" rows={6} {...register("longDescription")} />
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
            <SwitchField
              checked={field.value}
              label="Opublikowany na stronie"
              onCheckedChange={field.onChange}
            />
          )}
        />
        {model.room.publiclyVisible ? null : (
          <p className="rounded-[var(--radius-control)] bg-[var(--warning-soft)] p-3 text-sm text-[var(--text)]">
            Gabinet jest oznaczony jako wewnętrzny, więc nie pojawi się na
            stronie nawet po opublikowaniu profilu. Zmienisz to w danych
            gabinetu.
          </p>
        )}
        <div className="flex justify-end">
          <Button disabled={!isDirty} loading={isPending} type="submit">
            Zapisz profil
          </Button>
        </div>
      </form>
    </Card>
  );
}

function RoomDetailsCard({ model }: { model: AdminRoomDetailModel }) {
  const { isPending, run } = useSave();
  const {
    control,
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<RoomDetailsFormValues>({
    resolver: zodResolver(roomDetailsFormSchema),
    defaultValues: toRoomDetailsFormValues(model.room),
  });

  return (
    <Card>
      <SectionHeader
        title="Dane gabinetu"
        description="Używane w centrum; nazwa i widoczność decydują też o stronie."
      />
      <form
        className="mt-5 space-y-4"
        noValidate
        onSubmit={handleSubmit((values) =>
          run(
            () => saveRoomDetailsAction(model.room.id, values),
            "Zapisano dane gabinetu",
            () => reset(values),
          ),
        )}
      >
        <div className="space-y-1.5">
          <Label htmlFor="room-name">Nazwa</Label>
          <Input
            aria-describedby="room-name-error"
            aria-invalid={errors.name ? true : undefined}
            id="room-name"
            {...register("name")}
          />
          <FieldError id="room-name-error" message={errors.name?.message} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="room-capacity">Pojemność (osoby)</Label>
          <Input
            aria-describedby="room-capacity-error"
            aria-invalid={errors.capacity ? true : undefined}
            id="room-capacity"
            inputMode="numeric"
            {...register("capacity")}
          />
          <FieldError
            id="room-capacity-error"
            message={errors.capacity?.message}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="room-note">Notatka wewnętrzna</Label>
          <Textarea
            aria-describedby="room-note-hint"
            id="room-note"
            rows={3}
            {...register("description")}
          />
          <p className="text-xs text-[var(--text-muted)]" id="room-note-hint">
            Widoczna tylko w portalach, nie na stronie.
          </p>
        </div>
        {(
          [
            ["active", "Gabinet aktywny"],
            ["publiclyVisible", "Widoczny na stronie"],
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
        <div className="flex justify-end">
          <Button disabled={!isDirty} loading={isPending} type="submit">
            Zapisz dane
          </Button>
        </div>
      </form>
    </Card>
  );
}

export function RoomDetail({ model }: { model: AdminRoomDetailModel }) {
  const { room, publicProfile } = model;

  return (
    <div className="space-y-6">
      <Button asChild size="sm" variant="ghost">
        <Link href="/gabinety">
          <ArrowLeft className="size-4" aria-hidden="true" />
          Wróć do listy
        </Link>
      </Button>
      <PageHeader
        description={`${model.locationName} · pojemność ${room.capacity}`}
        eyebrow="Gabinet"
        title={room.name}
      />
      <div className="flex flex-wrap gap-2">
        <StatusBadge tone={room.active ? "success" : "neutral"}>
          {room.active ? "Aktywny" : "Nieaktywny"}
        </StatusBadge>
        <StatusBadge tone={room.publiclyVisible ? "info" : "neutral"}>
          {room.publiclyVisible ? "Widoczny na stronie" : "Wewnętrzny"}
        </StatusBadge>
        <StatusBadge tone={publicProfile?.published ? "success" : "neutral"}>
          {publicProfile?.published
            ? "Profil opublikowany"
            : publicProfile
              ? "Profil nieopublikowany"
              : "Brak profilu"}
        </StatusBadge>
      </div>

      <RoomPhotos model={model} />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_26rem] xl:items-start">
        <RoomProfileCard model={model} />
        <RoomDetailsCard model={model} />
      </div>
    </div>
  );
}
