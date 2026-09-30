"use client";

import { minutesToTime, snapMinutes, type MinuteRange } from "@repo/scheduling";
import { useQueryStates } from "nuqs";
import { useState, useTransition, type MouseEvent } from "react";
import { calendarParsers } from "./params";
import { HOUR_HEIGHT } from "./schedule-geometry";

// Adding a visit (K5): in adding mode each column takes a click on a free
// place and opens the new visit's form at that time (a quarter hour),
// with the column's specialist or room. Visits stay on top and still open
// their details. The keyboard's way in is "Otwórz formularz ręcznie".

export function SlotPickLayer({
  range,
  date,
  column,
}: {
  range: MinuteRange;
  /** The column's local date. */
  date: string;
  /** Its specialist or room (none: one's own week). */
  column: string | null;
}) {
  const [, startTransition] = useTransition();
  const [hover, setHover] = useState<number | null>(null);
  const [, setParams] = useQueryStates(
    {
      nowa: calendarParsers.nowa,
      termin: calendarParsers.termin,
      kolumna: calendarParsers.kolumna,
      wizyta: calendarParsers.wizyta,
      okno: calendarParsers.okno,
    },
    { shallow: false, startTransition, clearOnDefault: true },
  );

  const minuteAt = (event: MouseEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const minute =
      range.start + ((event.clientY - rect.top) / HOUR_HEIGHT) * 60;
    return Math.min(
      range.end - 15,
      Math.max(range.start, snapMinutes(minute, 15)),
    );
  };

  return (
    <div
      aria-hidden="true"
      className="absolute inset-0 z-[16] cursor-cell hover:bg-[color-mix(in_srgb,var(--primary)_5%,transparent)]"
      data-slot-picker=""
      onClick={(event) =>
        void setParams({
          nowa: true,
          termin: `${date}T${minutesToTime(minuteAt(event))}`,
          kolumna: column,
          wizyta: null,
          okno: null,
        })
      }
      onMouseLeave={() => setHover(null)}
      onMouseMove={(event) => setHover(minuteAt(event))}
      title="Kliknij, aby dodać wizytę w tym miejscu"
    >
      {hover !== null ? (
        <span
          className="pointer-events-none absolute inset-x-1 rounded-sm border border-dashed border-[var(--primary)] bg-[color-mix(in_srgb,var(--primary)_12%,transparent)] px-1 text-[0.625rem] font-semibold text-[var(--primary)] tabular-nums"
          style={{ top: ((hover - range.start) / 60) * HOUR_HEIGHT }}
        >
          + {minutesToTime(hover)}
        </span>
      ) : null}
    </div>
  );
}
