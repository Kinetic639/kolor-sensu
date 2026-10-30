"use client";

import { useEffect, useRef, useState } from "react";
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
  const initialized = useRef<string | null>(null);
  const [result, setResult] = useState<{
    key: string;
    days: SlotPickerProps["days"];
    error: boolean;
  } | null>(null);
  const key = `${query}|${view}|${view === "week" ? week : month}|${retry}`;
  useEffect(() => {
    if (!active || result?.key === key) return;
    const controller = new AbortController();
    const bootstrap = initialized.current !== query;
    const read = async (suffix: string) => {
      const response = await fetch(`/api/booking/preview?${query}&${suffix}`, {
        signal: controller.signal,
        cache: "no-store",
      });
      if (!response.ok) throw Error("Availability unavailable");
      return (await response.json()) as { picker: SlotPickerProps };
    };
    void (async () => {
      let targetWeek = week;
      let targetMonth = month;
      let firstDays: SlotPickerProps["days"] | undefined;
      if (bootstrap) {
        const response = await read("najblizszy=1");
        firstDays = response.picker.days;
        const first = firstDays
          .filter(
            (day) =>
              day.slots.length && day.date >= today && day.date <= lastDay,
          )
          .map((day) => day.date)
          .sort()[0];
        targetWeek = monday(first ?? today);
        targetMonth = monthStart(first ?? today);
      }
      const weeks =
        view === "week"
          ? [targetWeek]
          : monthWeeks(targetMonth, today, lastDay);
      const days =
        view === "week" && firstDays
          ? firstDays
          : (
              await Promise.all(
                weeks.map(
                  async (date) => (await read(`tydzien=${date}`)).picker.days,
                ),
              )
            ).flat();
      if (!controller.signal.aborted) {
        if (bootstrap) {
          initialized.current = query;
          setWeek(targetWeek);
          setMonth(targetMonth);
        }
        setResult({
          key: `${query}|${view}|${view === "week" ? targetWeek : targetMonth}|${retry}`,
          days: days.filter(
            (day) =>
              day.date >= today &&
              day.date <= lastDay &&
              (view === "week" || day.date.startsWith(targetMonth.slice(0, 7))),
          ),
          error: false,
        });
      }
    })().catch(() => {
      if (!controller.signal.aborted) setResult({ key, days: [], error: true });
    });
    return () => controller.abort();
  }, [active, key, query, view, week, month, today, lastDay, retry, result]);
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
      key={query}
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
