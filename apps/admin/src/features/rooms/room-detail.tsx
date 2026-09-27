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
import { RichTextEditor } from "@repo/ui/rich-text-editor";
import { Switch } from "@repo/ui/switch";
import { Textarea } from "@repo/ui/textarea";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { Controller, useForm, type Resolver } from "react-hook-form";
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
import { LocationSelect } from "./location-select";

// The original may be large; only the cropped photo (well under 5 MB) is kept.
const SOURCE_IMAGE_MAX_BYTES = 20 * 1024 * 1024;
const PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"];

type ActionResult = { ok: true } | { ok: false; message: string };

// On the site only when the room is public and its profile published; the
// page's one switch sets both.
function isOnSite(model: AdminRoomDetailModel) {
  return model.room.publiclyVisible && Boolean(model.publicProfile?.published);
}

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
    // The rich text schema reads `unknown` input (it validates stored JSON);
    // the form always holds a document, so the resolver is typed as such.
    resolver: zodResolver(
      roomProfileFormSchema,
    ) as unknown as Resolver<RoomProfileFormValues>,
    defaultValues: {
      ...toRoomProfileFormValues(model.publicProfile, model.room.name),
      published: isOnSite(model),
    },
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
          <p className="text-sm font-semibold text-[var(--text)]">Pełny opis</p>
          <Controller
            control={control}
            name="longDescription"
            render={({ field }) => (
              <RichTextEditor
                ariaLabel="Pełny opis gabinetu"
                onChange={field.onChange}
                placeholder="Opisz gabinet: atmosferę, wyposażenie, do czego służy…"
                value={field.value}
              />
            )}
          />
          <FieldError
            id="room-long-error"
            message={errors.longDescription?.message}
          />
          <p className="text-xs text-[var(--text-muted)]">
            Udogodnienia i dostępność budynku opisujesz w lokalizacji
            (Ustawienia centrum).
          </p>
        </div>
        <Controller
          control={control}
          name="published"
          render={({ field }) => (
            <SwitchField
              checked={field.value}
              label="Widoczny na stronie"
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
        description="Nazwa, lokalizacja i pojemność. Widoczność na stronie ustawiasz w profilu publicznym."
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
          <Label htmlFor="room-location">Lokalizacja</Label>
          <Controller
            control={control}
            name="locationId"
            render={({ field }) => (
              <LocationSelect
                describedBy="room-location-error"
                id="room-location"
                invalid={Boolean(errors.locationId)}
                locations={model.locations}
                onChange={field.onChange}
                value={field.value}
              />
            )}
          />
          <FieldError
            id="room-location-error"
            message={errors.locationId?.message}
          />
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
        <Controller
          control={control}
          name="active"
          render={({ field }) => (
            <SwitchField
              checked={field.value}
              label="Gabinet aktywny"
              onCheckedChange={field.onChange}
            />
          )}
        />
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
  const onSite = isOnSite(model);

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
        <StatusBadge tone={onSite ? "success" : "neutral"}>
          {onSite ? "Widoczny na stronie" : "Ukryty na stronie"}
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
