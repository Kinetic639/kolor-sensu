import {
  visitsLabel,
  type CalendarColumn,
  type CalendarDayView,
  type CalendarNow,
  type CalendarWeekView,
  type MinuteRange,
} from "@repo/scheduling";
import type { ReactNode } from "react";
import { cn } from "../lib/utils";
import {
  AvailabilityBlock,
  BlockedBlock,
  CollapsedHeader,
  ColumnHeader,
  CompactAvailability,
  CompactVisit,
  EmptyMarker,
  GridLines,
  NowLine,
  OccupancyChip,
  PersonAvatar,
  PlaceMarker,
  AXIS_WIDTH,
  rangeHeight,
  TimeAxis,
  VisitCard,
} from "./schedule-parts";
import { SlotPickLayer } from "./slot-picker";

// The calendar's grids, after the reference: the day (a column per
// specialist, room or day, full or collapsed) and the week comparison (per
// day, a narrow lane per specialist or room). Rendered on the server; the
// frame scrolls both ways with the headers and the hours stuck.

export type ScheduleMode = "specialists" | "rooms" | "personal";

const SCROLL =
  "min-h-[24rem] flex-1 overflow-auto overscroll-contain bg-[var(--surface)] md:min-h-0";

function columnName(column: CalendarColumn) {
  return [
    column.title,
    column.kind === "day" ? column.subtitle : null,
    column.closed
      ? `zamknięty: ${column.closed}`
      : (column.hours ?? "brak dostępności"),
    visitsLabel(column.occupancy.visitCount),
    `obłożenie ${column.occupancy.percent}%`,
  ]
    .filter(Boolean)
    .join(", ");
}

function hasBlocks(column: CalendarColumn) {
  return (
    column.availability.length > 0 ||
    column.visits.length > 0 ||
    column.blocked.length > 0
  );
}

interface ColumnBodyProps {
  column: CalendarColumn;
  range: MinuteRange;
  now: CalendarNow | null;
  mode: ScheduleMode;
  compact: boolean;
  visitHref: (visitId: string) => string;
  availabilityHref?: (key: string) => string;
  openVisitId?: string | null;
  /** Adding a visit: a click on the column picks the time. */
  adding?: boolean;
  className?: string;
}

/** One column's time: its lines, availability, blocked time and visits. */
function ColumnBody({
  column,
  range,
  now,
  mode,
  compact,
  visitHref,
  availabilityHref,
  openVisitId,
  adding = false,
  className,
}: ColumnBodyProps) {
  const byRoom = mode === "rooms";
  const gutter = !byRoom && !compact;
  return (
    <div
      aria-label={columnName(column)}
      className={cn(
        "relative shrink-0 border-r border-[var(--border)] bg-[var(--surface)] transition-colors",
        className,
      )}
      data-unavailable={column.unavailable || undefined}
      role="group"
      style={{ height: rangeHeight(range) }}
    >
      <GridLines range={range} />
      {hasBlocks(column) ? (
        <>
          {column.availability.map((slot) =>
            compact ? (
              <CompactAvailability
                href={availabilityHref?.(slot.key)}
                key={slot.key}
                range={range}
                showPlace={!byRoom}
                slot={slot}
              />
            ) : (
              <AvailabilityBlock
                gutter={gutter}
                href={availabilityHref?.(slot.key)}
                key={slot.key}
                range={range}
                showPlace={!byRoom}
                slot={slot}
              />
            ),
          )}
          {column.blocked.map((slot) => (
            <BlockedBlock
              compact={compact}
              gutter={gutter}
              key={slot.key}
              range={range}
              slot={slot}
            />
          ))}
          {column.visits.map((slot) =>
            compact ? (
              <CompactVisit
                byRoom={byRoom}
                href={visitHref(slot.visitId)}
                key={slot.key}
                open={slot.visitId === openVisitId}
                range={range}
                slot={slot}
              />
            ) : (
              <VisitCard
                byRoom={byRoom}
                gutter={gutter}
                href={visitHref(slot.visitId)}
                key={slot.key}
                open={slot.visitId === openVisitId}
                range={range}
                // The background already says the room, except in one's own
                // calendar, where the card says it too.
                showPlace={mode === "personal"}
                slot={slot}
              />
            ),
          )}
        </>
      ) : (
        <EmptyMarker column={column} compact={compact} />
      )}
      {adding ? (
        <SlotPickLayer
          column={column.kind === "day" ? null : column.key}
          date={column.date}
          range={range}
        />
      ) : null}
      {/* `now` is set only when the view holds today. */}
      <NowLine now={now} range={range} today={column.isToday} />
    </div>
  );
}

export interface DayScheduleProps {
  view: Pick<CalendarDayView, "range" | "now" | "columns">;
  mode: ScheduleMode;
  visitHref: (visitId: string) => string;
  /** Where an availability window's details open. */
  availabilityHref?: (key: string) => string;
  openVisitId?: string | null;
  /** Adding a visit: clicks on the grid pick the time. */
  adding?: boolean;
  /** Keys of the columns shown narrow. */
  collapsed?: string[];
  /** Where a column's "zwiń / rozwiń" leads; none: no collapsing. */
  collapseHref?: (key: string) => string;
  ariaLabel: string;
  empty?: string;
}

/** A day (or a specialist's week): a column per specialist, room or day. */
export function DaySchedule({
  view,
  mode,
  visitHref,
  availabilityHref,
  openVisitId,
  adding = false,
  collapsed = [],
  collapseHref,
  ariaLabel,
  empty = "Nic do pokazania.",
}: DayScheduleProps) {
  if (!view.columns.length) {
    return (
      <p className="p-10 text-center text-sm text-[var(--text-muted)]">
        {empty}
      </p>
    );
  }
  const narrow = (column: CalendarColumn) => collapsed.includes(column.key);
  // One grid for the headers and the columns: each header sits on its
  // column's own track, so they line up whatever their content, and
  // hiding or collapsing columns moves both together.
  const tracks = view.columns.map((column) =>
    narrow(column)
      ? "54px"
      : mode === "personal"
        ? "minmax(120px, 1fr)"
        : "minmax(170px, 1fr)",
  );
  return (
    <section aria-label={ariaLabel} className={SCROLL}>
      <div
        className="grid w-full min-w-fit"
        style={{ gridTemplateColumns: `${AXIS_WIDTH}px ${tracks.join(" ")}` }}
      >
        <div className="sticky top-0 z-40 col-span-full grid grid-cols-subgrid border-b border-[var(--border)] bg-[var(--surface)]">
          <div className="sticky left-0 z-10 border-r border-[var(--border)] bg-[var(--surface)]" />
          {view.columns.map((column) => (
            <div
              className="min-w-0 border-r border-[var(--border)] [&>*]:border-b-0"
              key={column.key}
            >
              {narrow(column) && collapseHref ? (
                <CollapsedHeader
                  column={column}
                  expandHref={collapseHref(column.key)}
                />
              ) : (
                <ColumnHeader
                  collapseHref={collapseHref?.(column.key)}
                  column={column}
                />
              )}
            </div>
          ))}
        </div>
        <TimeAxis
          className="sticky left-0 z-30"
          now={view.now}
          range={view.range}
        />
        {view.columns.map((column) => (
          <ColumnBody
            className="min-w-0"
            column={column}
            compact={narrow(column)}
            key={column.key}
            mode={mode}
            now={view.now}
            openVisitId={openVisitId}
            range={view.range}
            visitHref={visitHref}
            adding={adding}
            availabilityHref={availabilityHref}
          />
        ))}
      </div>
    </section>
  );
}

function LaneHeader({
  lane,
  byRoom,
  className,
}: {
  lane: CalendarColumn;
  byRoom: boolean;
  /** Its right edge (stronger after a day's last lane). */
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex min-w-0 flex-col items-center justify-between gap-0.5 border-[var(--border)] px-0.5 py-1",
        className,
      )}
      data-unavailable={lane.unavailable || undefined}
      title={`${lane.title}\nObłożenie: ${lane.occupancy.percent}% (${visitsLabel(lane.occupancy.visitCount)})`}
    >
      {byRoom ? (
        <span className="mt-0.5 flex items-center gap-1">
          <PlaceMarker column={lane} size="sm" />
          <span className="text-[0.5625rem] leading-none font-bold text-[var(--text)]">
            {lane.short}
          </span>
        </span>
      ) : (
        <>
          <PersonAvatar
            avatarUrl={lane.avatarUrl}
            className="mt-0.5"
            color={lane.color}
            initials={lane.initials}
            name={lane.title}
            seed={lane.colorSeed}
            size={20}
          />
          <span className="w-full truncate text-center text-[0.5625rem] leading-none font-bold text-[var(--text)]">
            {lane.short}
          </span>
        </>
      )}
      <OccupancyChip
        occupancy={lane.occupancy}
        unavailable={lane.unavailable}
      />
    </div>
  );
}

export interface WeekComparisonProps {
  view: CalendarWeekView;
  byRoom: boolean;
  visitHref: (visitId: string) => string;
  availabilityHref?: (key: string) => string;
  openVisitId?: string | null;
  /** Adding a visit: clicks on the lanes pick the time. */
  adding?: boolean;
  ariaLabel: string;
}

/**
 * The week compared: per day a group of narrow lanes, a specialist's or
 * room's each, with the day's occupancy; visits as compact blocks.
 */
export function WeekComparison({
  view,
  byRoom,
  visitHref,
  availabilityHref,
  openVisitId,
  adding = false,
  ariaLabel,
}: WeekComparisonProps) {
  const height = rangeHeight(view.range);
  // One grid for the days, their lanes' headers and the lanes: a track
  // per lane (an empty day keeps one), a day's header across its lanes.
  // Headers and lanes share the tracks, so they always line up.
  const width = (day: CalendarWeekView["days"][number]) =>
    Math.max(1, day.lanes.length);
  const tracks = view.days.flatMap((day) =>
    Array.from({ length: width(day) }, () => "minmax(52px, 1fr)"),
  );
  const span = (day: CalendarWeekView["days"][number]) => ({
    gridColumn: `span ${width(day)} / span ${width(day)}`,
  });
  // The day's edge: a stronger line after its last lane.
  const edge = (last: boolean) =>
    last ? "border-r-2 border-r-[var(--border-strong)]" : "border-r";
  return (
    <section aria-label={ariaLabel} className={SCROLL}>
      <div
        className="grid w-full min-w-fit"
        style={{ gridTemplateColumns: `${AXIS_WIDTH}px ${tracks.join(" ")}` }}
      >
        <div className="sticky top-0 z-40 col-span-full grid grid-cols-subgrid border-b border-[var(--border)] bg-[var(--surface)]">
          <div className="sticky left-0 z-10 row-span-2 border-r border-[var(--border)] bg-[var(--surface)]" />
          {view.days.map((day) => (
            <div
              aria-current={day.isToday ? "date" : undefined}
              className={cn(
                "flex min-w-0 items-center justify-between gap-1 border-b border-[var(--border)] px-2 py-1.5",
                edge(true),
                day.isToday
                  ? "bg-[var(--primary-soft)]"
                  : "bg-[var(--surface)]",
              )}
              key={day.date}
              style={span(day)}
            >
              <span className="flex min-w-0 items-center gap-1.5 truncate">
                <span
                  className={cn(
                    "text-[0.8125rem] font-semibold",
                    day.isToday
                      ? "text-[var(--primary)]"
                      : "text-[var(--text)]",
                  )}
                >
                  {day.label}
                </span>
                {day.isToday ? (
                  <span className="rounded-[3px] bg-[var(--primary)] px-1 text-[0.625rem] font-semibold text-[var(--primary-foreground)]">
                    Dziś
                  </span>
                ) : null}
              </span>
              <OccupancyChip
                occupancy={day.occupancy}
                title={visitsLabel(day.occupancy.visitCount)}
              />
            </div>
          ))}
          {view.days.flatMap((day) =>
            day.lanes.length ? (
              day.lanes.map((lane, index) => (
                <LaneHeader
                  byRoom={byRoom}
                  className={edge(index === day.lanes.length - 1)}
                  key={`${day.date}-${lane.key}`}
                  lane={lane}
                />
              ))
            ) : (
              <span
                className={cn(
                  "flex items-center justify-center py-2 text-[0.6875rem] text-[var(--text-subtle)]",
                  edge(true),
                )}
                key={`${day.date}-none`}
                title={
                  byRoom
                    ? "Brak dostępnych gabinetów w tym dniu"
                    : "Brak dyżurów i wizyt w tym dniu"
                }
              >
                —
              </span>
            ),
          )}
        </div>
        <TimeAxis
          className="sticky left-0 z-30"
          now={view.now}
          range={view.range}
        />
        {view.days.map((day) => (
          <div
            aria-label={`${day.label}, ${visitsLabel(day.occupancy.visitCount)}, obłożenie ${day.occupancy.percent}%`}
            className="grid grid-cols-subgrid"
            key={day.date}
            role="group"
            style={span(day)}
          >
            {day.lanes.length ? (
              day.lanes.map((lane, index) => (
                <ColumnBody
                  className={cn(
                    "min-w-0",
                    edge(index === day.lanes.length - 1),
                  )}
                  column={lane}
                  compact
                  key={lane.key}
                  mode={byRoom ? "rooms" : "specialists"}
                  now={view.now}
                  openVisitId={openVisitId}
                  range={view.range}
                  visitHref={visitHref}
                  adding={adding}
                  availabilityHref={availabilityHref}
                />
              ))
            ) : (
              <div
                className={cn(
                  "relative flex flex-col items-center justify-center bg-[var(--surface-subtle)] text-[var(--text-muted)]",
                  edge(true),
                )}
                style={{ height }}
              >
                <span className="text-[0.625rem] font-medium tracking-wider uppercase">
                  Brak
                </span>
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

/**
 * The calendar under its bars, edge to edge as the bookings table: the
 * grid from md up (it scrolls inside itself, the headers and hours stuck),
 * the phone list below it, the visit's or a form's panel beside it, and
 * the week's summary as a drawer over it.
 */
export function ScheduleFrame({
  desktop,
  mobile,
  aside,
  panel,
}: {
  desktop: ReactNode;
  mobile: ReactNode;
  /** The week's summary (a drawer). */
  aside?: ReactNode;
  panel?: ReactNode;
}) {
  return (
    <div className="flex min-h-0 flex-1">
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <div className="hidden min-h-0 flex-1 flex-col md:flex">{desktop}</div>
        <div className="bg-[var(--surface-subtle)] p-3 md:hidden">{mobile}</div>
      </div>
      {panel}
      {aside}
    </div>
  );
}
