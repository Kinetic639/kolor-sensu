"use client";

import type { SectionHeaderContent } from "@repo/contracts/section-header";
import { ChevronLeft, ChevronRight } from "lucide-react";
import Image from "next/image";
import {
  type KeyboardEvent,
  type PointerEvent,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { cn } from "../lib/utils";
import { SectionHeader } from "./section-header";

// The banner shows one room's prints at a time. The buttons and arrow keys
// switch rooms; touch and mouse dragging browse photos within the current room.
// With one room there are no navigation buttons, even if it has many photos.

export interface RoomsPeekPhoto {
  roomId?: string;
  url: string;
  alt: string;
  /** The room's name, under its photo. */
  room: string;
  description?: string;
}

export interface RoomsPeekProps {
  header: SectionHeaderContent;
  photos: readonly RoomsPeekPhoto[];
  className?: string;
}

/** Each group is one published room, with all of its photos. */
export function RoomsPeek({ header, photos, className }: RoomsPeekProps) {
  const headingId = useId();
  const row = useRef<HTMLDivElement>(null);
  const transitionVersion = useRef(0);
  const previousRoom = useRef(0);
  const pendingRoom = useRef<number | null>(null);
  const exitAnimation = useRef<Animation | null>(null);
  const drag = useRef<{ x: number; left: number } | null>(null);
  const lifted = useRef<{
    source: HTMLElement;
    element: HTMLElement;
    animation: Animation;
    sourceAnimation: Animation;
  } | null>(null);
  const returning = useRef(
    new Map<HTMLElement, NonNullable<typeof lifted.current>>(),
  );
  useEffect(
    () => () => {
      for (const current of returning.current.values()) {
        current.animation.cancel();
        current.sourceAnimation.cancel();
        current.element.remove();
      }
      transitionVersion.current++;
      exitAnimation.current?.cancel();
      lifted.current?.animation.cancel();
      lifted.current?.sourceAnimation.cancel();
      row.current
        ?.querySelectorAll(".ks-peek__lift")
        .forEach((element) => element.remove());
    },
    [],
  );
  const lowerPhoto = () => {
    const current = lifted.current;
    if (!current) return;
    current.animation.reverse();
    current.sourceAnimation.reverse();
    returning.current.set(current.source, current);
    current.animation.onfinish = () => {
      returning.current.delete(current.source);
      current.element.remove();
      current.sourceAnimation.cancel();
    };
    lifted.current = null;
  };
  const liftPhoto = (source: HTMLElement) => {
    if (
      lifted.current?.source === source ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    )
      return;
    lowerPhoto();
    const previous = returning.current.get(source);
    if (previous) {
      returning.current.delete(source);
      previous.animation.onfinish = null;
      previous.animation.reverse();
      previous.sourceAnimation.reverse();
      lifted.current = previous;
      return;
    }
    const list = source.closest("ul");
    if (!list) return;
    const bounds = source.getBoundingClientRect();
    const parent = list.getBoundingClientRect();
    const element = source.cloneNode(true) as HTMLElement;
    element.classList.add("ks-peek__lift");
    element.setAttribute("aria-hidden", "true");
    element.inert = true;
    element.removeAttribute("tabindex");
    const style = getComputedStyle(source);
    const angle = style.rotate;
    const width = parseFloat(style.width);
    const height = parseFloat(style.height);
    Object.assign(element.style, {
      width: width + "px",
      height: height + "px",
      left: bounds.left + bounds.width / 2 - parent.left - width / 2 + "px",
      top: bounds.top + bounds.height / 2 - parent.top - height / 2 + "px",
      rotate: "none",
    });
    list.append(element);
    const from = "rotate(" + (angle === "none" ? "0deg" : angle) + ") scale(1)";
    const to = `translateY(-${height * 0.05}px) rotate(0deg) scale(1.10)`;
    const options: KeyframeAnimationOptions = {
      duration: 300,
      easing: "cubic-bezier(0.22, 1, 0.36, 1)",
      fill: "both",
    };
    const animation = element.animate(
      [
        { opacity: 0, transform: from },
        { opacity: 1, transform: to },
      ],
      options,
    );
    // Both prints follow identical geometry. Keep the lower one opaque so
    // there is neither a translucent flash nor an old tilted corner below it.
    const sourceAnimation = source.animate(
      [
        { rotate: "none", transform: from },
        { rotate: "none", transform: to },
      ],
      options,
    );
    lifted.current = { source, element, animation, sourceAnimation };
  };
  const [activeRoom, setActiveRoom] = useState(0);
  const byRoom = new Map<string, RoomsPeekPhoto[]>();
  for (const photo of photos) {
    const key = photo.roomId ?? photo.room;
    const group = byRoom.get(key) ?? [];
    group.push(photo);
    byRoom.set(key, group);
  }
  const groups = [...byRoom.values()];
  const current = groups[activeRoom % Math.max(groups.length, 1)] ?? [];
  useLayoutEffect(() => {
    if (previousRoom.current === activeRoom) return;
    previousRoom.current = activeRoom;
    pendingRoom.current = null;
    exitAnimation.current?.cancel();
    if (
      !row.current?.animate ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    )
      return;
    row.current
      ?.querySelectorAll<HTMLElement>(".ks-peek__item")
      .forEach((item, index) => {
        item.animate(
          [
            { opacity: 0, transform: "translateY(12px) scale(0.98)" },
            { opacity: 1, transform: "translateY(0) scale(1)" },
          ],
          {
            duration: 340,
            delay: Math.min(index, 5) * 30,
            easing: "cubic-bezier(0.22, 1, 0.36, 1)",
            fill: "backwards",
          },
        );
      });
  }, [activeRoom]);
  if (photos.length === 0) return null;

  const selectRoom = (index: number) => {
    const version = ++transitionVersion.current;
    exitAnimation.current?.cancel();
    lowerPhoto();
    pendingRoom.current = index;
    const list = row.current?.querySelector("ul");
    const show = () => {
      if (version !== transitionVersion.current) return;
      for (const returningPhoto of returning.current.values()) {
        returningPhoto.animation.cancel();
        returningPhoto.sourceAnimation.cancel();
        returningPhoto.element.remove();
      }
      returning.current.clear();
      setActiveRoom(index);
      if (row.current) row.current.scrollLeft = 0;
      endDrag();
    };
    if (
      index === activeRoom ||
      !list?.animate ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      pendingRoom.current = null;
      show();
      return;
    }
    const animation = list.animate(
      [
        { opacity: 1, transform: "translateY(0)" },
        { opacity: 0, transform: "translateY(-8px)" },
      ],
      { duration: 260, easing: "ease-in", fill: "forwards" },
    );
    exitAnimation.current = animation;
    void animation.finished.then(show).catch(() => {});
  };
  const move = (direction: -1 | 1) => {
    if (groups.length < 2) return;
    selectRoom(
      ((pendingRoom.current ?? activeRoom) + direction + groups.length) %
        groups.length,
    );
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
    <section aria-labelledby={headingId} className={cn("ks-peek", className)}>
      <div className="ks-peek__paint" aria-hidden="true" />
      <div className="ks-peek__inner max-w-page px-gutter mx-auto">
        <SectionHeader
          className="ks-peek__copy"
          content={header}
          id={headingId}
          size="h2"
        />
        <div className="ks-peek__gallery">
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
              {current.map((photo, index) => (
                <li className="ks-peek__item" key={`${photo.url}-${index}`}>
                  <figure
                    className="ks-peek__print"
                    tabIndex={0}
                    aria-label={photo.room}
                    title={photo.room}
                    onPointerEnter={(event) => {
                      if (event.pointerType === "mouse")
                        liftPhoto(event.currentTarget);
                    }}
                    onPointerLeave={(event) => {
                      if (!event.currentTarget.matches(":focus-within"))
                        lowerPhoto();
                    }}
                    onFocus={(event) => liftPhoto(event.currentTarget)}
                    onBlur={lowerPhoto}
                  >
                    <div className="relative aspect-[4/5] overflow-hidden rounded-[0.25rem]">
                      <Image
                        alt={photo.alt}
                        className="object-cover"
                        draggable={false}
                        fill
                        sizes="(min-width: 1024px) 14rem, 70vw"
                        src={photo.url}
                      />
                    </div>
                    <figcaption className="ks-peek__photo-caption text-small text-text-muted pt-2 text-center">
                      {photo.description ? (
                        <span className="ks-peek__description">
                          {photo.description}
                        </span>
                      ) : null}
                      <span className="ks-peek__photo-room">{photo.room}</span>
                    </figcaption>
                  </figure>
                </li>
              ))}
            </ul>
          </div>
          {groups.length > 1 ? (
            <div className="ks-peek__controls">
              <span className="sr-only" aria-live="polite" aria-atomic="true">
                {current[0]?.room} · {(activeRoom % groups.length) + 1}/
                {groups.length}
              </span>
              <div
                className="ks-peek__dots"
                role="group"
                aria-label="Wybierz gabinet"
              >
                {groups.map((group, index) => (
                  <button
                    key={group[0]?.roomId ?? group[0]?.room}
                    type="button"
                    className="ks-peek__dot"
                    aria-label={`Pokaż gabinet: ${group[0]?.room}`}
                    aria-current={
                      index === activeRoom % groups.length ? "true" : undefined
                    }
                    onClick={() => selectRoom(index)}
                  >
                    <span className="ks-peek__dot-mark" aria-hidden="true" />
                  </button>
                ))}
              </div>
              <div className="ks-peek__arrows flex gap-2">
                <button
                  aria-label="Poprzedni gabinet"
                  className="bg-surface text-ink focus-visible:outline-ring flex size-9 items-center justify-center rounded-full shadow-sm focus-visible:outline-2 focus-visible:outline-offset-2"
                  onClick={() => move(-1)}
                  type="button"
                >
                  <ChevronLeft aria-hidden="true" className="size-4" />
                </button>
                <button
                  aria-label="Następny gabinet"
                  className="bg-surface text-ink focus-visible:outline-ring flex size-9 items-center justify-center rounded-full shadow-sm focus-visible:outline-2 focus-visible:outline-offset-2"
                  onClick={() => move(1)}
                  type="button"
                >
                  <ChevronRight aria-hidden="true" className="size-4" />
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
