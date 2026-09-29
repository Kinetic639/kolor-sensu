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
