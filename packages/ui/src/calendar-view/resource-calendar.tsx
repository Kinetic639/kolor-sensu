import type {
  CalendarBlockModel,
  CalendarColumnModel,
  CalendarViewModel,
  MinuteRange,
} from "@repo/scheduling";
import type { ReactNode } from "react";
import { CalendarWeekGrid } from "../calendar";
import { blockStyle, CALENDAR_BLOCK_CLASSES } from "../calendar-block-style";
import { cn } from "../lib/utils";
import { PageLink as Link } from "../public-site/page-link";
import { resourceColors } from "../resource-colors";

// The calendar views (docs/product/scheduling-ui-plan.md, K5), rendered on
// the server: a column per specialist, room or day; availability as the
// calm background, visits as cards over it that open their details (a
// link, so the state stays in the address), the line for now on today.

export interface ResourceCalendarProps {
  view: CalendarViewModel;
  /** Accessible name of the whole grid. */
  ariaLabel: string;
  /** Where a visit's card leads (its details beside the calendar). */
  visitHref: (visitId: string) => string;
  /** The visit whose details are open. */
  openVisitId?: string | null;
  /** Before a column's name, by its key (e.g. a specialist's picture). */
  icons?: Record<string, ReactNode>;
  /** Shown instead of the grid when there are no columns. */
  empty?: string;
  hourHeight?: number;
  className?: string;
}

function OccupancyBar({ value }: { value: number }) {
  const over = value > 100;
  return (
    <div className="flex items-center justify-center gap-1.5">
      <div
        aria-hidden="true"
        className="h-1 w-14 overflow-hidden rounded-full bg-[var(--surface-muted)]"
      >
        <div
          className={cn(
            "h-full rounded-full",
            over ? "bg-[var(--danger)]" : "bg-[var(--primary)]",
          )}
          style={{ width: `${Math.min(value, 100)}%` }}
        />
      </div>
      <span
        className={cn(
          "text-[0.625rem] font-semibold tabular-nums",
          over ? "text-[var(--danger)]" : "text-[var(--text-muted)]",
        )}
        title={over ? "Więcej wizyt niż godzin dostępności" : "Obłożenie"}
      >
        {value}%
      </span>
    </div>
  );
}

function ColumnSummary({ column }: { column: CalendarColumnModel }) {
  return (
    <div className="grid gap-0.5">
      {column.sublabel && column.hours ? (
        <p className="text-[0.625rem] text-[var(--text-muted)] tabular-nums">
          {column.hours}
        </p>
      ) : null}
      <p className="truncate text-[0.625rem] text-[var(--text-muted)]">
        {column.summary}
      </p>
      {column.occupancy !== null ? (
        <OccupancyBar value={column.occupancy} />
      ) : null}
    </div>
  );
}

function AvailabilityBlock({
  block,
  range,
}: {
  block: CalendarBlockModel;
  range: MinuteRange;
}) {
  const colors = resourceColors(block.color, block.colorSeed);
  return (
    <div
      aria-label={block.label}
      className={cn(
        "absolute z-0 overflow-hidden p-1.5",
        CALENDAR_BLOCK_CLASSES.availability,
        "border-l-[3px] shadow-none",
      )}
      role="note"
      style={blockStyle({ range, ...block, ...colors })}
    >
      <span className="inline-flex max-w-full items-center gap-1 truncate rounded-full bg-[var(--surface)]/80 px-1.5 py-px text-[0.625rem] font-semibold text-[var(--text-muted)] tabular-nums">
        {block.time} · {block.title}
      </span>
    </div>
  );
}

function VisitCard({
  block,
  range,
  href,
  open,
}: {
  block: CalendarBlockModel;
  range: MinuteRange;
  href: string;
  open: boolean;
}) {
  const colors = resourceColors(block.color, block.colorSeed);
  const compact = block.end - block.start < 45;
  const width = 100 / block.lanes;
  return (
    <Link
      aria-current={open ? "true" : undefined}
      aria-label={block.label}
      className={cn(
        "absolute z-10 flex flex-col overflow-hidden rounded-[var(--radius-control)] border border-l-4 border-[var(--border-strong)] border-l-[var(--block-accent)] bg-[var(--surface)] px-1.5 py-1 text-left text-[0.6875rem] leading-tight shadow-sm transition-shadow",
        "hover:z-20 hover:shadow-md focus-visible:z-20 focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:outline-none",
        block.pending && "border-dashed bg-[var(--warning-soft)]",
        open && "z-20 ring-2 ring-[var(--primary)]",
      )}
      data-calendar-item=""
      href={href}
      scroll={false}
      style={{
        ...blockStyle({ range, ...block, ...colors }),
        left: `calc(${block.lane * width}% + 0.25rem)`,
        width: `calc(${width}% - 0.5rem)`,
      }}
    >
      <span className={cn("min-w-0", compact && "flex items-baseline gap-1.5")}>
        <span className="font-semibold text-[var(--text-muted)] tabular-nums">
          {compact ? block.time.slice(0, 5) : block.time}
        </span>{" "}
        <span className="truncate font-semibold text-[var(--text)]">
          {block.title}
        </span>
      </span>
      {!compact ? (
        <span className="truncate text-[var(--text-muted)]">
          {block.subtitle}
        </span>
      ) : null}
      {!compact && block.meta ? (
        <span className="truncate text-[var(--text-subtle)]">{block.meta}</span>
      ) : null}
      {block.pending && !compact ? (
        <span className="mt-auto truncate font-semibold text-[var(--warning-foreground)]">
          Czeka na płatność
        </span>
      ) : null}
    </Link>
  );
}

function NowLine({ minute, range }: { minute: number; range: MinuteRange }) {
  if (minute < range.start || minute > range.end) return null;
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-x-0 z-30 h-0.5 -translate-y-1/2 bg-[var(--danger)]"
      data-now-line=""
      style={{
        top: `${((minute - range.start) / (range.end - range.start)) * 100}%`,
      }}
    >
      <span className="absolute top-1/2 -left-1 size-2 -translate-y-1/2 rounded-full bg-[var(--danger)]" />
    </div>
  );
}

export function ResourceCalendar({
  view,
  ariaLabel,
  visitHref,
  openVisitId,
  icons,
  empty = "Nic do pokazania.",
  hourHeight = 64,
  className,
}: ResourceCalendarProps) {
  if (!view.columns.length) {
    return (
      <p className="rounded-[var(--radius-surface)] border border-dashed border-[var(--border)] p-6 text-center text-sm text-[var(--text-muted)]">
        {empty}
      </p>
    );
  }
  const { range } = view;
  return (
    <section aria-label={ariaLabel} className={className}>
      <CalendarWeekGrid
        columns={view.columns.map((column) => {
          const sublabel =
            column.sublabel ?? column.hours ?? "Brak dostępności";
          return {
            key: column.key,
            label: column.label,
            sublabel,
            icon: icons?.[column.key],
            isToday: column.isToday,
            ariaLabel: [
              column.label,
              column.sublabel,
              column.hours ?? "brak dostępności",
              column.summary,
            ]
              .filter(Boolean)
              .join(", "),
            summary: <ColumnSummary column={column} />,
            content: (
              <>
                {column.blocks.map((block) =>
                  block.kind === "availability" ? (
                    <AvailabilityBlock
                      block={block}
                      key={block.key}
                      range={range}
                    />
                  ) : (
                    <VisitCard
                      block={block}
                      href={visitHref(block.visitId!)}
                      key={block.key}
                      open={block.visitId === openVisitId}
                      range={range}
                    />
                  ),
                )}
                {column.isToday && view.nowMinute !== null ? (
                  <NowLine minute={view.nowMinute} range={range} />
                ) : null}
              </>
            ),
          };
        })}
        hourHeight={hourHeight}
        range={range}
      />
    </section>
  );
}
