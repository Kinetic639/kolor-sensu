import type { CSSProperties } from "react";
import { WatercolorImage, type WatercolorImageProps } from "./watercolor-image";

export interface CircularWatercolorImageProps extends Omit<
  WatercolorImageProps,
  "shape" | "aspectRatio"
> {
  variant?: 1 | 2 | 3;
  /** Degrees of paint rotation; the photograph always remains upright. */
  rotation?: number;
  /** Gives repeated photos their own stable, hydration-safe variation. */
  variationKey?: string;
}

/** Stable random-looking appearance, without hydration changes or angle snapping. */
export function circularPaintAppearance(key: string) {
  let seed = 2166136261;
  for (const character of key)
    seed = Math.imul(seed ^ character.charCodeAt(0), 16777619) >>> 0;
  let angleSeed = 2166136261;
  for (const character of `paint-angle:${key}`)
    angleSeed = Math.imul(angleSeed ^ character.charCodeAt(0), 16777619) >>> 0;
  return {
    seed,
    variant: (Math.floor(seed / 360) % 3) + 1,
    rotation: (angleSeed % 360000) / 1000,
  };
}

export function CircularWatercolorImage({
  variant,
  rotation,
  variationKey,
  watercolorSrc,
  style,
  circularPaint,
  ...props
}: CircularWatercolorImageProps) {
  const src =
    typeof props.src === "string"
      ? props.src
      : "src" in props.src
        ? props.src.src
        : props.src.default.src;
  const appearance = circularPaintAppearance(variationKey ?? src);
  const { seed } = appearance;
  const selected = variant ?? appearance.variant;
  return (
    <WatercolorImage
      {...props}
      shape="circle"
      circularPaint={
        circularPaint ?? {
          variant: (["rings", "paired", "sweep"] as const)[
            Math.floor(seed / 720) % 3
          ]!,
          direction: seed % 2 ? "clockwise" : "counterclockwise",
          angle: seed % 360,
        }
      }
      watercolorSrc={
        watercolorSrc === undefined
          ? `/watercolor/circle-concepts/painted-circle-0${selected}.webp`
          : watercolorSrc
      }
      style={
        {
          ...style,
          "--ks-circle-rotation": `${rotation ?? appearance.rotation}deg`,
        } as CSSProperties
      }
    />
  );
}
