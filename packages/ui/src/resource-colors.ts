// The colour of a room or specialist in schedules and lists. Plain
// functions (no "use client"): view-models on the server use them too.

const AUTOMATIC_COLORS = 6;

/** A stable number for an id, so its automatic colour never moves. */
function seedIndex(seed: string) {
  let hash = 0;
  for (const char of seed) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return hash;
}

/**
 * The accent (lines, dots, borders) and the light tint (block backgrounds)
 * of a room or specialist: their colour, or the automatic one — from their
 * id (the same everywhere), or from a position.
 */
export function resourceColors(color: string | null, seed: string | number) {
  if (color) {
    return {
      accent: color,
      tint: `color-mix(in srgb, ${color} 8%, var(--surface))`,
    };
  }
  const index = typeof seed === "number" ? seed : seedIndex(seed);
  const n = (index % AUTOMATIC_COLORS) + 1;
  return { accent: `var(--resource-${n})`, tint: `var(--resource-${n}-soft)` };
}

/** The colours a room lends the calendar (after the reference's room themes). */
export interface ScheduleTheme {
  /** Lines, dots, the card's left edge. */
  accent: string;
  /** Under white text (chips, initials): the accent, darker. */
  solid: string;
  /** The calm availability background and its edges. */
  availBg: string;
  availBorder: string;
  /** Visit cards. */
  cardBg: string;
  cardBorder: string;
  text: string;
  textMuted: string;
}

/**
 * A room's (or online's) calendar colours, from its colour or the automatic
 * one: the same accent everywhere, lighter and darker mixes of it.
 */
export function scheduleTheme(
  color: string | null,
  seed: string,
  online = false,
): ScheduleTheme {
  const accent = online ? "var(--online)" : resourceColors(color, seed).accent;
  return {
    accent,
    solid: `color-mix(in srgb, ${accent} 72%, black)`,
    availBg: `color-mix(in srgb, ${accent} 8%, var(--surface))`,
    availBorder: `color-mix(in srgb, ${accent} 18%, transparent)`,
    cardBg: `color-mix(in srgb, ${accent} 15%, var(--surface))`,
    cardBorder: `color-mix(in srgb, ${accent} 30%, var(--surface))`,
    text: `color-mix(in srgb, ${accent} 25%, var(--text))`,
    textMuted: `color-mix(in srgb, ${accent} 35%, var(--text))`,
  };
}
