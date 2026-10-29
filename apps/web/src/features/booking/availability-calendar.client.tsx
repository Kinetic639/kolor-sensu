"use client";

import { useEffect, useState } from "react";
import type { SlotPickerProps } from "@repo/ui/booking";
import {
  AvailabilityCalendar,
  type AvailabilityView,
} from "@repo/ui/public-site/availability-calendar";
import {
  monday,
  monthStart,
  monthWeeks,
  shiftDay,
  shiftMonth,
} from "@repo/ui/public-site/availability-calendar-dates";

export function AvailabilityCalendarClient({
  query,
  today,
  lastDay,
  active = true,
}: {
  query: string;
  today: string;
  lastDay: string;
  active?: boolean;
}) {
  const [view, setView] = useState<AvailabilityView>("week");
  const [week, setWeek] = useState(monday(today));
  const [month, setMonth] = useState(monthStart(today));
  const [retry, setRetry] = useState(0);
  const [result, setResult] = useState<{
    key: string;
    days: SlotPickerProps["days"];
    error: boolean;
  } | null>(null);
  const key = `${query}|${view}|${view === "week" ? week : month}|${retry}`;
  useEffect(() => {
    if (!active) return;
    const controller = new AbortController();
    const weeks = view === "week" ? [week] : monthWeeks(month, today, lastDay);
    void Promise.all(
      weeks.map(async (date) => {
        const response = await fetch(
          `/api/booking/preview?${query}&tydzien=${date}`,
          { signal: controller.signal, cache: "no-store" },
        );
        if (!response.ok) throw Error("Availability unavailable");
        return ((await response.json()) as { picker: SlotPickerProps }).picker
          .days;
      }),
    )
      .then((days) => {
        if (!controller.signal.aborted)
          setResult({
            key,
            days: days
              .flat()
              .filter(
                (day) =>
                  day.date >= today &&
                  day.date <= lastDay &&
                  (view === "week" || day.date.startsWith(month.slice(0, 7))),
              ),
            error: false,
          });
      })
      .catch(() => {
        if (!controller.signal.aborted)
          setResult({ key, days: [], error: true });
      });
    return () => controller.abort();
  }, [active, key, query, view, week, month, today, lastDay]);
  useEffect(() => {
    if (!active) return;
    const refresh = () => setRetry((value) => value + 1);
    window.addEventListener("focus", refresh);
    return () => window.removeEventListener("focus", refresh);
  }, [active]);
  const current = result?.key === key ? result : null;
  const days = (current?.days ?? []).filter(
    (day) => view === "month" || day.date <= shiftDay(week, 4),
  );
  return (
    <AvailabilityCalendar
      view={view}
      month={month}
      week={week}
      today={today}
      lastDay={lastDay}
      days={days}
      status={!current ? "loading" : current.error ? "error" : "ready"}
      skeletonRows={Math.max(
        8,
        ...(result?.days ?? []).map((day) => day.slots.length),
      )}
      onViewChange={(next) => setView(next)}
      onNavigate={(direction) => {
        if (view === "week") setWeek((value) => shiftDay(value, direction * 7));
        else setMonth((value) => shiftMonth(value, direction));
      }}
      onRetry={() => setRetry((value) => value + 1)}
    />
  );
}
