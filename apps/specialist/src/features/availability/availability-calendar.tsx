"use client";

import type { SpecialistAvailabilityRule } from "@repo/contracts";
import { minutesToTime, type MinuteRange } from "@repo/scheduling";
import { AvailabilityBlockBody, RoomTakenBody } from "@repo/ui/availability";
import {
  CalendarBlock,
  CalendarWeekGrid,
  useDragToCreate,
  type DragSelection,
} from "@repo/ui/calendar";
import { Plus } from "lucide-react";
import { useCallback, useMemo } from "react";
import { useAvailabilityEditor } from "./editor";
import type { CalendarDayViewModel } from "./types";

/** The week of availability: drag to add, click a block to edit it. */
export function AvailabilityCalendar({
  days,
  range,
  rules,
  roomAccent,
}: {
  days: CalendarDayViewModel[];
  range: MinuteRange;
  rules: SpecialistAvailabilityRule[];
  /** Colour of the room shown over the calendar. */
  roomAccent?: string;
}) {
  const editor = useAvailabilityEditor();
  const ruleById = useMemo(
    () => new Map(rules.map((rule) => [rule.id, rule])),
    [rules],
  );
  const dayByDate = useMemo(
    () => new Map(days.map((day) => [day.date, day])),
    [days],
  );

  const onCreate = useCallback(
    (selection: DragSelection) => {
      const day = dayByDate.get(selection.columnKey);
      editor.openQuickCreate({
        date: selection.columnKey,
        startsAt: minutesToTime(selection.start),
        endsAt: minutesToTime(selection.end),
        dayLabel: day?.fullLabel ?? selection.columnKey,
      });
    },
    [dayByDate, editor],
  );
  const drag = useDragToCreate({ range, onCreate });

  return (
    <CalendarWeekGrid
      columns={days.map((day) => ({
        key: day.date,
        label: day.label,
        sublabel: day.sublabel,
        isToday: day.isToday,
        ariaLabel: day.fullLabel,
        props: drag.columnProps(day.date),
        summary: (
          <div className="flex items-center justify-center gap-1">
            {day.hoursLabel ? (
              <span className="rounded bg-[var(--primary-soft)] px-1.5 py-0.5 text-[0.625rem] font-semibold text-[var(--primary)]">
                {day.hoursLabel.replace(" godz.", "h")} dyżuru
              </span>
            ) : (
              <span className="text-[0.625rem] text-[var(--text-subtle)]">
                Brak dyżuru
              </span>
            )}
            <button
              aria-label={`Dodaj dostępność: ${day.fullLabel}`}
              className="rounded p-0.5 text-[var(--text-muted)] hover:bg-[var(--surface-muted)] hover:text-[var(--primary)] focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:outline-none"
              onClick={() =>
                editor.openRule(null, {
                  prefill: {
                    validFrom: day.date,
                    startsAt: "09:00",
                    endsAt: "17:00",
                  },
                })
              }
              type="button"
            >
              <Plus aria-hidden="true" className="size-3.5" />
            </button>
          </div>
        ),
        content: (
          <>
            {day.room.closed.map((one) => (
              <CalendarBlock
                end={one.end}
                key={`closed-${one.start}`}
                label={`${one.label}, ${minutesToTime(one.start)}–${minutesToTime(one.end)}`}
                range={range}
                start={one.start}
                variant="closed"
              >
                {one.end - one.start >= 60 ? one.label : null}
              </CalendarBlock>
            ))}
            {day.room.busy.map((one) => (
              <CalendarBlock
                accent={roomAccent}
                end={one.end}
                key={one.id}
                label={one.label}
                range={range}
                start={one.start}
                variant="taken"
              >
                <RoomTakenBody
                  name={one.specialistName}
                  timeLabel={one.timeLabel}
                />
              </CalendarBlock>
            ))}
            {day.timeOff.map((off) => (
              <CalendarBlock
                end={off.end}
                key={off.id}
                label={`${off.label}, ${minutesToTime(off.start)}–${minutesToTime(off.end)}`}
                range={range}
                start={off.start}
                variant="blocked"
              >
                <span className="font-semibold text-[var(--text-muted)]">
                  {off.label}
                </span>
              </CalendarBlock>
            ))}
            {day.windows.map((window) => {
              const rule = ruleById.get(window.ruleId);
              return (
                <CalendarBlock
                  accent={window.accent}
                  end={window.end}
                  key={window.id}
                  label={`Dostępność ${window.timeLabel}, ${window.placeLabel}. Edytuj`}
                  onClick={
                    rule
                      ? () =>
                          editor.openRule(rule, { occurrenceDate: day.date })
                      : undefined
                  }
                  range={range}
                  start={window.start}
                  tint={window.tint}
                >
                  <AvailabilityBlockBody
                    hint={
                      window.end - window.start >= 120
                        ? "Kliknij, aby edytować"
                        : undefined
                    }
                    mode={window.mode}
                    note={window.note}
                    placeLabel={window.placeLabel}
                    timeLabel={window.timeLabel}
                  />
                </CalendarBlock>
              );
            })}
            {drag.preview?.columnKey === day.date ? (
              <CalendarBlock
                end={drag.preview.end}
                label={`Nowa dostępność ${minutesToTime(drag.preview.start)}–${minutesToTime(drag.preview.end)}`}
                range={range}
                start={drag.preview.start}
                variant="preview"
              >
                <span className="inline-flex rounded bg-[var(--primary)] px-2 py-1 font-bold text-white tabular-nums shadow-sm">
                  {minutesToTime(drag.preview.start)} –{" "}
                  {minutesToTime(drag.preview.end)}
                </span>
                <span className="mt-1 block text-center text-[0.6875rem] font-semibold text-[var(--primary)]">
                  Puść, aby zapisać dostępność
                </span>
              </CalendarBlock>
            ) : null}
          </>
        ),
      }))}
      range={range}
    />
  );
}
