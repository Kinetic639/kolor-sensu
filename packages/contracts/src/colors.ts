import { z } from "zod";

// Colours that tell rooms and specialists apart in schedules and lists.
// Stored as lowercase #rrggbb; null means "automatic" (by position).

/** `#RRGGBB` (or `#RGB`, with or without `#`), kept as lowercase `#rrggbb`. */
export const hexColorSchema = z
  .string()
  .trim()
  .transform((value) => value.replace(/^#/, "").toLowerCase())
  .refine((value) => /^([0-9a-f]{3}|[0-9a-f]{6})$/.test(value), {
    message: "Podaj kolor w formacie #RRGGBB.",
  })
  .transform((value) =>
    value.length === 3
      ? `#${[...value].map((digit) => digit + digit).join("")}`
      : `#${value}`,
  );

export interface PaletteColor {
  value: string;
  label: string;
}

/**
 * Ready colours, lively yet clear on a light background (at least 3:1, as
 * for graphics). The first six are also the automatic ones (--resource-1…6).
 */
export const COLOR_PALETTE: PaletteColor[] = [
  { value: "#16a34a", label: "Zieleń" },
  { value: "#ea580c", label: "Pomarańcz" },
  { value: "#7c3aed", label: "Fiolet" },
  { value: "#d97706", label: "Bursztyn" },
  { value: "#0891b2", label: "Cyjan" },
  { value: "#db2777", label: "Róż" },
  { value: "#2563eb", label: "Chaber" },
  { value: "#65a30d", label: "Limonka" },
  { value: "#dc2626", label: "Czerwień" },
  { value: "#c026d3", label: "Fuksja" },
  { value: "#0d9488", label: "Turkus" },
  { value: "#4f46e5", label: "Indygo" },
];

function channel(value: number) {
  const srgb = value / 255;
  return srgb <= 0.03928 ? srgb / 12.92 : ((srgb + 0.055) / 1.055) ** 2.4;
}

function luminance(hex: string) {
  const [r, g, b] = [1, 3, 5].map((at) =>
    channel(Number.parseInt(hex.slice(at, at + 2), 16)),
  ) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG contrast ratio of two `#rrggbb` colours (1–21). */
export function contrastRatio(first: string, second: string) {
  const [light, dark] = [luminance(first), luminance(second)].sort(
    (a, b) => b - a,
  ) as [number, number];
  return (light + 0.05) / (dark + 0.05);
}

/** Clear enough as a line, dot or border on white (3:1). */
export function isReadableOnLight(hex: string) {
  return contrastRatio(hex, "#ffffff") >= 3;
}
