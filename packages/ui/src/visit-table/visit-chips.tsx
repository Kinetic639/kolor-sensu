import type { VisitRow, VisitTone } from "@repo/scheduling";
import type { ReactNode } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "../avatar";
import { cn } from "../lib/utils";
import { scheduleTheme } from "../resource-colors";

// The small labels a visit is shown with, the same in the bookings table
// and its side panel: a state as a coloured tag, the specialist as a chip
// in their colour with their picture, the room in its colour. A cancelled
// visit's are muted (grey, not see-through: still legible).

const TAG: Record<VisitTone, string> = {
  success: "bg-[var(--success-soft)] text-[var(--success)]",
  warning: "bg-[var(--warning-soft)] text-[var(--warning-foreground)]",
  danger: "bg-[var(--danger-soft)] text-[var(--danger)]",
  info: "bg-[var(--info-soft)] text-[var(--info)]",
  neutral: "bg-[var(--surface-muted)] text-[var(--text-muted)]",
};

export function Tag({
  tone,
  children,
}: {
  tone: VisitTone;
  children: ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex h-5 items-center rounded-[4px] px-1.5 text-[0.75rem] font-medium whitespace-nowrap",
        TAG[tone],
      )}
    >
      {children}
    </span>
  );
}

export const initials = (name: string) =>
  name
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

/** The specialist in their colour (from their settings), with their picture. */
export function SpecialistChip({
  row,
  avatar,
}: {
  row: Pick<
    VisitRow,
    "specialistId" | "specialistName" | "specialistColor" | "cancelled"
  >;
  avatar?: string | null;
}) {
  const theme = scheduleTheme(row.specialistColor, row.specialistId);
  const chip = row.cancelled
    ? {
        background: "var(--surface-muted)",
        borderColor: "var(--border)",
        color: "var(--text-muted)",
      }
    : {
        background: theme.cardBg,
        borderColor: theme.cardBorder,
        color: theme.text,
      };
  return (
    <span
      className="inline-flex h-[22px] max-w-full items-center gap-1.5 rounded-full border pr-2 pl-0.5 text-[0.75rem] leading-none font-medium"
      style={chip}
    >
      <Avatar aria-hidden="true" className="size-[18px]">
        {avatar ? <AvatarImage alt="" src={avatar} /> : null}
        <AvatarFallback
          className="text-[0.5rem] leading-none font-bold"
          // Darker than the colour, so the small letters read.
          style={
            row.cancelled
              ? { background: "var(--text-muted)", color: "var(--surface)" }
              : { background: theme.solid, color: "#fff" }
          }
        >
          {initials(row.specialistName)}
        </AvatarFallback>
      </Avatar>
      <span className="truncate">{row.specialistName}</span>
    </span>
  );
}

/** The room in its colour (online: sky blue), as in the calendar. */
export function PlaceLabel({
  row,
  children,
}: {
  row: Pick<VisitRow, "roomId" | "roomColor" | "mode" | "room" | "cancelled">;
  /** Instead of the room's name (e.g. with the location). */
  children?: ReactNode;
}) {
  const theme = row.roomId
    ? scheduleTheme(row.roomColor, row.roomId)
    : row.mode === "online"
      ? scheduleTheme(null, "online", true)
      : null;
  return (
    <span
      className={cn(
        "inline-flex min-w-0 items-center gap-1.5 font-medium",
        row.cancelled && "text-[var(--text-muted)]",
      )}
      // Mostly the colour itself, a little of the text for contrast.
      style={
        theme && !row.cancelled
          ? { color: `color-mix(in oklab, ${theme.accent} 72%, var(--text))` }
          : undefined
      }
    >
      {theme ? (
        <span
          aria-hidden="true"
          className="size-2 shrink-0 rounded-full"
          style={{ background: theme.accent }}
        />
      ) : null}
      <span className="truncate">{children ?? row.room}</span>
    </span>
  );
}
