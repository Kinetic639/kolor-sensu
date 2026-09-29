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
  type CSSProperties,
  type HTMLAttributes,
  type PointerEvent,
  type ReactNode,
} from "react";
import { cn } from "./lib/utils";

// Week calendar primitives (docs/product/scheduling-ui-plan.md, K2): a grid
// of day columns over an hour axis, blocks placed by minutes (percentages,
// so the server renders them without measuring), and drag-to-create.

export interface CalendarColumn {
  key: string;
  label: string;
  sublabel?: string;
  isToday?: boolean;
  /** Accessible name of the day column. */
  ariaLabel: string;
  /** Under the date in the header, e.g. the day's hours. */
  summary?: ReactNode;
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
          <div className="border-r border-[var(--border)] p-3 text-center text-[0.6875rem] font-semibold text-[var(--text-subtle)]">
            {cornerLabel}
          </div>
          {columns.map((column) => (
            <div
              aria-current={column.isToday ? "date" : undefined}
              className={cn(
                "border-r border-[var(--border)] p-2.5 text-center last:border-r-0",
                column.isToday && "bg-[var(--primary-soft)]",
              )}
              key={column.key}
            >
              <p className="flex items-center justify-center gap-1.5 text-xs font-bold text-[var(--text)]">
                {column.label}
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

export type CalendarBlockVariant =
  "availability" | "appointment" | "blocked" | "closed" | "taken" | "preview";

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

const VARIANT_CLASSES: Record<CalendarBlockVariant, string> = {
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
  const total = range.end - range.start;
  const style = {
    top: `${((start - range.start) / total) * 100}%`,
    height: `${((end - start) / total) * 100}%`,
    "--block-accent": accent,
    "--block-tint": tint,
  } as CSSProperties;
  const classes = cn(
    "absolute z-10 overflow-hidden p-2 text-left text-xs",
    VARIANT_CLASSES[variant],
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
