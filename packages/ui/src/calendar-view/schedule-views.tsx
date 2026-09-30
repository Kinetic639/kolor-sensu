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
  rangeHeight,
  TimeAxis,
  VisitCard,
} from "./schedule-parts";

// The calendar's grids, after the reference: the day (a column per
// specialist, room or day, full or collapsed) and the week comparison (per
// day, a narrow lane per specialist or room). Rendered on the server; the
// frame scrolls both ways with the headers and the hours stuck.

export type ScheduleMode = "specialists" | "rooms" | "personal";

const SCROLL =
  "max-h-[calc(100dvh-15rem)] min-h-[24rem] overflow-auto overscroll-contain";

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
      {column.isToday ? <NowLine now={now} range={range} /> : null}
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
  const width = (column: CalendarColumn) =>
    narrow(column)
      ? "w-[54px]"
      : mode === "personal"
        ? "min-w-[120px] flex-1"
        : "min-w-[170px] flex-1";
  return (
    <section aria-label={ariaLabel} className={SCROLL}>
      <div className="flex w-full min-w-fit flex-col">
        <div className="sticky top-0 z-40 flex border-b border-[var(--border)] bg-[var(--surface-subtle)]">
          <div className="sticky left-0 z-10 w-14 shrink-0 border-r border-[var(--border)] bg-[var(--surface-subtle)]" />
          {view.columns.map((column) => (
            <div
              className={cn(
                "shrink-0 border-r border-[var(--border)]",
                width(column),
              )}
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
        <div className="flex">
          <TimeAxis
            className="sticky left-0 z-30"
            now={view.now}
            range={view.range}
          />
          {view.columns.map((column) => (
            <ColumnBody
              className={width(column)}
              column={column}
              compact={narrow(column)}
              key={column.key}
              mode={mode}
              now={view.now}
              openVisitId={openVisitId}
              range={view.range}
              visitHref={visitHref}
              availabilityHref={availabilityHref}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

// A lane is at least 52px; with few lanes they share the width.
const LANE = "min-w-[52px] flex-1";
const groupStyle = (lanes: number) => {
  const count = Math.max(1, lanes);
  return { flex: `${count} 1 ${count * 52}px` };
};

function LaneHeader({
  lane,
  byRoom,
}: {
  lane: CalendarColumn;
  byRoom: boolean;
}) {
  return (
    <div
      className={cn(
        "flex shrink-0 flex-col items-center justify-between gap-0.5 border-r border-[var(--border)] px-0.5 py-1 last:border-r-0",
        LANE,
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
  ariaLabel,
}: WeekComparisonProps) {
  const height = rangeHeight(view.range);
  return (
    <section aria-label={ariaLabel} className={SCROLL}>
      <div className="flex w-full min-w-fit flex-col">
        <div className="sticky top-0 z-40 border-b border-[var(--border)] bg-[var(--surface-subtle)] shadow-sm">
          <div className="flex border-b border-[var(--border)]">
            <div className="sticky left-0 z-10 w-14 shrink-0 border-r border-[var(--border)] bg-[var(--surface-subtle)]" />
            {view.days.map((day) => (
              <div
                aria-current={day.isToday ? "date" : undefined}
                className={cn(
                  "flex shrink-0 items-center justify-between gap-1 border-r-2 border-[var(--border-strong)] px-2 py-1.5",
                  day.isToday
                    ? "bg-[var(--primary-soft)]"
                    : "bg-[var(--surface-subtle)]",
                )}
                key={day.date}
                style={groupStyle(day.lanes.length)}
              >
                <span className="flex min-w-0 items-center gap-1.5 truncate">
                  <span
                    className={cn(
                      "text-[0.6875rem] font-bold tracking-tight",
                      day.isToday
                        ? "text-[var(--primary)]"
                        : "text-[var(--text)]",
                    )}
                  >
                    {day.label}
                  </span>
                  {day.isToday ? (
                    <span className="rounded-sm bg-[var(--primary)] px-1 text-[0.5625rem] font-semibold text-[var(--primary-foreground)]">
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
          </div>
          <div className="flex">
            <div className="sticky left-0 z-10 w-14 shrink-0 border-r border-[var(--border)] bg-[var(--surface-subtle)]" />
            {view.days.map((day) => (
              <div
                className="flex shrink-0 border-r-2 border-[var(--border-strong)]"
                key={day.date}
                style={groupStyle(day.lanes.length)}
              >
                {day.lanes.length ? (
                  day.lanes.map((lane) => (
                    <LaneHeader byRoom={byRoom} key={lane.key} lane={lane} />
                  ))
                ) : (
                  <span
                    className={cn(
                      "flex items-center justify-center py-2 text-[0.5625rem] text-[var(--text-subtle)]",
                      LANE,
                    )}
                    title={
                      byRoom
                        ? "Brak dostępnych gabinetów w tym dniu"
                        : "Brak dyżurów i wizyt w tym dniu"
                    }
                  >
                    —
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
        <div className="flex">
          <TimeAxis
            className="sticky left-0 z-30"
            now={view.now}
            range={view.range}
          />
          {view.days.map((day) => (
            <div
              aria-label={`${day.label}, ${visitsLabel(day.occupancy.visitCount)}, obłożenie ${day.occupancy.percent}%`}
              className="flex border-r-2 border-[var(--border-strong)]"
              key={day.date}
              role="group"
              style={groupStyle(day.lanes.length)}
            >
              {day.lanes.length ? (
                day.lanes.map((lane) => (
                  <ColumnBody
                    className={cn(LANE, "last:border-r-0")}
                    column={lane}
                    compact
                    key={lane.key}
                    mode={byRoom ? "rooms" : "specialists"}
                    now={view.now}
                    openVisitId={openVisitId}
                    range={view.range}
                    visitHref={visitHref}
                    availabilityHref={availabilityHref}
                  />
                ))
              ) : (
                <div
                  className={cn(
                    "relative flex flex-col items-center justify-center bg-[var(--surface-subtle)] text-[var(--text-muted)]",
                    LANE,
                  )}
                  style={{ height }}
                >
                  <span className="text-[0.5rem] font-medium tracking-wider uppercase">
                    Brak
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/**
 * The calendar's card: the grid from md up, the phone list below it, a
 * summary beside it, and the visit's panel next to the card.
 */
export function ScheduleFrame({
  desktop,
  mobile,
  aside,
  panel,
}: {
  desktop: ReactNode;
  mobile: ReactNode;
  aside?: ReactNode;
  panel?: ReactNode;
}) {
  return (
    <div className="flex items-start gap-4">
      <div className="flex min-w-0 flex-1 overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-sm">
        <div className="min-w-0 flex-1">
          <div className="hidden md:block">{desktop}</div>
          <div className="bg-[var(--surface-subtle)] p-3 md:hidden">
            {mobile}
          </div>
        </div>
        {aside}
      </div>
      {panel}
    </div>
  );
}
