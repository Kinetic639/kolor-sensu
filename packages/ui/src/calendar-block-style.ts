import type { MinuteRange } from "@repo/scheduling";
import type { CSSProperties } from "react";

// How calendar blocks look and where they sit (K2), shared by the client
// grid (drag-to-create) and the server-rendered calendar views: no
// "use client", no measuring, positions as percentages of the day shown.

export type CalendarBlockVariant =
  "availability" | "appointment" | "blocked" | "closed" | "taken" | "preview";

export const CALENDAR_BLOCK_CLASSES: Record<CalendarBlockVariant, string> = {
  availability:
    "inset-x-1 rounded-[var(--radius-control)] border border-l-[5px] border-[color-mix(in_srgb,var(--block-accent)_18%,transparent)] border-l-[var(--block-accent)] bg-[var(--block-tint)] shadow-sm",
  appointment:
    "inset-x-2 rounded-[var(--radius-control)] border border-l-4 border-[var(--border-strong)] border-l-[var(--block-accent)] bg-[var(--surface)] shadow-sm",
  blocked:
    "inset-x-1 rounded-[var(--radius-control)] border border-dashed border-[var(--border-strong)] bg-[repeating-linear-gradient(135deg,var(--surface-muted)_0_6px,transparent_6px_12px)]",
  // Hours a room is closed: a background band under the other blocks.
  closed:
    "pointer-events-none inset-x-0 z-0 bg-[repeating-linear-gradient(135deg,var(--surface-muted)_0_6px,transparent_6px_12px)] p-1.5 text-[0.625rem] font-medium text-[var(--text-subtle)]",
  // Someone else's hours (e.g. a colleague in the room): behind one's own
  // blocks, and not in the way of dragging.
  taken:
    "pointer-events-none inset-x-1 z-0 rounded-[var(--radius-control)] border border-dashed border-[color-mix(in_srgb,var(--block-accent)_55%,transparent)] bg-[repeating-linear-gradient(135deg,color-mix(in_srgb,var(--block-accent)_12%,transparent)_0_6px,transparent_6px_12px)] p-1.5",
  preview:
    "pointer-events-none inset-x-1 z-30 rounded-[var(--radius-control)] border-2 border-dashed border-[var(--primary)] bg-[color-mix(in_srgb,var(--primary)_18%,transparent)] shadow-lg",
};

/** Top and height in a day column, with the block's colours. */
export function blockStyle({
  range,
  start,
  end,
  accent,
  tint,
}: MinuteRange & { range: MinuteRange; accent: string; tint: string }) {
  const total = range.end - range.start;
  return {
    top: `${((start - range.start) / total) * 100}%`,
    height: `${((end - start) / total) * 100}%`,
    "--block-accent": accent,
    "--block-tint": tint,
  } as CSSProperties;
}
