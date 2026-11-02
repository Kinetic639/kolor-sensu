/** Only asset selection: motion and brush direction are baked into each matte. */
export type CircularPaintVariant =
  | "rings"
  | "paired"
  | "sweep"
  | "spiral-out"
  | "spiral-in"
  | "pigment"
  | "brushed-wipe"
  | "star-trails";
export type CircularPaintDirection = "clockwise" | "counterclockwise";
export interface CircularPaintOptions {
  variant: CircularPaintVariant;
  direction: CircularPaintDirection;
  angle?: number;
  edgeBlur?: number;
}
export const circularPaintMap = (
  options: CircularPaintOptions,
  layer: "backdrop" | "photo" = "backdrop",
) =>
  options.variant === "star-trails"
    ? `/watercolor/circle-concepts/reveal-star-trails-${layer === "backdrop" ? (options.direction === "clockwise" ? "counterclockwise" : "clockwise") : options.direction}-v2.png`
    : options.variant === "pigment" || options.variant === "brushed-wipe"
      ? `/watercolor/circle-concepts/reveal-${options.variant}-v1.png`
      : `/watercolor/circle-concepts/reveal-${options.variant}-${options.direction}-${options.variant.startsWith("spiral-") ? "v2" : "v3"}.png`;

export function circularPaintSettings(options: CircularPaintOptions) {
  if (options.variant === "star-trails")
    return {
      backdropDuration: 0.8,
      photoAt: 0,
      photoDuration: 0.75,
      captionAt: 0.8,
      captionDuration: 0.12,
      sharpness: 110,
    };
  return options.variant === "pigment" || options.variant === "brushed-wipe"
    ? {
        backdropDuration: 0.2,
        photoAt: 0.22,
        photoDuration: 0.26,
        sharpness: options.variant === "pigment" ? 3 : 90,
      }
    : {
        backdropDuration: 1.4 / 6,
        photoAt: 1.42 / 6,
        photoDuration: 1.1 / 6,
        sharpness: 90,
      };
}
