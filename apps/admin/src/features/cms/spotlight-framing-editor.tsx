"use client";

import { useRef, useState, type CSSProperties } from "react";
import type {
  SpecialistBackground,
  SpotlightFraming,
} from "@repo/contracts/cms";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@repo/ui/dialog";
import { Button } from "@repo/ui/button";

const initial: SpotlightFraming = { x: 0, y: 0, zoom: 1 };
const clamp = (value: number) =>
  Math.max(-25, Math.min(25, Math.round(value * 100) / 100));

export function SpotlightFramingEditor({
  imageUrl,
  background,
  portraitFraming,
  backgroundFraming,
  onClose,
  onConfirm,
}: {
  imageUrl: string | null;
  background: SpecialistBackground;
  portraitFraming?: SpotlightFraming;
  backgroundFraming?: SpotlightFraming;
  onClose: () => void;
  onConfirm: (values: {
    portraitFraming: SpotlightFraming;
    backgroundFraming: SpotlightFraming;
  }) => void;
}) {
  const [portrait, setPortrait] = useState(portraitFraming ?? initial);
  const [paint, setPaint] = useState(backgroundFraming ?? initial);
  const [target, setTarget] = useState<"portrait" | "paint">("portrait");
  const drag = useRef<{ x: number; y: number } | null>(null);
  const current = target === "portrait" ? portrait : paint;
  const update = (patch: Partial<SpotlightFraming>) =>
    (target === "portrait" ? setPortrait : setPaint)((old) => ({
      ...old,
      ...patch,
    }));
  const paintStyle: CSSProperties = {
    position: "absolute",
    inset: 0,
    width: "100%",
    height: "100%",
    objectFit: "fill",
    transformOrigin: "top center",
    transform: `translate(${paint.x}%, ${paint.y + (background === "06b" ? -4 : 0)}%) scale(${paint.zoom}) scaleY(.94)`,
    pointerEvents: "none",
  };
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="max-h-[95dvh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Dopasuj portret i tło</DialogTitle>
          <DialogDescription>
            Wybierz warstwę i przeciągnij ją w podglądzie lub użyj suwaków.
            Zmiany nie modyfikują plików źródłowych.
          </DialogDescription>
        </DialogHeader>
        <div className="grid items-center gap-5 sm:grid-cols-2">
          <div
            aria-label={`Przesuwanie: ${target === "portrait" ? "portret" : "tło"}`}
            role="group"
            tabIndex={0}
            className="relative mx-auto w-56 cursor-move touch-none rounded-xl bg-[#f8f7f3] outline-offset-4"
            style={{ aspectRatio: "3/4" }}
            onPointerDown={(e) => {
              e.currentTarget.setPointerCapture(e.pointerId);
              drag.current = { x: e.clientX, y: e.clientY };
            }}
            onPointerUp={() => {
              drag.current = null;
            }}
            onPointerCancel={() => {
              drag.current = null;
            }}
            onPointerMove={(e) => {
              if (!drag.current) return;
              const box = e.currentTarget.getBoundingClientRect();
              const dx = ((e.clientX - drag.current.x) / box.width) * 100;
              const dy = ((e.clientY - drag.current.y) / box.height) * 100;
              (target === "portrait" ? setPortrait : setPaint)((old) => ({
                ...old,
                x: clamp(old.x + dx),
                y: clamp(old.y + dy),
              }));
              drag.current = { x: e.clientX, y: e.clientY };
            }}
            onKeyDown={(e) => {
              const moves: Record<string, [number, number]> = {
                ArrowLeft: [-1, 0],
                ArrowRight: [1, 0],
                ArrowUp: [0, -1],
                ArrowDown: [0, 1],
              };
              const move = moves[e.key];
              if (move) {
                e.preventDefault();
                update({
                  x: clamp(current.x + move[0]),
                  y: clamp(current.y + move[1]),
                });
              }
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- local editor layers, no exported canvas */}
            <img
              alt=""
              src={`/specialist-backgrounds/${background}.webp`}
              style={paintStyle}
            />
            <div
              style={{
                position: "absolute",
                inset: 0,
                maskImage:
                  "url('/specialist-backgrounds/portrait-dissolve.png')",
                maskSize: "100% 100%",
                pointerEvents: "none",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  top: "9%",
                  width: "100%",
                  aspectRatio: "4/5",
                }}
              >
                {imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element -- signed preview URL
                  <img
                    alt="Podgląd portretu"
                    draggable={false}
                    src={imageUrl}
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "contain",
                      objectPosition: "50% 0",
                      transform: `translate(${portrait.x}%, ${portrait.y}%) scale(${portrait.zoom})`,
                    }}
                  />
                ) : (
                  <p className="p-4 text-center text-xs">
                    Dodaj zdjęcie, aby zobaczyć portret.
                  </p>
                )}
              </div>
            </div>
          </div>
          <div className="grid gap-4">
            <fieldset className="flex gap-3 text-sm">
              <legend className="mb-2 font-medium">Edytowana warstwa</legend>
              <label>
                <input
                  type="radio"
                  name="framing-layer"
                  checked={target === "portrait"}
                  onChange={() => setTarget("portrait")}
                />{" "}
                Portret
              </label>
              <label>
                <input
                  type="radio"
                  name="framing-layer"
                  checked={target === "paint"}
                  onChange={() => setTarget("paint")}
                />{" "}
                Tło
              </label>
            </fieldset>
            {(
              [
                ["x", "Przesunięcie w poziomie", -25, 25, 1],
                ["y", "Przesunięcie w pionie", -25, 25, 1],
                ["zoom", "Skala", 0.65, 1.6, 0.01],
              ] as const
            ).map(([key, label, min, max, step]) => (
              <label className="grid gap-2 text-sm" key={key}>
                <span>
                  {label}:{" "}
                  {key === "zoom"
                    ? `${Math.round(current.zoom * 100)}%`
                    : `${current[key]}%`}
                </span>
                <input
                  aria-label={label}
                  type="range"
                  min={min}
                  max={max}
                  step={step}
                  value={current[key]}
                  onChange={(e) => update({ [key]: Number(e.target.value) })}
                />
              </label>
            ))}
            <Button
              type="button"
              variant="outline"
              onClick={() => update(initial)}
            >
              Przywróć tę warstwę
            </Button>
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Anuluj
          </Button>
          <Button
            type="button"
            onClick={() =>
              onConfirm({ portraitFraming: portrait, backgroundFraming: paint })
            }
          >
            Zastosuj kadrowanie
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
