"use client";

import { Crosshair } from "lucide-react";
import {
  useCallback,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
} from "react";
import { Button } from "./button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./dialog";
import {
  clampOffset,
  cropRect,
  MAX_ZOOM,
  zoomTo,
  type Point,
  type Size,
} from "./image-crop";
import { cn } from "./lib/utils";

const FRAME_WIDTH = 288;
const frames = {
  square: { width: FRAME_WIDTH, height: FRAME_WIDTH },
  portrait: { width: FRAME_WIDTH, height: (FRAME_WIDTH * 4) / 3 },
} as const;
/** Largest saved image; smaller crops are never upscaled. */
const outputs = {
  square: { width: 800, height: 800 },
  portrait: { width: 900, height: 1200 },
} as const;
const KEY_STEP = 10;
const KEY_STEP_LARGE = 40;
const ZOOM_STEP = 0.1;

export interface ImageCropDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The photo to crop: an object URL of a chosen file or a signed URL. */
  imageUrl: string | null;
  /** Square for avatars (shown as a circle), 3:4 for portraits. */
  aspect?: "square" | "portrait";
  title: string;
  description?: string;
  pending?: boolean;
  /** Receives the cropped photo as WebP (PNG where WebP cannot be encoded). */
  onConfirm: (image: Blob) => void;
}

function exportCrop(
  photo: HTMLImageElement,
  image: Size,
  aspect: "square" | "portrait",
  zoom: number,
  offset: Point,
): Promise<Blob> {
  const crop = cropRect(image, frames[aspect], zoom, offset);
  const width = Math.round(Math.min(outputs[aspect].width, crop.width));
  const height = Math.round(
    (width * frames[aspect].height) / frames[aspect].width,
  );
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) return Promise.reject(new Error("Canvas is not available"));
  context.imageSmoothingQuality = "high";
  context.drawImage(
    photo,
    crop.x,
    crop.y,
    crop.width,
    crop.height,
    0,
    0,
    width,
    height,
  );
  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Empty image"))),
      // WebP keeps a transparent background (JPEG would turn it black);
      // browsers that cannot encode WebP fall back to PNG, also transparent.
      "image/webp",
      0.9,
    ),
  );
}

/**
 * Lets the user choose which part of a photo is kept: drag (or use the arrow
 * keys) to move it, the slider (or +/−) to zoom. The photo always covers the
 * frame, so the result never has empty edges.
 */
export function ImageCropDialog({
  open,
  onOpenChange,
  imageUrl,
  aspect = "square",
  title,
  description = "Przeciągnij zdjęcie, aby wybrać widoczny fragment, i ustaw przybliżenie.",
  pending = false,
  onConfirm,
}: ImageCropDialogProps) {
  const frame = frames[aspect];
  const hintId = useId();
  const zoomId = useId();
  const photoRef = useRef<HTMLImageElement>(null);
  const drag = useRef<{ pointerId: number; last: Point } | null>(null);
  // Opened from code, not a DialogTrigger: return focus to what opened it.
  const returnFocus = useRef<HTMLElement | null>(null);
  const [image, setImage] = useState<Size | null>(null);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState<Point>({ x: 0, y: 0 });
  const [error, setError] = useState<string | null>(null);

  const moveBy = useCallback(
    (dx: number, dy: number) => {
      if (!image) return;
      setOffset((current) =>
        clampOffset(image, frame, zoom, {
          x: current.x + dx,
          y: current.y + dy,
        }),
      );
    },
    [frame, image, zoom],
  );

  function changeZoom(next: number) {
    if (!image) return;
    const result = zoomTo(image, frame, zoom, offset, next);
    setZoom(result.zoom);
    setOffset(result.offset);
  }

  function reset() {
    setZoom(1);
    setOffset({ x: 0, y: 0 });
  }

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const step = event.shiftKey ? KEY_STEP_LARGE : KEY_STEP;
    const moves: Record<string, [number, number]> = {
      ArrowUp: [0, -step],
      ArrowDown: [0, step],
      ArrowLeft: [-step, 0],
      ArrowRight: [step, 0],
    };
    const move = moves[event.key];
    if (move) {
      event.preventDefault();
      moveBy(...move);
    } else if (event.key === "+" || event.key === "=") {
      event.preventDefault();
      changeZoom(zoom + ZOOM_STEP);
    } else if (event.key === "-") {
      event.preventDefault();
      changeZoom(zoom - ZOOM_STEP);
    }
  }

  function onPointerDown(event: PointerEvent<HTMLDivElement>) {
    if (!image) return;
    event.currentTarget.setPointerCapture?.(event.pointerId);
    drag.current = {
      pointerId: event.pointerId,
      last: { x: event.clientX, y: event.clientY },
    };
  }

  function onPointerMove(event: PointerEvent<HTMLDivElement>) {
    const current = drag.current;
    if (!current || current.pointerId !== event.pointerId) return;
    moveBy(event.clientX - current.last.x, event.clientY - current.last.y);
    drag.current = { ...current, last: { x: event.clientX, y: event.clientY } };
  }

  function endDrag() {
    drag.current = null;
  }

  async function confirm() {
    const photo = photoRef.current;
    if (!photo || !image) return;
    setError(null);
    try {
      onConfirm(await exportCrop(photo, image, aspect, zoom, offset));
    } catch {
      setError(
        "Nie udało się przygotować zdjęcia. Spróbuj wybrać je ponownie.",
      );
    }
  }

  const scale = image
    ? Math.max(frame.width / image.width, frame.height / image.height) * zoom
    : 1;
  const shown = image
    ? { width: image.width * scale, height: image.height * scale }
    : null;

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent
        className="max-w-md"
        onCloseAutoFocus={(event) => {
          if (!returnFocus.current?.isConnected) return;
          event.preventDefault();
          returnFocus.current.focus();
        }}
        onOpenAutoFocus={() => {
          const active = document.activeElement;
          returnFocus.current =
            active instanceof HTMLElement && active !== document.body
              ? active
              : null;
        }}
      >
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div
          aria-describedby={hintId}
          aria-label="Kadr zdjęcia"
          className="relative mx-auto touch-none overflow-hidden rounded-[var(--radius-control)] bg-[var(--surface-muted)] select-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 focus-visible:outline-none"
          onKeyDown={onKeyDown}
          onLostPointerCapture={endDrag}
          onPointerCancel={endDrag}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          role="group"
          style={{
            width: frame.width,
            height: frame.height,
            cursor: image ? "move" : "default",
          }}
          tabIndex={0}
        >
          {imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- object or signed URLs drawn to a canvas
            <img
              alt=""
              className="pointer-events-none absolute max-w-none"
              crossOrigin="anonymous"
              data-testid="crop-photo"
              draggable={false}
              onError={() => setError("Nie udało się wczytać zdjęcia.")}
              onLoad={(event) => {
                const photo = event.currentTarget;
                setImage({
                  width: photo.naturalWidth,
                  height: photo.naturalHeight,
                });
                reset();
              }}
              ref={photoRef}
              src={imageUrl}
              style={
                shown
                  ? {
                      width: shown.width,
                      height: shown.height,
                      left: (frame.width - shown.width) / 2 + offset.x,
                      top: (frame.height - shown.height) / 2 + offset.y,
                    }
                  : { visibility: "hidden" }
              }
            />
          ) : null}
          {/* What stays visible: a circle for avatars, the frame for portraits. */}
          <div
            aria-hidden="true"
            className={cn(
              "pointer-events-none absolute inset-0 border-2 border-white/90 shadow-[0_0_0_9999px_rgb(15_39_71/0.45)]",
              aspect === "square" ? "rounded-full" : "rounded-[inherit]",
            )}
          />
        </div>

        <p
          className="-mt-2 text-center text-xs text-[var(--text-muted)]"
          id={hintId}
        >
          Strzałki przesuwają zdjęcie (z Shift szybciej), + i − zmieniają
          przybliżenie.
        </p>

        <div className="flex items-center gap-3">
          <label
            className="shrink-0 text-sm font-semibold text-[var(--text)]"
            htmlFor={zoomId}
          >
            Przybliżenie
          </label>
          <input
            className="h-2 w-full cursor-pointer accent-[var(--primary)]"
            disabled={!image}
            id={zoomId}
            max={MAX_ZOOM}
            min={1}
            onChange={(event) => changeZoom(Number(event.target.value))}
            step={0.01}
            type="range"
            value={zoom}
          />
          <Button disabled={!image} onClick={reset} size="sm" variant="outline">
            <Crosshair className="size-4" aria-hidden="true" />
            Wyśrodkuj
          </Button>
        </div>

        {error ? (
          <p className="text-sm text-[var(--danger)]" role="alert">
            {error}
          </p>
        ) : null}

        <DialogFooter>
          <Button onClick={() => onOpenChange(false)} variant="secondary">
            Anuluj
          </Button>
          <Button disabled={!image} loading={pending} onClick={confirm}>
            Zapisz kadr
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
