"use client";

import { createClient } from "@/lib/supabase/client";
import { zodResolver } from "@hookform/resolvers/zod";
import { ROOM_IMAGE_LIMIT } from "@repo/contracts";
import { uploadRoomImage } from "@repo/supabase";
import { Button } from "@repo/ui/button";
import { DetailSection } from "@repo/ui/detail-page";
import { ColorField, resourceColors } from "@repo/ui/color-field";
import { ImageCropDialog } from "@repo/ui/image-crop-dialog";
import { Input } from "@repo/ui/input";
import { Label } from "@repo/ui/label";
import { SortableImageGallery } from "@repo/ui/sortable-image-gallery";
import { RichTextEditor } from "@repo/ui/rich-text-editor";
import { Switch } from "@repo/ui/switch";
import { Textarea } from "@repo/ui/textarea";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Controller, useForm, type Resolver } from "react-hook-form";
import { toast } from "@repo/ui/toast";
import {
  removeRoomImageAction,
  reorderRoomImagesAction,
  roomImagesChangedAction,
  saveRoomImageCaptionAction,
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
import type { AdminRoomDetailModel, AdminRoomModel } from "./loaders";
import { LocationSelect } from "./location-select";
import { useSave } from "@/lib/use-save";

// The original may be large; only the cropped photo (well under 5 MB) is kept.
const SOURCE_IMAGE_MAX_BYTES = 20 * 1024 * 1024;
const PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"];

function FieldError({ id, message }: { id: string; message?: string }) {
  return message ? (
    <p className="text-sm text-[var(--danger)]" id={id} role="alert">
      {message}
    </p>
  ) : null;
}

function SwitchField({
  label,
  description,
  checked,
  onCheckedChange,
}: {
  label: string;
  /** What the switch does, under its label. */
  description?: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex min-h-11 items-center justify-between gap-3 rounded-[var(--radius-control)] border border-[var(--border)] px-3 py-2.5 text-sm">
      <span className="grid gap-0.5">
        <span className="font-medium text-[var(--text)]">{label}</span>
        {description ? (
          <span className="text-xs text-[var(--text-muted)]">
            {description}
          </span>
        ) : null}
      </span>
      <Switch
        aria-label={label}
        checked={checked}
        onCheckedChange={onCheckedChange}
      />
    </label>
  );
}

/** Gabinety → Profil publiczny, beside the form: the room's photos. */
export function RoomPhotos({ model }: { model: AdminRoomDetailModel }) {
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
          ? "Gabinet może mieć najwyżej 3 zdjęcia."
          : "Nie udało się dodać zdjęcia. Spróbuj ponownie.",
      );
      closeCrop();
    } finally {
      setUploading(false);
    }
  }

  return (
    <DetailSection title="Zdjęcia">
      <SortableImageGallery
        className="px-3.5 py-3"
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
        renderCaption={(image, index) => (
          <RoomPhotoCaption
            key={image.id}
            roomId={model.room.id}
            imageId={image.id}
            initial={
              model.images.find((one) => one.id === image.id)?.caption ?? ""
            }
            number={index + 1}
            disabled={isPending || uploading}
          />
        )}
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
    </DetailSection>
  );
}

function RoomPhotoCaption({
  roomId,
  imageId,
  initial,
  number,
  disabled,
}: {
  roomId: string;
  imageId: string;
  initial: string;
  number: number;
  disabled: boolean;
}) {
  const [caption, setCaption] = useState(initial);
  const [saved, setSaved] = useState(initial);
  const { isPending, run } = useSave();
  const id = "room-photo-caption-" + imageId;
  return (
    <form
      className="grid gap-2 p-2.5"
      onSubmit={(event) => {
        event.preventDefault();
        run(
          () => saveRoomImageCaptionAction(roomId, imageId, caption),
          "Zapisano podpis zdjęcia",
          () => setSaved(caption),
        );
      }}
    >
      <Label htmlFor={id}>Podpis zdjęcia {number}</Label>
      <Textarea
        id={id}
        value={caption}
        maxLength={200}
        rows={2}
        placeholder="Np. Fotele do rozmowy przy oknie"
        disabled={disabled || isPending}
        onChange={(event) => setCaption(event.target.value)}
      />
      <Button
        type="submit"
        size="sm"
        variant="outline"
        loading={isPending}
        disabled={disabled || caption === saved}
      >
        Zapisz podpis
      </Button>
    </form>
  );
}

/** Gabinety → Profil publiczny: what the site says about the room. */
export function RoomProfileForm({ model }: { model: AdminRoomDetailModel }) {
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
    defaultValues: toRoomProfileFormValues(
      model.publicProfile,
      model.room.name,
    ),
  });

  return (
    <form
      className="max-w-3xl space-y-4 px-3.5 py-3"
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
        <Textarea id="room-short" rows={2} {...register("shortDescription")} />
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
          Udogodnienia i dostępność budynku opisujesz w lokalizacji (Ustawienia
          centrum).
        </p>
      </div>
      <div className="flex justify-end">
        <Button
          className="h-7 px-2.5 text-[0.8125rem]"
          disabled={!isDirty}
          loading={isPending}
          size="sm"
          type="submit"
        >
          Zapisz profil
        </Button>
      </div>
    </form>
  );
}

function RoomDetailsCard({ model }: { model: AdminRoomModel }) {
  const { isPending, run } = useSave();
  const {
    control,
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<RoomDetailsFormValues>({
    resolver: zodResolver(roomDetailsFormSchema),
    defaultValues: toRoomDetailsFormValues(model.room, model.onSite),
  });

  return (
    <form
      className="max-w-2xl space-y-4 px-3.5 py-3"
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
        name="color"
        render={({ field }) => (
          <ColorField
            automaticColor={resourceColors(null, model.room.id).accent}
            description="Wyróżnia gabinet w grafikach i kalendarzach specjalistów."
            label="Kolor gabinetu"
            onChange={field.onChange}
            value={field.value}
          />
        )}
      />
      <Controller
        control={control}
        name="active"
        render={({ field }) => (
          <SwitchField
            checked={field.value}
            description="W użyciu w centrum: specjaliści mogą ustawiać w nim dyżury, pacjenci rezerwować wizyty."
            label="Gabinet aktywny"
            onCheckedChange={field.onChange}
          />
        )}
      />
      <Controller
        control={control}
        name="onSite"
        render={({ field }) => (
          <SwitchField
            checked={field.value}
            description="Wizytówka ze zdjęciami i opisem na stronie, w zakładce Gabinety. Nieaktywnego gabinetu strona nie pokaże."
            label="Widoczny na stronie"
            onCheckedChange={field.onChange}
          />
        )}
      />
      <div className="flex justify-end">
        <Button
          className="h-7 px-2.5 text-[0.8125rem]"
          disabled={!isDirty}
          loading={isPending}
          size="sm"
          type="submit"
        >
          Zapisz dane
        </Button>
      </div>
    </form>
  );
}

/** Gabinety → Ustawienia: name, location, capacity and status. */
export function RoomSettingsTab({ model }: { model: AdminRoomModel }) {
  return <RoomDetailsCard model={model} />;
}
