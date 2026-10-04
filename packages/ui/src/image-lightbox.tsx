"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import type { KeyboardEvent } from "react";
import { cn } from "./lib/utils";

// Photos on the whole screen: the one chosen large, on a dark ground, with
// the way to the previous and the next (the arrow keys too, round the
// set), where it is in the set, and Escape or "×" to close. A dialog:
// the focus stays inside and comes back where it was.

export interface LightboxImage {
  url: string;
  alt: string;
}

const NAV =
  "absolute top-1/2 grid size-11 -translate-y-1/2 place-items-center rounded-full bg-black/45 text-white hover:bg-black/65 focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none";

export function ImageLightbox({
  images,
  index,
  onIndexChange,
  label,
}: {
  images: LightboxImage[];
  /** The photo shown; null: closed. */
  index: number | null;
  /** Another photo, or null to close. */
  onIndexChange: (index: number | null) => void;
  /** The set's name, e.g. `Zdjęcia gabinetu`. */
  label: string;
}) {
  const open = index !== null && index < images.length;
  const current = open ? images[index]! : null;
  const many = images.length > 1;
  const go = (step: number) =>
    open && onIndexChange((index + step + images.length) % images.length);
  const onKeyDown = (event: KeyboardEvent) => {
    if (!many) return;
    if (event.key === "ArrowRight") go(1);
    else if (event.key === "ArrowLeft") go(-1);
    else return;
    event.preventDefault();
  };

  return (
    <Dialog.Root
      onOpenChange={(next) => {
        if (!next) onIndexChange(null);
      }}
      open={open}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/85 data-[state=open]:animate-[ks-fade-in_150ms_ease-out]" />
        <Dialog.Content
          aria-describedby={undefined}
          className="fixed inset-0 z-50 grid grid-rows-[auto_minmax(0,1fr)] outline-none"
          onKeyDown={onKeyDown}
        >
          <div className="flex items-center gap-3 px-4 py-3 text-white">
            <Dialog.Title className="text-[0.875rem] font-medium">
              {label}
            </Dialog.Title>
            {current ? (
              <span className="text-[0.8125rem] text-white/70 tabular-nums">
                {index! + 1} z {images.length}
              </span>
            ) : null}
            <Dialog.Close
              aria-label="Zamknij podgląd"
              className="ml-auto grid size-9 place-items-center rounded-full text-white hover:bg-white/15 focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none"
            >
              <X aria-hidden="true" className="size-5" />
            </Dialog.Close>
          </div>
          <div className="relative grid min-h-0 place-items-center px-4 pb-6 sm:px-16">
            {current ? (
              // eslint-disable-next-line @next/next/no-img-element -- storage URLs of any size
              <img
                alt={current.alt}
                className="max-h-full max-w-full rounded-[4px] object-contain shadow-2xl select-none"
                draggable={false}
                src={current.url}
              />
            ) : null}
            {many ? (
              <>
                <button
                  aria-label="Poprzednie zdjęcie"
                  className={cn(NAV, "left-2 sm:left-4")}
                  onClick={() => go(-1)}
                  type="button"
                >
                  <ChevronLeft aria-hidden="true" className="size-6" />
                </button>
                <button
                  aria-label="Następne zdjęcie"
                  className={cn(NAV, "right-2 sm:right-4")}
                  onClick={() => go(1)}
                  type="button"
                >
                  <ChevronRight aria-hidden="true" className="size-6" />
                </button>
              </>
            ) : null}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
