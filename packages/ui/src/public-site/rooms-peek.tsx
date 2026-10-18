"use client";

import type { SectionHeaderContent } from "@repo/contracts/section-header";
import { ChevronLeft, ChevronRight } from "lucide-react";
import Image from "next/image";
import { type KeyboardEvent, type PointerEvent, useId, useRef } from "react";
import { cn } from "../lib/utils";
import { SectionHeader } from "./section-header";

// Home → "Zajrzyj do środka": the rooms' photos (the same as on Gabinety)
// as a row of slightly tilted prints, moved along with a finger (the
// browser's own scrolling), by dragging with the mouse, with the arrow
// keys once the row has focus, or with the two buttons. Under reduced
// motion the prints sit straight and the row jumps instead of gliding
// (public-site.css, .ks-peek). Without photos it shows nothing.
//
//   section   aria-labelledby → the header's title
//   ├── header  eyebrow, h2 title, description, "Zobacz nasze gabinety"
//   ├── div     the scrolling row (focusable), a list of figures
//   └── div     previous / next buttons

export interface RoomsPeekPhoto {
  url: string;
  alt: string;
  /** The room's name, under its photo. */
  room: string;
}

export interface RoomsPeekProps {
  header: SectionHeaderContent;
  photos: readonly RoomsPeekPhoto[];
  className?: string;
}

/** How far one press moves the row: most of what is in view. */
const step = (row: HTMLElement) => Math.max(row.clientWidth * 0.8, 240);

export function RoomsPeek({ header, photos, className }: RoomsPeekProps) {
  const headingId = useId();
  const row = useRef<HTMLDivElement>(null);
  const drag = useRef<{ x: number; left: number } | null>(null);
  if (photos.length === 0) return null;

  const move = (direction: -1 | 1) => {
    const element = row.current;
    if (element) element.scrollBy({ left: direction * step(element) });
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
      event.preventDefault();
      move(event.key === "ArrowRight" ? 1 : -1);
    }
  };

  // A mouse drags the row; touch and pens scroll it natively.
  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (event.pointerType !== "mouse" || !row.current) return;
    drag.current = { x: event.clientX, left: row.current.scrollLeft };
    row.current.dataset.dragging = "";
  };
  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!drag.current || !row.current) return;
    row.current.scrollLeft =
      drag.current.left - (event.clientX - drag.current.x);
  };
  const endDrag = () => {
    drag.current = null;
    if (row.current) delete row.current.dataset.dragging;
  };

  return (
    <section
      aria-labelledby={headingId}
      className={cn(
        "ks-peek max-w-page py-section-sm mx-auto grid gap-8",
        className,
      )}
    >
      <SectionHeader
        className="px-gutter"
        content={header}
        id={headingId}
        size="h2"
      />
      <div
        className="ks-peek__row"
        onKeyDown={onKeyDown}
        onPointerCancel={endDrag}
        onPointerDown={onPointerDown}
        onPointerLeave={endDrag}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        ref={row}
        // Focusable so the arrow keys move it (its list is named).
        tabIndex={0}
      >
        <ul aria-label="Zdjęcia gabinetów" className="ks-peek__list">
          {photos.map((photo) => (
            <li className="ks-peek__item" key={photo.url}>
              <figure className="ks-peek__print">
                <div className="relative aspect-[4/5] overflow-hidden rounded-[0.5rem]">
                  <Image
                    alt={photo.alt}
                    className="object-cover"
                    draggable={false}
                    fill
                    sizes="(min-width: 1024px) 18rem, 70vw"
                    src={photo.url}
                  />
                </div>
                <figcaption className="text-small text-text-muted pt-2 text-center">
                  {photo.room}
                </figcaption>
              </figure>
            </li>
          ))}
        </ul>
      </div>
      {photos.length > 1 ? (
        <div className="px-gutter flex justify-end gap-2">
          <button
            aria-label="Poprzednie zdjęcia"
            className="bg-surface text-ink focus-visible:outline-ring flex size-10 items-center justify-center rounded-full shadow-sm focus-visible:outline-2 focus-visible:outline-offset-2"
            onClick={() => move(-1)}
            type="button"
          >
            <ChevronLeft aria-hidden="true" className="size-5" />
          </button>
          <button
            aria-label="Następne zdjęcia"
            className="bg-surface text-ink focus-visible:outline-ring flex size-10 items-center justify-center rounded-full shadow-sm focus-visible:outline-2 focus-visible:outline-offset-2"
            onClick={() => move(1)}
            type="button"
          >
            <ChevronRight aria-hidden="true" className="size-5" />
          </button>
        </div>
      ) : null}
    </section>
  );
}
