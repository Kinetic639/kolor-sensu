"use client";

import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type Announcements,
  type DragEndEvent,
  type ScreenReaderInstructions,
} from "@dnd-kit/core";
import {
  arrayMove,
  rectSortingStrategy,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, ImagePlus, Star, Trash2 } from "lucide-react";
import { type ReactNode, useId, useRef, useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "./alert-dialog";
import { Button } from "./button";
import { ImageLightbox } from "./image-lightbox";
import { cn } from "./lib/utils";

export interface GalleryImage {
  id: string;
  url: string;
  isMain: boolean;
}

export interface SortableImageGalleryProps {
  images: GalleryImage[];
  /** Names the list for screen readers, e.g. "Zdjęcia gabinetu". */
  label: string;
  max?: number;
  pending?: boolean;
  error?: string | null;
  accept?: string;
  onAdd: (file: File) => void;
  onRemove: (id: string) => void;
  /** Every image id in the new order, first to last. */
  onReorder: (ids: string[]) => void;
  onSetMain: (id: string) => void;
  /** Optional per-image caption editor below its preview. */
  renderCaption?: (image: GalleryImage, index: number) => ReactNode;
  className?: string;
}

const instructions: ScreenReaderInstructions = {
  draggable:
    "Aby przenieść zdjęcie, naciśnij spację lub Enter. Strzałkami zmienisz jego miejsce, spacją lub Enterem je upuścisz, a Escape anuluje przenoszenie.",
};

function announcements(order: string[]): Announcements {
  const place = (id: string | number) => order.indexOf(String(id)) + 1;
  return {
    onDragStart: ({ active }) =>
      `Podniesiono zdjęcie ${place(active.id)} z ${order.length}.`,
    onDragOver: ({ active, over }) =>
      over
        ? `Zdjęcie ${place(active.id)} jest teraz nad miejscem ${place(over.id)}.`
        : undefined,
    onDragEnd: ({ active, over }) =>
      over
        ? `Zdjęcie ${place(active.id)} upuszczono na miejscu ${place(over.id)}.`
        : `Zdjęcie ${place(active.id)} odłożono.`,
    onDragCancel: ({ active }) =>
      `Anulowano przenoszenie zdjęcia ${place(active.id)}.`,
  };
}

function SortablePhoto({
  image,
  index,
  total,
  pending,
  instructionsId,
  onSetMain,
  onOpen,
  onRemove,
  caption,
}: {
  caption?: ReactNode;
  image: GalleryImage;
  index: number;
  total: number;
  pending: boolean;
  instructionsId: string;
  onSetMain: () => void;
  /** Shows it on the whole screen. */
  onOpen: () => void;
  onRemove: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: image.id, disabled: pending });
  const number = index + 1;

  return (
    <li
      className={cn(
        "group relative overflow-hidden rounded-[6px] border bg-[var(--surface)]",
        image.isMain
          ? "border-[var(--primary)] ring-2 ring-[var(--primary-soft)]"
          : "border-[var(--border)]",
        isDragging && "z-10 shadow-[var(--shadow-overlay)]",
      )}
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
    >
      <div className="relative aspect-[4/3] bg-[var(--surface-muted)]">
        <button
          aria-label={`Powiększ zdjęcie ${number}`}
          className="block size-full cursor-zoom-in focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:outline-none focus-visible:ring-inset"
          onClick={onOpen}
          type="button"
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- storage URLs of any size */}
          <img
            alt={`Zdjęcie ${number} z ${total}`}
            className="size-full object-cover"
            draggable={false}
            src={image.url}
          />
        </button>
        <span className="pointer-events-none absolute bottom-1 left-1 rounded-[4px] bg-[var(--surface)]/90 px-1.5 text-[0.6875rem] font-semibold text-[var(--text)] tabular-nums shadow-sm">
          {number}
        </span>
        {image.isMain ? (
          <span className="pointer-events-none absolute top-1 left-1 inline-flex h-5 items-center gap-1 rounded-[4px] bg-[var(--success-soft)] px-1.5 text-[0.6875rem] font-semibold text-[var(--success)] shadow-sm">
            <Star aria-hidden="true" className="size-3" />
            <span aria-hidden="true">Główne</span>
            <span className="sr-only">Zdjęcie główne</span>
          </span>
        ) : null}
        <div className="absolute top-1 right-1 flex gap-1">
          {image.isMain ? null : (
            <button
              aria-label={`Ustaw jako główne: zdjęcie ${number}`}
              className="flex size-7 items-center justify-center rounded-[5px] bg-[var(--surface)]/90 text-[var(--text)] shadow-sm hover:bg-[var(--surface)] focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
              disabled={pending}
              onClick={onSetMain}
              title="Ustaw jako główne"
              type="button"
            >
              <Star aria-hidden="true" className="size-3.5" />
            </button>
          )}
          <button
            aria-label={`Usuń zdjęcie ${number}`}
            className="flex size-7 items-center justify-center rounded-[5px] bg-[var(--surface)]/90 text-[var(--danger)] text-[var(--text)] shadow-sm hover:bg-[var(--surface)] focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
            disabled={pending}
            onClick={onRemove}
            title="Usuń"
            type="button"
          >
            <Trash2 aria-hidden="true" className="size-3.5" />
          </button>
          <button
            {...attributes}
            {...listeners}
            aria-describedby={instructionsId}
            aria-label={`Przesuń zdjęcie ${number}`}
            className="flex size-7 cursor-grab touch-none items-center justify-center rounded-[5px] bg-[var(--surface)]/90 text-[var(--text)] shadow-sm hover:bg-[var(--surface)] focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:outline-none active:cursor-grabbing disabled:cursor-not-allowed disabled:opacity-50"
            disabled={pending}
            ref={setActivatorNodeRef}
            title="Przeciągnij, aby zmienić kolejność"
            type="button"
          >
            <GripVertical aria-hidden="true" className="size-3.5" />
          </button>
        </div>
      </div>
      {caption}
    </li>
  );
}

/**
 * A small, compact photo gallery (e.g. a room's photos, beside its form):
 * one photo under another in a narrow column, their actions as icons on
 * them, a click shows one on the whole screen. Add up to `max`
 * photos, mark the main one, remove, and reorder by dragging — with the mouse, touch or
 * the keyboard (space to lift, arrows to move).
 */
export function SortableImageGallery({
  images,
  label,
  max = 5,
  pending = false,
  error,
  accept = "image/jpeg,image/png,image/webp",
  onAdd,
  onRemove,
  onReorder,
  onSetMain,
  renderCaption,
  className,
}: SortableImageGalleryProps) {
  const instructionsId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [removing, setRemoving] = useState<GalleryImage | null>(null);
  // The photo shown on the whole screen (its place in the order).
  const [viewing, setViewing] = useState<number | null>(null);
  // Follows the new order at once while the save is in flight.
  const [order, setOrder] = useState<string[] | null>(null);
  const ids = images.map((image) => image.id);
  const orderedIds =
    order &&
    order.length === ids.length &&
    order.every((id) => ids.includes(id))
      ? order
      : ids;
  const byId = new Map(images.map((image) => [image.id, image]));
  const ordered = orderedIds.flatMap((id) => byId.get(id) ?? []);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  function onDragEnd({ active, over }: DragEndEvent) {
    if (!over || active.id === over.id) return;
    const next = arrayMove(
      orderedIds,
      orderedIds.indexOf(String(active.id)),
      orderedIds.indexOf(String(over.id)),
    );
    setOrder(next);
    onReorder(next);
  }

  const full = images.length >= max;

  return (
    <div className={cn("space-y-2.5", className)}>
      <p className="sr-only" id={instructionsId}>
        {instructions.draggable}
      </p>
      <div className="flex items-center justify-between gap-3">
        <p className="text-[0.75rem] text-[var(--text-muted)] tabular-nums">
          {images.length} z {max} zdjęć
        </p>
        {full ? null : (
          <>
            <input
              accept={accept}
              aria-label="Dodaj zdjęcie: wybierz plik"
              className="sr-only"
              disabled={pending}
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) onAdd(file);
                event.target.value = "";
              }}
              ref={inputRef}
              tabIndex={-1}
              type="file"
            />
            <Button
              aria-label="Dodaj zdjęcie"
              className="h-[26px] px-2.5 text-[0.75rem]"
              loading={pending}
              onClick={() => inputRef.current?.click()}
              size="sm"
              variant="outline"
            >
              {pending ? null : (
                <ImagePlus className="size-3.5" aria-hidden="true" />
              )}
              Dodaj
            </Button>
          </>
        )}
      </div>

      {images.length === 0 ? (
        <p className="rounded-[6px] border border-dashed border-[var(--border-strong)] bg-[var(--surface-subtle)] p-4 text-center text-[0.8125rem] text-[var(--text-muted)]">
          Dodaj pierwsze zdjęcie. Pierwsze stanie się główne.
        </p>
      ) : (
        <DndContext
          accessibility={{
            announcements: announcements(orderedIds),
            screenReaderInstructions: instructions,
          }}
          collisionDetection={closestCenter}
          onDragEnd={onDragEnd}
          sensors={sensors}
        >
          <SortableContext items={orderedIds} strategy={rectSortingStrategy}>
            <ul aria-label={label} className="grid gap-2.5">
              {ordered.map((image, index) => (
                <SortablePhoto
                  image={image}
                  caption={renderCaption?.(image, index)}
                  index={index}
                  instructionsId={instructionsId}
                  key={image.id}
                  onRemove={() => setRemoving(image)}
                  onOpen={() => setViewing(index)}
                  onSetMain={() => onSetMain(image.id)}
                  pending={pending}
                  total={ordered.length}
                />
              ))}
            </ul>
          </SortableContext>
        </DndContext>
      )}

      <ImageLightbox
        images={ordered.map((image, index) => ({
          url: image.url,
          alt: `Zdjęcie ${index + 1} z ${ordered.length}`,
        }))}
        index={viewing}
        label={label}
        onIndexChange={setViewing}
      />

      {error ? (
        <p className="text-sm text-[var(--danger)]" role="alert">
          {error}
        </p>
      ) : null}

      <AlertDialog
        onOpenChange={(open) => {
          if (!open) setRemoving(null);
        }}
        open={removing !== null}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Usunąć zdjęcie?</AlertDialogTitle>
            <AlertDialogDescription>
              {removing?.isMain
                ? "To zdjęcie główne. Jego miejsce zajmie pierwsze z pozostałych."
                : "Zdjęcie zniknie z galerii i ze strony."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Anuluj</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (removing) onRemove(removing.id);
                setRemoving(null);
              }}
            >
              Usuń zdjęcie
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
