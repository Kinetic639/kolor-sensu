import {
  minutesToTime,
  visitsLabel,
  type AvailabilitySlot,
  type BlockedSlot,
  type CalendarColumn,
  type CalendarNow,
  type CalendarPlace,
  type MinuteRange,
  type Occupancy,
  type VisitSlot,
} from "@repo/scheduling";
import {
  AlertTriangle,
  CalendarOff,
  ChevronsLeft,
  ChevronsRight,
  Clock,
  Hourglass,
  Lock,
  Video,
} from "lucide-react";
import type { CSSProperties, ReactNode } from "react";
import { cn } from "../lib/utils";
import { PageLink as Link } from "../public-site/page-link";
import { resourceColors, scheduleTheme } from "../resource-colors";
import {
  AXIS_WIDTH,
  HOUR_HEIGHT,
  minutesToPx,
  rangeHeight,
} from "./schedule-geometry";

// The pieces of the calendar views, after the AI Studio reference: the
// time axis, the grid lines, the column headers with their occupancy ring,
// and the blocks (availability as a calm background with a boundary chip,
// hatched blocked time, visit cards; compact versions for the week's
// narrow lanes). Server components: positions in pixels from minutes,
// visits are links (the details open beside the calendar).

export { AXIS_WIDTH, HOUR_HEIGHT, minutesToPx, rangeHeight };

function place(range: MinuteRange, slot: MinuteRange): CSSProperties {
  return {
    top: minutesToPx(slot.start - range.start),
    // At least a quarter of an hour, so the shortest stay readable.
    height: minutesToPx(Math.max(15, slot.end - slot.start)),
  };
}

/** `Gabinet Niebieski` → `G. Niebieski` where space is short. */
export function shortPlaceName(name: string, tight = false) {
  return tight || name.length > 12 ? name.replace(/^Gabinet /, "G. ") : name;
}

export const themeOf = (where: CalendarPlace) =>
  scheduleTheme(where.color, where.id, where.online);

/** `4,5h` */
export const hoursShort = (hours: number) =>
  `${String(hours).replace(".", ",")}h`;

// ---------------------------------------------------------------------------
// Axis and lines

/**
 * The hours down the left: the first edge, every full hour, the last edge
 * when it is a half hour; ticks at half hours; now, in green, on today.
 */
export function TimeAxis({
  range,
  now,
  className,
}: {
  range: MinuteRange;
  now: CalendarNow | null;
  className?: string;
}) {
  const height = rangeHeight(range);
  const marks: { minute: number; edge: "top" | "bottom" | null }[] = [
    { minute: range.start, edge: "top" },
  ];
  for (
    let minute = Math.ceil((range.start + 1) / 60) * 60;
    minute < range.end;
    minute += 60
  ) {
    // Not under the label for now, nor too close to the top edge.
    const nearNow = now && Math.abs(minute - now.minute) < 12;
    if (minute - range.start >= 20 && !nearNow) {
      marks.push({ minute, edge: null });
    }
  }
  if (range.end % 60 !== 0 && range.end - marks.at(-1)!.minute >= 20) {
    marks.push({ minute: range.end, edge: "bottom" });
  }
  const ticks: number[] = [];
  for (
    let minute = Math.ceil(range.start / 30) * 30;
    minute < range.end;
    minute += 30
  ) {
    if (minute % 60 === 30 && minute > range.start) ticks.push(minute);
  }
  const showNow = now && now.minute >= range.start && now.minute <= range.end;
  return (
    <div
      aria-hidden="true"
      className={cn(
        "relative shrink-0 border-r border-[var(--border)] bg-[var(--surface)] select-none",
        className,
      )}
      style={{ height, width: AXIS_WIDTH }}
    >
      {marks.map((mark) => (
        <span
          className={cn(
            "absolute right-1.5 font-mono text-[0.65625rem] text-[var(--text-subtle)] tabular-nums",
            mark.edge === "top"
              ? "translate-y-0.5"
              : mark.edge === "bottom"
                ? "-translate-y-full"
                : "-translate-y-1/2",
          )}
          key={mark.minute}
          style={{ top: minutesToPx(mark.minute - range.start) }}
        >
          {minutesToTime(mark.minute)}
        </span>
      ))}
      {ticks.map((minute) => (
        <span
          className="absolute right-0 h-px w-1.5 bg-[var(--border-strong)]"
          key={minute}
          style={{ top: minutesToPx(minute - range.start) }}
        />
      ))}
      {showNow ? (
        <span
          className="absolute right-0 z-40 flex -translate-y-1/2 items-center"
          style={{ top: minutesToPx(now.minute - range.start) }}
        >
          <span className="mr-1 rounded-[3px] bg-[var(--danger)] px-1 font-mono text-[0.625rem] leading-[14px] font-medium text-[var(--danger-foreground)] tabular-nums">
            {now.label}
          </span>
          <span className="size-2 rounded-full bg-[var(--danger)]" />
        </span>
      ) : null}
    </div>
  );
}

/** Hour lines, fainter dashed half hours. */
export function GridLines({ range }: { range: MinuteRange }) {
  const lines: number[] = [];
  for (let minute = range.start; minute <= range.end; minute += 30) {
    lines.push(minute);
  }
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0">
      {lines.map((minute) => (
        <div
          className={cn(
            "absolute inset-x-0 border-t",
            minute % 60 === 0 || minute === range.start
              ? "border-[var(--border)] opacity-60"
              : "border-dashed border-[var(--border)] opacity-30",
          )}
          key={minute}
          style={{ top: minutesToPx(minute - range.start) }}
        />
      ))}
    </div>
  );
}

/** The thin line for now across a column. */
/**
 * The time now, across a column: strong on today, faint on the week's
 * other days (so it shows even when today is not in view).
 */
export function NowLine({
  now,
  range,
  today = true,
}: {
  now: CalendarNow | null;
  range: MinuteRange;
  today?: boolean;
}) {
  if (!now || now.minute < range.start || now.minute > range.end) return null;
  return (
    <div
      aria-hidden="true"
      className={cn(
        "pointer-events-none absolute inset-x-0 z-30",
        today
          ? "h-0.5 bg-[var(--danger)]"
          : "h-px bg-[color-mix(in_srgb,var(--danger)_45%,transparent)]",
      )}
      data-now-line={today ? "today" : "week"}
      style={{ top: minutesToPx(now.minute - range.start) }}
    />
  );
}

// ---------------------------------------------------------------------------
// Occupancy

function occupancyTone(occupancy: Occupancy, unavailable: boolean) {
  if (unavailable) return "muted";
  if (occupancy.overbooked) return "warning";
  return occupancy.percent >= 75 ? "high" : "normal";
}

const RING_STROKE = {
  muted: "var(--border-strong)",
  warning: "var(--warning)",
  high: "var(--primary)",
  normal: "color-mix(in srgb, var(--primary) 70%, var(--text))",
};

/** The column's occupancy as a ring, the percentage inside. */
export function OccupancyRing({
  occupancy,
  unavailable = false,
  size = 28,
}: {
  occupancy: Occupancy;
  unavailable?: boolean;
  size?: number;
}) {
  const tone = occupancyTone(occupancy, unavailable);
  const circumference = 94.2;
  const shown = unavailable ? 0 : occupancy.percent;
  const title = unavailable
    ? "Brak dostępności"
    : occupancy.overbooked
      ? `${shown}% – ${hoursShort(Math.round((occupancy.overMinutes / 60) * 10) / 10)} wizyt poza zadeklarowaną dostępnością`
      : `${shown}% obłożenia`;
  return (
    <span
      className="relative flex shrink-0 items-center justify-center"
      style={{ width: size, height: size }}
      title={title}
    >
      <svg
        aria-hidden="true"
        className="-rotate-90"
        height={size}
        viewBox="0 0 36 36"
        width={size}
      >
        <circle
          cx="18"
          cy="18"
          fill="none"
          r="15"
          stroke="var(--surface-muted)"
          strokeWidth="3.2"
        />
        <circle
          cx="18"
          cy="18"
          fill="none"
          r="15"
          stroke={RING_STROKE[tone]}
          strokeDasharray={circumference}
          strokeDashoffset={
            circumference - (circumference * Math.min(100, shown)) / 100
          }
          strokeLinecap="round"
          strokeWidth="3.2"
        />
      </svg>
      <span
        className={cn(
          "absolute text-[0.5rem] font-bold tabular-nums",
          tone === "muted"
            ? "text-[var(--text-subtle)]"
            : tone === "warning"
              ? "text-[var(--warning-foreground)]"
              : "text-[var(--text)]",
        )}
      >
        <span className="sr-only">Obłożenie </span>
        {shown}%
      </span>
    </span>
  );
}

/** A small percentage chip (week lanes, collapsed columns, day groups). */
export function OccupancyChip({
  occupancy,
  unavailable = false,
  title,
}: {
  occupancy: Occupancy;
  unavailable?: boolean;
  title?: string;
}) {
  if (unavailable && !occupancy.visitCount) {
    return (
      <span className="text-[0.6875rem] leading-none text-[var(--text-subtle)]">
        —
      </span>
    );
  }
  const tone = occupancyTone(occupancy, false);
  return (
    <span
      className={cn(
        "rounded-[4px] px-1.5 text-[0.6875rem] leading-[18px] font-semibold tabular-nums",
        tone === "warning"
          ? "bg-[var(--warning-soft)] text-[var(--warning-foreground)]"
          : tone === "high"
            ? "bg-[var(--primary-soft)] text-[var(--primary)]"
            : "bg-[var(--surface-muted)] text-[var(--text-muted)]",
      )}
      title={title}
    >
      {occupancy.percent}%
    </span>
  );
}

// ---------------------------------------------------------------------------
// Pictures and markers

export function PersonAvatar({
  name,
  initials,
  avatarUrl,
  color,
  seed,
  size = 36,
  muted = false,
  className,
}: {
  name: string;
  initials: string;
  avatarUrl: string | null;
  color: string | null;
  seed: string;
  size?: number;
  muted?: boolean;
  className?: string;
}) {
  const colors = resourceColors(color, seed);
  return (
    <span
      className={cn(
        "relative flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-[var(--border)] bg-[var(--surface-muted)] font-semibold",
        muted && "grayscale",
        className,
      )}
      style={{
        width: size,
        height: size,
        backgroundColor: avatarUrl
          ? undefined
          : muted
            ? "var(--surface-muted)"
            : colors.tint,
        color: muted
          ? "var(--text-muted)"
          : `color-mix(in srgb, ${colors.accent} 40%, var(--text))`,
        fontSize: Math.max(8, Math.round(size / 3)),
      }}
    >
      {avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- short-lived signed URLs
        <img alt="" className="size-full object-cover" src={avatarUrl} />
      ) : (
        <span aria-hidden="true">{initials}</span>
      )}
      <span className="sr-only">{name}</span>
    </span>
  );
}

/** A room's dot, online's camera, a closed room's lock. */
export function PlaceMarker({
  column,
  size = "md",
}: {
  column: CalendarColumn;
  size?: "sm" | "md";
}) {
  const small = size === "sm";
  if (column.closed) {
    return (
      <span
        aria-hidden="true"
        className={cn(
          "flex shrink-0 items-center justify-center rounded-full bg-[var(--surface-muted)] text-[var(--text-subtle)]",
          small ? "size-3.5" : "size-5",
        )}
      >
        <Lock className={small ? "size-2" : "size-2.5"} />
      </span>
    );
  }
  if (column.kind === "online") {
    return (
      <span
        aria-hidden="true"
        className={cn(
          "flex shrink-0 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--info)_14%,var(--surface))] text-[var(--info)]",
          small ? "size-3.5" : "size-5",
        )}
      >
        <Video className={small ? "size-2" : "size-2.5"} />
      </span>
    );
  }
  const theme = scheduleTheme(column.color, column.colorSeed);
  return (
    <span
      aria-hidden="true"
      className={cn(
        "shrink-0 rounded-full shadow-sm",
        small ? "size-2" : "size-3.5",
      )}
      style={{
        backgroundColor: column.unavailable
          ? "var(--border-strong)"
          : theme.accent,
      }}
    />
  );
}

// ---------------------------------------------------------------------------
// Column headers

function CountsLine({ column }: { column: CalendarColumn }) {
  const { occupancy } = column;
  return (
    <span className="flex min-w-0 items-center gap-1 whitespace-nowrap tabular-nums">
      <span
        className={
          occupancy.overbooked
            ? "font-semibold text-[var(--warning-foreground)]"
            : ""
        }
      >
        {visitsLabel(occupancy.visitCount)}
        {occupancy.bookedMinutes || occupancy.availableMinutes
          ? ` · ${hoursShort(occupancy.bookedHours)} / ${hoursShort(occupancy.availableHours)}`
          : ""}
      </span>
      {occupancy.overbooked ? (
        <AlertTriangle
          aria-label="Wizyty poza zadeklarowaną dostępnością"
          className="size-3 shrink-0 text-[var(--warning)]"
          role="img"
        />
      ) : null}
    </span>
  );
}

function CollapseLink({
  href,
  label,
  collapsed,
}: {
  href: string;
  label: string;
  collapsed: boolean;
}) {
  const Icon = collapsed ? ChevronsRight : ChevronsLeft;
  return (
    <Link
      aria-label={`${collapsed ? "Rozwiń" : "Zwiń"} kolumnę: ${label}`}
      className="inline-grid size-5 shrink-0 place-items-center rounded-[4px] text-[var(--text-subtle)] transition-colors hover:bg-[var(--surface-muted)] hover:text-[var(--text)] focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:outline-none"
      href={href}
      scroll={false}
      title={collapsed ? "Rozwiń kolumnę" : "Zwiń kolumnę (widok kompaktowy)"}
    >
      <Icon aria-hidden="true" className="size-3.5" />
    </Link>
  );
}

/** A narrow column's header: expand, a small picture or dot, the share. */
export function CollapsedHeader({
  column,
  expandHref,
}: {
  column: CalendarColumn;
  expandHref: string;
}) {
  const person = column.kind === "specialist";
  return (
    <div
      className={cn(
        "flex h-full w-[54px] flex-col items-center justify-between gap-1 border-b border-[var(--border)] p-1 text-center",
        column.unavailable
          ? "bg-[var(--surface-subtle)]"
          : "bg-[var(--surface-subtle)]",
      )}
      title={`${column.title}\nObłożenie: ${column.occupancy.percent}% (${visitsLabel(column.occupancy.visitCount)})`}
    >
      <CollapseLink collapsed href={expandHref} label={column.title} />
      <span className="flex w-full min-w-0 flex-col items-center">
        {person ? (
          <PersonAvatar
            avatarUrl={column.avatarUrl}
            color={column.color}
            initials={column.initials}
            name={column.title}
            seed={column.colorSeed}
            size={20}
          />
        ) : (
          <PlaceMarker column={column} size="sm" />
        )}
        <span className="mt-0.5 w-full truncate text-[0.5625rem] leading-tight font-bold text-[var(--text)]">
          {column.short}
        </span>
      </span>
      <OccupancyChip
        occupancy={column.occupancy}
        unavailable={column.unavailable}
      />
    </div>
  );
}

/** A day column's full header: who (or which room), their hours, the day. */
export function ColumnHeader({
  column,
  collapseHref,
}: {
  column: CalendarColumn;
  /** Where "zwiń" leads (the day view); none: no collapsing. */
  collapseHref?: string;
}) {
  const muted = column.unavailable;
  // A day of one's own week: its name (today marked), the date, the share.
  if (column.kind === "day") {
    return (
      <div
        className={cn(
          "flex h-full min-h-11 flex-col justify-center gap-px border-b border-[var(--border)] px-2.5 py-1.5",
          column.isToday ? "bg-[var(--primary-soft)]" : "bg-[var(--surface)]",
        )}
      >
        <span className="flex min-w-0 items-center gap-1.5">
          <span
            className={cn(
              "truncate text-[0.8125rem] font-semibold",
              column.isToday ? "text-[var(--primary)]" : "text-[var(--text)]",
            )}
          >
            {column.title}
          </span>
          {column.isToday ? (
            <span className="rounded-[3px] bg-[var(--primary)] px-1 text-[0.625rem] font-semibold text-[var(--primary-foreground)]">
              Dziś
            </span>
          ) : null}
          <span className="ml-auto">
            <OccupancyChip
              occupancy={column.occupancy}
              unavailable={column.unavailable}
            />
          </span>
        </span>
        <span className="flex min-w-0 items-center gap-1 text-[0.71875rem] text-[var(--text-muted)] tabular-nums">
          <span className="truncate">{column.subtitle}</span>
          <CountsLine column={column} />
        </span>
      </div>
    );
  }

  // A specialist, a room or online: one line with who (or which) and the
  // share, one with the hours and the visits.
  const person = column.kind === "specialist";
  const closed = !person && column.closed;
  return (
    <div
      className={cn(
        "flex h-full min-h-11 flex-col justify-center gap-px border-b border-[var(--border)] px-2.5 py-1.5",
        muted ? "bg-[var(--surface-subtle)]" : "bg-[var(--surface)]",
      )}
    >
      <span className="flex min-w-0 items-center gap-1.5">
        {person ? (
          <PersonAvatar
            avatarUrl={column.avatarUrl}
            color={column.color}
            initials={column.initials}
            muted={muted}
            name={column.title}
            seed={column.colorSeed}
            size={20}
          />
        ) : (
          <PlaceMarker column={column} size="sm" />
        )}
        <span
          className={cn(
            "truncate text-[0.8125rem] font-semibold",
            muted ? "text-[var(--text-subtle)]" : "text-[var(--text)]",
          )}
          title={person && column.subtitle ? column.subtitle : undefined}
        >
          {column.title}
        </span>
        <span className="ml-auto flex shrink-0 items-center gap-0.5">
          <OccupancyChip
            occupancy={column.occupancy}
            unavailable={muted}
            title={
              column.occupancy.overbooked
                ? "Wizyty poza zadeklarowaną dostępnością"
                : `${column.occupancy.percent}% obłożenia`
            }
          />
          {collapseHref ? (
            <CollapseLink
              collapsed={false}
              href={collapseHref}
              label={column.title}
            />
          ) : null}
        </span>
      </span>
      <span className="flex min-w-0 items-center gap-1 text-[0.71875rem] text-[var(--text-muted)] tabular-nums">
        {closed ? (
          <span className="truncate font-medium text-[var(--warning-foreground)]">
            {closed === "Gabinet zamknięty" ? closed : `Zamknięty: ${closed}`}
          </span>
        ) : muted ? (
          <span className="flex items-center gap-1 truncate text-[var(--text-subtle)]">
            <CalendarOff aria-hidden="true" className="size-3 shrink-0" />
            Brak dostępności
          </span>
        ) : (
          <span className="truncate">
            {column.hours ?? "Poza dostępnością"}
          </span>
        )}
        {!closed && (!muted || column.occupancy.visitCount) ? (
          <>
            <span aria-hidden="true">·</span>
            <CountsLine column={column} />
          </>
        ) : null}
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Blocks

/** Nothing here today: a quiet marker near the top. */
export function EmptyMarker({
  column,
  compact = false,
}: {
  column: CalendarColumn;
  compact?: boolean;
}) {
  // No availability: the column's hatch says it.
  if (column.closed === null) return null;
  return (
    <span
      className="pointer-events-none absolute inset-x-0 top-3 z-10 flex justify-center px-1"
      title={column.closed}
    >
      <span className="inline-flex min-w-0 items-center gap-1 rounded-[4px] bg-[var(--warning-soft)] px-1.5 text-[0.6875rem] leading-[18px] font-medium text-[var(--warning-foreground)]">
        <Lock aria-hidden="true" className="size-3 shrink-0" />
        {compact ? null : <span className="truncate">{column.closed}</span>}
      </span>
    </span>
  );
}

/**
 * A surface that opens the window's details when a link is given (a
 * note otherwise).
 */
function Surface({
  href,
  label,
  className,
  style,
  children,
}: {
  href?: string;
  label: string;
  className: string;
  style: CSSProperties;
  children?: ReactNode;
}) {
  return href ? (
    <Link
      aria-label={`${label}: szczegóły`}
      className={cn(
        className,
        "block transition-[filter] hover:brightness-[0.98] focus-visible:z-20 focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:outline-none focus-visible:ring-inset",
      )}
      href={href}
      scroll={false}
      style={style}
      title={`${label}
Kliknij, aby wyświetlić szczegóły`}
    >
      {children}
    </Link>
  ) : (
    <div
      aria-label={label}
      className={className}
      role="note"
      style={style}
      title={label}
    >
      {children}
    </div>
  );
}

/**
 * Availability: the room's calm tint where the specialist works (a
 * hatched gutter on the right in a specialist's column) and a dark chip
 * at its boundary, `08:00–16:00 · Gabinet 1`; both open its details.
 */
export function AvailabilityBlock({
  slot,
  range,
  showPlace,
  gutter,
  href,
}: {
  slot: AvailabilitySlot;
  range: MinuteRange;
  /** The room in the chip (a specialist's column), not only the hours. */
  showPlace: boolean;
  gutter: boolean;
  /** Where its details open. */
  href?: string;
}) {
  const theme = themeOf(slot.place);
  const style = place(range, slot);
  const top = style.top as number;
  const minutes = slot.end - slot.start;
  const name = shortPlaceName(slot.place.name, minutes < 75);
  const chip = (
    <span
      className="inline-flex h-4 min-w-0 items-center gap-1 rounded-[3px] border bg-[var(--surface)] px-1 font-mono text-[0.625rem] leading-none"
      style={{ borderColor: theme.availBorder, color: theme.text }}
    >
      <span className="shrink-0 tabular-nums">{slot.time}</span>
      {showPlace && minutes >= 30 ? (
        <>
          <span className="shrink-0 opacity-60">·</span>
          <span className="truncate">{name}</span>
        </>
      ) : null}
    </span>
  );
  const chipStyle = {
    top: top + 3,
  };
  const chipClasses =
    "absolute right-1 z-[25] flex max-w-[calc(100%-12px)] justify-end";
  return (
    <div data-availability="">
      <Surface
        className="absolute inset-x-0 z-10 overflow-hidden border-y"
        href={href}
        label={slot.label}
        style={{
          ...style,
          backgroundColor: theme.availBg,
          borderColor: theme.availBorder,
        }}
      >
        {gutter ? (
          <span
            aria-hidden="true"
            className="absolute inset-y-0 right-0 w-3.5"
            style={{
              backgroundImage:
                "repeating-linear-gradient(135deg, var(--surface) 0px, var(--surface) 2px, transparent 2px, transparent 8px)",
            }}
          />
        ) : null}
      </Surface>
      {href ? (
        // The chip opens the same details (the surface is the one in the
        // tab order).
        <Link
          aria-hidden="true"
          className={cn(chipClasses, "hover:brightness-110")}
          href={href}
          scroll={false}
          style={chipStyle}
          tabIndex={-1}
        >
          {chip}
        </Link>
      ) : (
        <span aria-hidden="true" className={chipClasses} style={chipStyle}>
          {chip}
        </span>
      )}
    </div>
  );
}

/** Time off or a blocked room: hatched, with why. */
export function BlockedBlock({
  slot,
  range,
  gutter = false,
  compact = false,
}: {
  slot: BlockedSlot;
  range: MinuteRange;
  gutter?: boolean;
  compact?: boolean;
}) {
  const style = place(range, slot);
  return (
    <div
      aria-label={`Zablokowane ${slot.time}: ${slot.label}`}
      className={cn(
        "absolute z-[15] overflow-hidden rounded-[5px] border border-[var(--border)] text-[var(--text-muted)]",
        compact
          ? "inset-x-0.5"
          : gutter
            ? "right-[18px] left-1.5"
            : "inset-x-1.5",
      )}
      role="note"
      style={{
        ...style,
        backgroundImage:
          "repeating-linear-gradient(45deg, var(--surface-subtle), var(--surface-subtle) 6px, var(--surface-muted) 6px, var(--surface-muted) 12px)",
      }}
      title={`${slot.time}: ${slot.label}`}
    >
      <div
        className={cn(
          "flex h-full w-full items-center gap-1.5 bg-[color-mix(in_srgb,var(--surface)_40%,transparent)]",
          compact ? "p-1" : "p-2",
        )}
      >
        <Clock aria-hidden="true" className="size-3 shrink-0" />
        {compact ? null : (
          <span className="min-w-0">
            <span className="block text-[0.625rem] leading-none font-semibold tabular-nums">
              {slot.time}
            </span>
            <span className="mt-0.5 block truncate text-[0.6875rem] leading-tight font-medium">
              {slot.label}
            </span>
          </span>
        )}
      </div>
    </div>
  );
}

function cardStyle(slot: VisitSlot, range: MinuteRange): CSSProperties {
  const theme = themeOf(slot.place);
  return {
    // All the time it holds: the visit and the time after it.
    ...place(range, { start: slot.start, end: slot.heldEnd }),
    backgroundColor: theme.cardBg,
    color: theme.text,
    // The place's colour as a line on the left, as on the dashboard.
    boxShadow: `inset 3px 0 0 ${theme.accent}`,
    ["--card-accent" as string]: theme.accent,
  };
}

const cardClasses = (slot: VisitSlot, open: boolean) =>
  cn(
    "group absolute z-20 overflow-hidden rounded-[5px] text-left transition-[filter,outline-color] focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--ring)]",
    open
      ? "z-30 outline-2 outline-offset-1 outline-[var(--card-accent)]"
      : "outline-1 -outline-offset-1 outline-transparent hover:outline-[var(--card-accent)] hover:brightness-[0.98]",
    slot.dimmed && "opacity-35",
  );

/**
 * The time after a visit (notes, getting ready), at the end of its card:
 * held, so not a gap, but not the visit either.
 */
function AfterTime({ slot }: { slot: VisitSlot }) {
  const after = slot.heldEnd - slot.end;
  if (after <= 0) return null;
  return (
    <span
      aria-hidden="true"
      className="pointer-events-none absolute inset-x-0 bottom-0 border-t border-dashed"
      style={{
        height: `${(after / (slot.heldEnd - slot.start)) * 100}%`,
        borderColor: "color-mix(in srgb, var(--card-accent) 45%, transparent)",
        backgroundImage:
          "repeating-linear-gradient(135deg, color-mix(in srgb, var(--card-accent) 16%, transparent) 0 2px, transparent 2px 6px)",
      }}
    />
  );
}

/** `· 10 min po wizycie` for a card's tooltip, where there is time after it. */
const afterNote = (slot: VisitSlot) =>
  slot.heldEnd > slot.end ? ` · ${slot.heldEnd - slot.end} min po wizycie` : "";

/** Waiting for payment, online: small icons after the time. */
function CardFlags({ slot }: { slot: VisitSlot }) {
  if (!slot.pending && !slot.place.online) return null;
  return (
    <span className="inline-flex shrink-0 items-center gap-0.5 opacity-80">
      {slot.pending ? (
        <Hourglass
          aria-label="Czeka na płatność"
          className="size-3 text-[var(--warning)]"
          role="img"
        />
      ) : null}
      {slot.place.online ? (
        <Video aria-label="Online" className="size-3" role="img" />
      ) : null}
    </span>
  );
}

/**
 * A visit card in a day, as on the dashboard's line of hours: the place's
 * tint with its line on the left; the time, the client, the service (and
 * the room, unless the background says it); by room the specialist's
 * picture. Short visits in one line.
 */
export function VisitCard({
  slot,
  range,
  href,
  open,
  byRoom,
  gutter,
  showPlace,
}: {
  slot: VisitSlot;
  range: MinuteRange;
  href: string;
  open: boolean;
  byRoom: boolean;
  gutter: boolean;
  showPlace: boolean;
}) {
  const theme = themeOf(slot.place);
  const tiny = slot.minutes <= 35;
  const where = showPlace && !slot.place.online ? slot.place.short : null;
  return (
    <Link
      aria-current={open ? "true" : undefined}
      aria-label={slot.label}
      className={cn(
        cardClasses(slot, open),
        gutter ? "right-[18px] left-1" : "inset-x-1",
      )}
      data-visit=""
      href={href}
      scroll={false}
      style={cardStyle(slot, range)}
      title={`${slot.time}: ${slot.client} (${slot.service})${afterNote(slot)}`}
    >
      <AfterTime slot={slot} />
      {tiny ? (
        <span className="flex h-full w-full items-center gap-1.5 pr-1.5 pl-2.5 text-[0.71875rem] leading-none">
          <span className="shrink-0 font-mono text-[0.65625rem] tabular-nums opacity-80">
            {slot.startTime}
          </span>
          <span className="truncate font-semibold text-[var(--text)] group-hover:underline">
            {slot.client}
          </span>
          <CardFlags slot={slot} />
        </span>
      ) : (
        <span className="flex h-full w-full items-start gap-1.5 py-1 pr-1.5 pl-2.5">
          {byRoom ? (
            <PersonAvatar
              avatarUrl={slot.person.avatarUrl}
              className="mt-px"
              color={slot.place.color}
              initials={slot.person.initials}
              name={slot.person.name}
              seed={slot.place.id}
              size={18}
            />
          ) : null}
          <span className="flex min-w-0 flex-1 flex-col leading-[1.25]">
            <span className="flex items-center gap-1 font-mono text-[0.65625rem] tabular-nums opacity-80">
              {slot.time}
              <CardFlags slot={slot} />
            </span>
            <span className="truncate text-[0.78125rem] font-semibold text-[var(--text)] group-hover:underline">
              {slot.client}
            </span>
            <span
              className="truncate text-[0.71875rem]"
              style={{ color: theme.textMuted }}
            >
              {slot.service}
              {where ? ` · ${where}` : ""}
              {byRoom && slot.minutes > 55 ? ` · ${slot.person.name}` : ""}
            </span>
          </span>
        </span>
      )}
    </Link>
  );
}

/**
 * A visit in a week lane: the specialist's picture (by room) or the
 * client's initials, and the start; the rest on hover.
 */
export function CompactVisit({
  slot,
  range,
  href,
  open,
  byRoom,
}: {
  slot: VisitSlot;
  range: MinuteRange;
  href: string;
  open: boolean;
  byRoom: boolean;
}) {
  const theme = themeOf(slot.place);
  return (
    <Link
      aria-current={open ? "true" : undefined}
      aria-label={`${slot.label}, ${byRoom ? slot.person.name : slot.place.name}`}
      className={cn(
        cardClasses(slot, open),
        "inset-x-0.5 flex flex-col items-start gap-0.5 py-1 pr-0.5 pl-1.5",
      )}
      data-visit=""
      href={href}
      scroll={false}
      style={cardStyle(slot, range)}
      title={`${slot.time}${afterNote(slot)}\nPacjent: ${slot.client}\nUsługa: ${slot.service}\nMiejsce: ${slot.place.name}\nSpecjalista: ${slot.person.name}`}
    >
      <AfterTime slot={slot} />
      <span className="flex items-center gap-1">
        {byRoom ? (
          <PersonAvatar
            avatarUrl={slot.person.avatarUrl}
            color={slot.place.color}
            initials={slot.person.initials}
            name={slot.person.name}
            seed={slot.place.id}
            size={16}
          />
        ) : (
          <span
            aria-hidden="true"
            className="flex size-4 shrink-0 items-center justify-center rounded-full text-[0.5rem] font-bold text-white"
            style={{ backgroundColor: theme.solid }}
          >
            {slot.clientInitials}
          </span>
        )}
        <span className="font-mono text-[0.625rem] leading-none tabular-nums">
          {slot.startTime}
        </span>
      </span>
      {slot.pending ? (
        <Hourglass
          aria-hidden="true"
          className="size-2.5 text-[var(--warning)]"
        />
      ) : null}
    </Link>
  );
}

/** Availability in a week lane: the room's tint, its code in a corner. */
export function CompactAvailability({
  slot,
  range,
  showPlace,
  href,
}: {
  slot: AvailabilitySlot;
  range: MinuteRange;
  showPlace: boolean;
  href?: string;
}) {
  const theme = themeOf(slot.place);
  return (
    <div data-availability="">
      <Surface
        className="absolute inset-x-0 z-10 overflow-hidden border-y"
        href={href}
        label={slot.label}
        style={{
          ...place(range, slot),
          backgroundColor: theme.availBg,
          borderColor: theme.availBorder,
        }}
      >
        {showPlace ? (
          <span
            aria-hidden="true"
            className="absolute top-1 right-1 rounded-sm px-1 text-[0.5625rem] leading-tight font-bold text-white opacity-80 shadow-sm"
            style={{ backgroundColor: theme.solid }}
          >
            {slot.place.short}
          </span>
        ) : null}
      </Surface>
    </div>
  );
}
