"use client";

import { useState, type ReactNode } from "react";
import { WatercolorRevealDebugContext } from "@repo/ui/public-site/watercolor-reveal";

export function AnimationPreview({
  children,
  backgroundFrame = 0.65 / 6,
  photoFrame = 1.9 / 6,
}: {
  children: ReactNode;
  backgroundFrame?: number;
  photoFrame?: number;
}) {
  const [revision, setRevision] = useState(0);
  const [freezeAt, setFreezeAt] = useState<number>();
  const [slow, setSlow] = useState(false);
  function show(time?: number, slowly = false) {
    setSlow(slowly);
    setFreezeAt(time);
    setRevision((value) => value + 1);
  }
  return (
    <>
      <WatercolorRevealDebugContext.Provider
        key={revision}
        value={{
          freezeAt,
          onReveal: ({ timeline }) => {
            timeline.timeScale(slow ? 0.25 : 1);
          },
        }}
      >
        {children}
      </WatercolorRevealDebugContext.Provider>
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "center",
          gap: "0.65rem",
          marginTop: "1rem",
        }}
      >
        <button type="button" onClick={() => show()}>
          ↻ Powtórz
        </button>
        <button type="button" onClick={() => show(undefined, true)}>
          Powoli
        </button>
        <button type="button" onClick={() => show(backgroundFrame)}>
          Klatka tła
        </button>
        <button type="button" onClick={() => show(photoFrame)}>
          Klatka zdjęcia
        </button>
      </div>
    </>
  );
}
