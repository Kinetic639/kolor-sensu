import type { RoomSemanticColor, ScheduleAvailability } from "@repo/scheduling";

export interface RoomColorTokenFamily {
  surface: string;
  surfaceMuted: string;
  border: string;
  accent: string;
  foreground: string;
}

export type AvailabilityVisualVariant =
  RoomSemanticColor | "online" | "hybrid" | "unavailable";

const roomColorTokenFamilies: Record<RoomSemanticColor, RoomColorTokenFamily> =
  {
    sage: createRoomTokenFamily("sage"),
    peach: createRoomTokenFamily("peach"),
    lavender: createRoomTokenFamily("lavender"),
    sand: createRoomTokenFamily("sand"),
    blue: createRoomTokenFamily("blue"),
  };

export const availabilityVariantClasses: Record<
  AvailabilityVisualVariant,
  string
> = {
  sage: "border-[var(--schedule-sage-border)] bg-[var(--schedule-sage-surface-muted)] text-[var(--schedule-sage-foreground)] before:bg-[var(--schedule-sage-accent)]",
  peach:
    "border-[var(--schedule-peach-border)] bg-[var(--schedule-peach-surface-muted)] text-[var(--schedule-peach-foreground)] before:bg-[var(--schedule-peach-accent)]",
  lavender:
    "border-[var(--schedule-lavender-border)] bg-[var(--schedule-lavender-surface-muted)] text-[var(--schedule-lavender-foreground)] before:bg-[var(--schedule-lavender-accent)]",
  sand: "border-[var(--schedule-sand-border)] bg-[var(--schedule-sand-surface-muted)] text-[var(--schedule-sand-foreground)] before:bg-[var(--schedule-sand-accent)]",
  blue: "border-[var(--schedule-blue-border)] bg-[var(--schedule-blue-surface-muted)] text-[var(--schedule-blue-foreground)] before:bg-[var(--schedule-blue-accent)]",
  online:
    "border-[var(--schedule-online-border)] bg-[var(--schedule-online-surface-muted)] text-[var(--schedule-online-foreground)] before:bg-[var(--schedule-online-accent)]",
  hybrid:
    "border-[var(--schedule-hybrid-border)] bg-[var(--schedule-hybrid-surface-muted)] text-[var(--schedule-hybrid-foreground)] before:bg-[var(--schedule-hybrid-accent)] after:bg-[var(--schedule-hybrid-secondary-accent)]",
  unavailable:
    "border-[var(--border-strong)] bg-[var(--surface-muted)] text-[var(--text-muted)] before:bg-[var(--text-subtle)]",
};

export function getRoomColorTokenFamily(color: RoomSemanticColor) {
  return roomColorTokenFamilies[color];
}

export function getAvailabilityVisualVariant(
  availability: ScheduleAvailability | null | undefined,
): AvailabilityVisualVariant {
  if (!availability) return "unavailable";
  if (availability.kind === "room") return availability.roomColor;
  return availability.kind;
}

function createRoomTokenFamily(color: RoomSemanticColor): RoomColorTokenFamily {
  return {
    surface: `--schedule-${color}-surface`,
    surfaceMuted: `--schedule-${color}-surface-muted`,
    border: `--schedule-${color}-border`,
    accent: `--schedule-${color}-accent`,
    foreground: `--schedule-${color}-foreground`,
  };
}
