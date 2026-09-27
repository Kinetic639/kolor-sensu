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
import { useId, useRef, useState } from "react";
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
import { Badge } from "./badge";
import { Button } from "./button";
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
  onRemove,
}: {
  image: GalleryImage;
  index: number;
  total: number;
  pending: boolean;
  instructionsId: string;
  onSetMain: () => void;
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
        "group relative overflow-hidden rounded-[var(--radius-control)] border bg-[var(--surface)]",
        image.isMain
          ? "border-[var(--primary)] ring-2 ring-[var(--primary-soft)]"
          : "border-[var(--border)]",
        isDragging && "z-10 shadow-[var(--shadow-overlay)]",
      )}
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
    >
      <div className="relative aspect-[3/2] bg-[var(--surface-muted)]">
        {/* eslint-disable-next-line @next/next/no-img-element -- storage URLs of any size */}
        <img
          alt={`Zdjęcie ${number} z ${total}`}
          className="size-full object-cover"
          draggable={false}
          src={image.url}
        />
        {image.isMain ? (
          <Badge className="absolute top-2 left-2" variant="success">
            <Star className="size-3" aria-hidden="true" />
            Zdjęcie główne
          </Badge>
        ) : null}
        <button
          {...attributes}
          {...listeners}
          aria-describedby={instructionsId}
          aria-label={`Przesuń zdjęcie ${number}`}
          className="absolute top-2 right-2 flex size-9 cursor-grab touch-none items-center justify-center rounded-[var(--radius-control)] bg-[var(--surface)]/90 text-[var(--text)] shadow-sm focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:outline-none active:cursor-grabbing disabled:cursor-not-allowed disabled:opacity-50"
          disabled={pending}
          ref={setActivatorNodeRef}
          type="button"
        >
          <GripVertical className="size-4" aria-hidden="true" />
        </button>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 p-2">
        <span className="text-xs font-semibold text-[var(--text-muted)]">
          {number}.
        </span>
        <div className="flex flex-wrap gap-1.5">
          {image.isMain ? null : (
            <Button
              aria-label={`Ustaw jako główne: zdjęcie ${number}`}
              disabled={pending}
              onClick={onSetMain}
              size="sm"
              variant="outline"
            >
              <Star className="size-4" aria-hidden="true" />
              Główne
            </Button>
          )}
          <Button
            aria-label={`Usuń zdjęcie ${number}`}
            className="text-[var(--danger)]"
            disabled={pending}
            onClick={onRemove}
            size="sm"
            variant="outline"
          >
            <Trash2 className="size-4" aria-hidden="true" />
            Usuń
          </Button>
        </div>
      </div>
    </li>
  );
}

/**
 * A small photo gallery (e.g. a room's photos): add up to `max` photos, mark
 * the main one, remove, and reorder by dragging — with the mouse, touch or
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
  className,
}: SortableImageGalleryProps) {
  const instructionsId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [removing, setRemoving] = useState<GalleryImage | null>(null);
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
    <div className={cn("space-y-3", className)}>
      <p className="sr-only" id={instructionsId}>
        {instructions.draggable}
      </p>
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-[var(--text-muted)]">
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
              loading={pending}
              onClick={() => inputRef.current?.click()}
              size="sm"
              variant="secondary"
            >
              {pending ? null : (
                <ImagePlus className="size-4" aria-hidden="true" />
              )}
              Dodaj zdjęcie
            </Button>
          </>
        )}
      </div>

      {images.length === 0 ? (
        <p className="rounded-[var(--radius-control)] border border-dashed border-[var(--border-strong)] bg-[var(--surface-subtle)] p-6 text-center text-sm text-[var(--text-muted)]">
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
            <ul
              aria-label={label}
              className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3"
            >
              {ordered.map((image, index) => (
                <SortablePhoto
                  image={image}
                  index={index}
                  instructionsId={instructionsId}
                  key={image.id}
                  onRemove={() => setRemoving(image)}
                  onSetMain={() => onSetMain(image.id)}
                  pending={pending}
                  total={ordered.length}
                />
              ))}
            </ul>
          </SortableContext>
        </DndContext>
      )}

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
