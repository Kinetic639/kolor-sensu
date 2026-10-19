"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { ChevronLeft, ChevronRight, Maximize2, X } from "lucide-react";
import Image from "next/image";
import { useState } from "react";
import { cn } from "../lib/utils";

export interface RoomGalleryPhoto {
  url: string;
  alt: string;
}

export interface RoomGalleryProps {
  /** Photos in display order; the first one is shown first (the main photo). */
  photos: RoomGalleryPhoto[];
  /** Names the gallery for screen readers, e.g. "Zdjęcia: Gabinet Zielony". */
  label: string;
  sizes?: string;
  className?: string;
}

/**
 * A room's photos: one large photo with previous / next buttons and a row of
 * thumbnails; "Powiększ zdjęcie" opens it over the page (a dialog: the arrow
 * keys step through the photos, Esc closes it and focus returns). A client
 * island on purpose: only the switching needs state.
 */
export function RoomGallery({
  photos,
  label,
  sizes = "(min-width: 1024px) 50vw, 100vw",
  className,
}: RoomGalleryProps) {
  const [index, setIndex] = useState(0);
  const [enlarged, setEnlarged] = useState(false);
  if (photos.length === 0) return null;

  const current = photos[Math.min(index, photos.length - 1)]!;
  const several = photos.length > 1;
  const show = (next: number) =>
    setIndex((next + photos.length) % photos.length);

  return (
    <section aria-label={label} className={cn("grid gap-3", className)}>
      <div className="rounded-card bg-beige relative aspect-[3/2] overflow-hidden">
        <Image
          alt={current.alt}
          className="object-cover"
          fill
          key={current.url}
          sizes={sizes}
          src={current.url}
        />
        <Dialog.Root onOpenChange={setEnlarged} open={enlarged}>
          <Dialog.Trigger asChild>
            <button
              aria-label="Powiększ zdjęcie"
              className="focus-visible:outline-ring absolute inset-0 flex cursor-zoom-in items-start justify-end p-3 focus-visible:outline-2 focus-visible:-outline-offset-4"
              type="button"
            >
              <span className="bg-surface/90 text-ink flex size-9 items-center justify-center rounded-full shadow-sm">
                <Maximize2 aria-hidden="true" className="size-4" />
              </span>
            </button>
          </Dialog.Trigger>
          <Dialog.Portal>
            <Dialog.Overlay className="bg-ink/80 fixed inset-0 z-50" />
            <Dialog.Content
              aria-describedby={undefined}
              className="fixed inset-0 z-50 grid place-items-center p-4 sm:p-10"
              onKeyDown={(event) => {
                if (!several) return;
                if (event.key === "ArrowRight") show(index + 1);
                if (event.key === "ArrowLeft") show(index - 1);
              }}
            >
              <Dialog.Title className="sr-only">{label}</Dialog.Title>
              <div className="relative h-full max-h-[85vh] w-full max-w-5xl">
                <Image
                  alt={current.alt}
                  className="object-contain"
                  fill
                  key={current.url}
                  sizes="100vw"
                  src={current.url}
                />
              </div>
              <Dialog.Close
                aria-label="Zamknij"
                className="bg-surface text-ink focus-visible:outline-ring absolute top-4 right-4 flex size-10 items-center justify-center rounded-full shadow-sm focus-visible:outline-2 focus-visible:outline-offset-2"
              >
                <X aria-hidden="true" className="size-5" />
              </Dialog.Close>
              {several ? (
                <>
                  <button
                    aria-label="Poprzednie zdjęcie"
                    className="bg-surface/90 text-ink focus-visible:outline-ring absolute top-1/2 left-4 flex size-10 -translate-y-1/2 items-center justify-center rounded-full shadow-sm focus-visible:outline-2 focus-visible:outline-offset-2"
                    onClick={() => show(index - 1)}
                    type="button"
                  >
                    <ChevronLeft className="size-5" aria-hidden="true" />
                  </button>
                  <button
                    aria-label="Następne zdjęcie"
                    className="bg-surface/90 text-ink focus-visible:outline-ring absolute top-1/2 right-4 flex size-10 -translate-y-1/2 items-center justify-center rounded-full shadow-sm focus-visible:outline-2 focus-visible:outline-offset-2"
                    onClick={() => show(index + 1)}
                    type="button"
                  >
                    <ChevronRight className="size-5" aria-hidden="true" />
                  </button>
                </>
              ) : null}
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>
        {several ? (
          <>
            <button
              aria-label="Poprzednie zdjęcie"
              className="bg-surface/90 text-ink focus-visible:outline-ring absolute top-1/2 left-3 flex size-10 -translate-y-1/2 items-center justify-center rounded-full shadow-sm focus-visible:outline-2 focus-visible:outline-offset-2"
              onClick={() => show(index - 1)}
              type="button"
            >
              <ChevronLeft className="size-5" aria-hidden="true" />
            </button>
            <button
              aria-label="Następne zdjęcie"
              className="bg-surface/90 text-ink focus-visible:outline-ring absolute top-1/2 right-3 flex size-10 -translate-y-1/2 items-center justify-center rounded-full shadow-sm focus-visible:outline-2 focus-visible:outline-offset-2"
              onClick={() => show(index + 1)}
              type="button"
            >
              <ChevronRight className="size-5" aria-hidden="true" />
            </button>
          </>
        ) : null}
      </div>
      {several ? (
        <ul className="grid grid-cols-5 gap-2">
          {photos.map((photo, photoIndex) => (
            <li key={photo.url}>
              <button
                aria-current={photoIndex === index ? "true" : undefined}
                aria-label={`Pokaż zdjęcie ${photoIndex + 1} z ${photos.length}`}
                className={cn(
                  "focus-visible:outline-ring relative block aspect-[3/2] w-full overflow-hidden rounded-md border-2 focus-visible:outline-2 focus-visible:outline-offset-2",
                  photoIndex === index
                    ? "border-primary"
                    : "border-transparent opacity-80 hover:opacity-100",
                )}
                onClick={() => setIndex(photoIndex)}
                type="button"
              >
                <Image
                  alt=""
                  className="object-cover"
                  fill
                  sizes="120px"
                  src={photo.url}
                />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
