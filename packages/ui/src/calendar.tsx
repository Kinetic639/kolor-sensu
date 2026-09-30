"use client";

import {
  dragRangeAround,
  minutesToTime,
  pointerToMinutes,
  type MinuteRange,
} from "@repo/scheduling";
import {
  useCallback,
  useRef,
  useState,
  type HTMLAttributes,
  type PointerEvent,
  type ReactNode,
} from "react";
import {
  blockStyle,
  CALENDAR_BLOCK_CLASSES,
  type CalendarBlockVariant,
} from "./calendar-block-style";
import { cn } from "./lib/utils";

export type { CalendarBlockVariant };

// Week calendar primitives (docs/product/scheduling-ui-plan.md, K2): a grid
// of day columns over an hour axis, blocks placed by minutes (percentages,
// so the server renders them without measuring), and drag-to-create.

export interface CalendarColumn {
  key: string;
  label: string;
  sublabel?: string;
  /** Before the label, e.g. a specialist's picture. */
  icon?: ReactNode;
  isToday?: boolean;
  /** Accessible name of the day column. */
  ariaLabel: string;
  /** Under the date in the header, always shown (e.g. an "add" button). */
  summary?: ReactNode;
  /**
   * Shown in place of the date while the header is hovered or focused
   * (e.g. the day's opening hours); screen readers always get it.
   */
  hint?: ReactNode;
  /** Blocks placed in the column. */
  content?: ReactNode;
  /** Event handlers for the column, e.g. from useDragToCreate. */
  props?: HTMLAttributes<HTMLDivElement>;
}

export interface CalendarWeekGridProps {
  columns: CalendarColumn[];
  range: MinuteRange;
  /** Height of one hour, in pixels. */
  hourHeight?: number;
  cornerLabel?: string;
  className?: string;
}

export function CalendarWeekGrid({
  columns,
  range,
  hourHeight = 64,
  cornerLabel = "Godzina",
  className,
}: CalendarWeekGridProps) {
  const hours: number[] = [];
  for (let minute = range.start; minute < range.end; minute += 60) {
    hours.push(minute);
  }
  const template = `4rem repeat(${columns.length}, minmax(6.5rem, 1fr))`;

  return (
    <div className={cn("overflow-x-auto", className)}>
      <div className="min-w-[52rem]">
        <div
          className="sticky top-0 z-20 grid border-b border-[var(--border)] bg-[var(--surface-subtle)]"
          style={{ gridTemplateColumns: template }}
        >
          <div className="flex items-center justify-center border-r border-[var(--border)] px-2 py-1.5 text-[0.6875rem] font-semibold text-[var(--text-subtle)]">
            {cornerLabel}
          </div>
          {columns.map((column) => (
            <div
              aria-current={column.isToday ? "date" : undefined}
              className={cn(
                "group/header relative border-r border-[var(--border)] px-2 py-1.5 text-center outline-none last:border-r-0 focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-inset",
                column.isToday && "bg-[var(--primary-soft)]",
              )}
              data-column-header=""
              key={column.key}
              tabIndex={column.hint ? 0 : undefined}
            >
              <div
                className={cn(
                  "leading-tight transition-opacity",
                  column.hint &&
                    "group-hover/header:opacity-0 group-focus-visible/header:opacity-0",
                )}
              >
                <p className="flex items-center justify-center gap-1.5 text-xs font-bold text-[var(--text)]">
                  {column.icon}
                  <span className="truncate">{column.label}</span>
                  {column.isToday ? (
                    <span
                      aria-hidden="true"
                      className="size-1.5 rounded-full bg-[var(--primary)]"
                    />
                  ) : null}
                </p>
                {column.sublabel ? (
                  <p className="text-[0.6875rem] text-[var(--text-muted)]">
                    {column.sublabel}
                  </p>
                ) : null}
              </div>
              {column.hint ? (
                <div className="absolute inset-0 flex items-center justify-center px-1 text-[0.6875rem] leading-tight font-semibold text-[var(--text)] opacity-0 transition-opacity group-hover/header:opacity-100 group-focus-visible/header:opacity-100">
                  {column.hint}
                </div>
              ) : null}
              {column.summary ? (
                <div className="mt-1">{column.summary}</div>
              ) : null}
            </div>
          ))}
        </div>

        <div
          className="relative grid select-none"
          style={{
            gridTemplateColumns: template,
            height: `${(hours.length || 1) * hourHeight}px`,
          }}
        >
          <div
            aria-hidden="true"
            className="relative border-r border-[var(--border)] bg-[var(--surface-subtle)] select-none"
          >
            {hours.map((minute, index) => (
              <span
                className="absolute right-2 -translate-y-1/2 text-[0.6875rem] font-medium text-[var(--text-subtle)] tabular-nums first:translate-y-0"
                key={minute}
                style={{ top: `${(index / hours.length) * 100}%` }}
              >
                {minutesToTime(minute)}
              </span>
            ))}
          </div>

          {/* Hour lines, with a fainter half-hour line. */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 right-0 left-16"
          >
            {hours.map((minute, index) => (
              <div
                className="absolute inset-x-0 border-t border-[var(--border)]"
                key={minute}
                style={{
                  top: `${(index / hours.length) * 100}%`,
                  height: `${100 / hours.length}%`,
                }}
              >
                <div className="absolute inset-x-0 top-1/2 border-t border-dashed border-[var(--surface-muted)]" />
              </div>
            ))}
          </div>

          {columns.map((column) => (
            <div
              {...column.props}
              aria-label={column.ariaLabel}
              className={cn(
                "relative border-r border-[var(--border)] last:border-r-0",
                column.isToday &&
                  "bg-[color-mix(in_srgb,var(--primary-soft)_40%,transparent)]",
                column.props?.className,
              )}
              key={column.key}
              role="group"
            >
              {column.content}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export interface CalendarBlockProps {
  range: MinuteRange;
  start: number;
  end: number;
  /** Accessible name: what, when and where. */
  label: string;
  variant?: CalendarBlockVariant;
  /** Accent colour (a CSS value such as `var(--resource-2)`). */
  accent?: string;
  /** Background tint for availability blocks. */
  tint?: string;
  onClick?: () => void;
  children: ReactNode;
  className?: string;
}

/** A block in a day column, placed by its minutes. */
export function CalendarBlock({
  range,
  start,
  end,
  label,
  variant = "availability",
  accent = "var(--primary)",
  tint = "var(--primary-soft)",
  onClick,
  children,
  className,
}: CalendarBlockProps) {
  const style = blockStyle({ range, start, end, accent, tint });
  const classes = cn(
    "absolute z-10 overflow-hidden p-2 text-left text-xs",
    CALENDAR_BLOCK_CLASSES[variant],
    onClick &&
      "cursor-pointer transition-shadow hover:z-20 hover:shadow-md focus-visible:z-20 focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:outline-none",
    className,
  );

  return onClick ? (
    <button
      aria-label={label}
      className={classes}
      data-calendar-item=""
      onClick={onClick}
      style={style}
      type="button"
    >
      {children}
    </button>
  ) : (
    <div
      aria-label={label}
      className={classes}
      data-calendar-item=""
      role={variant === "preview" ? "status" : "note"}
      style={style}
    >
      {children}
    </div>
  );
}

export interface DragSelection {
  columnKey: string;
  start: number;
  end: number;
}

/**
 * Press and drag down a day column to select a time range, snapped to
 * `step` minutes. Presses on blocks or buttons (`[data-calendar-item]`,
 * `button`, `a`) are left alone. `blocked` times of a column (e.g. a
 * room someone else has) cannot be selected: a press on one does nothing,
 * a drag stops at one. Keyboard users need another way in, such as an
 * "add" button per day.
 */
export function useDragToCreate({
  range,
  step = 15,
  onCreate,
  blocked,
}: {
  range: MinuteRange;
  step?: number;
  onCreate: (selection: DragSelection) => void;
  blocked?: (columnKey: string) => MinuteRange[];
}) {
  const [preview, setPreview] = useState<DragSelection | null>(null);
  const origin = useRef<{ columnKey: string; minute: number } | null>(null);

  const minuteAt = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      const rect = event.currentTarget.getBoundingClientRect();
      return pointerToMinutes(
        rect.height ? (event.clientY - rect.top) / rect.height : 0,
        range,
        step,
      );
    },
    [range, step],
  );

  const selectionFor = useCallback(
    (columnKey: string, from: number, to: number) => {
      const selection = dragRangeAround(
        from,
        to,
        range,
        blocked?.(columnKey) ?? [],
      );
      return selection ? { columnKey, ...selection } : null;
    },
    [blocked, range],
  );

  const columnProps = useCallback(
    (columnKey: string): HTMLAttributes<HTMLDivElement> => ({
      className: "cursor-crosshair touch-none select-none",
      onPointerDown: (event) => {
        if (event.button !== 0) return;
        const target = event.target as HTMLElement;
        if (target.closest("[data-calendar-item],button,a")) return;
        // No text selection while dragging across the grid.
        event.preventDefault();
        const minute = minuteAt(event);
        const selection = selectionFor(columnKey, minute, minute);
        // A press on a blocked time starts nothing.
        if (!selection) return;
        event.currentTarget.setPointerCapture?.(event.pointerId);
        origin.current = { columnKey, minute };
        setPreview(selection);
      },
      onPointerMove: (event) => {
        const start = origin.current;
        if (!start || start.columnKey !== columnKey) return;
        setPreview(selectionFor(columnKey, start.minute, minuteAt(event)));
      },
      onPointerUp: (event) => {
        const start = origin.current;
        origin.current = null;
        setPreview(null);
        if (!start || start.columnKey !== columnKey) return;
        event.currentTarget.releasePointerCapture?.(event.pointerId);
        const selection = selectionFor(
          columnKey,
          start.minute,
          minuteAt(event),
        );
        if (selection) onCreate(selection);
      },
      onPointerCancel: () => {
        origin.current = null;
        setPreview(null);
      },
    }),
    [minuteAt, onCreate, selectionFor],
  );

  return { preview, columnProps };
}
