"use client";

import { useMemo, useState } from "react";
import {
  QueryClientProvider,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import type { SlotPickerProps } from "@repo/ui/booking";
import {
  AvailabilityCalendar,
  type AvailabilityView,
  type AvailabilityDay,
  type AvailabilityChoice,
} from "@repo/ui/public-site/availability-calendar";
import {
  monday,
  monthStart,
  monthWeeks,
  shiftDay,
  shiftMonth,
} from "@repo/ui/public-site/availability-calendar-dates";
import {
  getAvailabilityQueryClient,
  AVAILABILITY_STALE_MS,
} from "./availability-query";

type Result = {
  picker: Omit<SlotPickerProps, "days"> & { days: AvailabilityDay[] };
  from?: string;
  to?: string;
};
interface Props {
  query: string;
  today: string;
  lastDay: string;
  active?: boolean;
  endpoint?: string;
  rangeRequests?: boolean;
  onChoose?: (choice: AvailabilityChoice) => void;
}
function filtered(result: Result, service: string): Result {
  return {
    ...result,
    picker: {
      ...result.picker,
      days: result.picker.days.map((day) => ({
        ...day,
        slots: day.slots.flatMap((slot) => {
          const options = slot.options?.filter(
            (one) => one.service === service,
          );
          return options?.length ? [{ ...slot, href: options[0]!.href }] : [];
        }),
      })),
    },
  };
}
export function AvailabilityCalendarClient(props: Props) {
  return (
    <QueryClientProvider client={getAvailabilityQueryClient()}>
      <CalendarData {...props} />
    </QueryClientProvider>
  );
}
function CalendarData({
  query,
  today,
  lastDay,
  active = true,
  endpoint = "/api/booking/preview",
  rangeRequests = false,
  onChoose,
}: Props) {
  const client = useQueryClient();
  const [view, setView] = useState<AvailabilityView>("week");
  const [navigation, setNavigation] = useState<{
    scope: string;
    week: string;
    month: string;
  } | null>(null);
  const scope = `${endpoint}|${query}|${today}|${lastDay}`;
  const key = (suffix: string, search = query) =>
    ["availability", endpoint, search, today, lastDay, suffix] as const;
  const read = async (suffix: string, signal: AbortSignal): Promise<Result> => {
    // A chosen service is a projection of the already loaded specialist's hours.
    const params = new URLSearchParams(query);
    const service = params.get("usluga");
    if (rangeRequests && suffix.startsWith("tydzien=")) {
      const week = suffix.slice("tydzien=".length);
      const allParams = new URLSearchParams(query);
      allParams.delete("usluga");
      const cachedMonths = client.getQueriesData<Result>({
        queryKey: [
          "availability",
          endpoint,
          allParams.toString(),
          today,
          lastDay,
        ],
      });
      for (const [monthKey, monthData] of cachedMonths) {
        const state = client.getQueryState(monthKey);
        if (
          String(monthKey[5]).startsWith("miesiac=") &&
          monthData?.from &&
          monthData.to &&
          monthData.from <= week &&
          monthData.to >= shiftDay(week, 6) &&
          state &&
          Date.now() - state.dataUpdatedAt < AVAILABILITY_STALE_MS
        ) {
          const source = service ? filtered(monthData, service) : monthData;
          return {
            ...source,
            from: week,
            to: shiftDay(week, 6),
            picker: {
              ...source.picker,
              days: source.picker.days.filter(
                (day) => day.date >= week && day.date <= shiftDay(week, 6),
              ),
            },
          };
        }
      }
    }
    if (rangeRequests && service) {
      params.delete("usluga");
      const allKey = key(suffix, params.toString());
      const all = client.getQueryData<Result>(allKey);
      const state = client.getQueryState(allKey);
      if (
        all &&
        state &&
        Date.now() - state.dataUpdatedAt < AVAILABILITY_STALE_MS
      ) {
        const projection = filtered(all, service);
        if (
          suffix !== "najblizszy=1" ||
          projection.picker.days.some((day) => day.slots.length)
        )
          return projection;
      }
    }
    const response = await fetch(`${endpoint}?${query}&${suffix}`, {
      signal,
      cache: "no-store",
    });
    if (!response.ok) throw Error("Availability unavailable");
    return (await response.json()) as Result;
  };
  const nearest = useQuery({
    queryKey: key("najblizszy=1"),
    queryFn: ({ signal }) => read("najblizszy=1", signal),
    enabled: active,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
  const first = nearest.data?.picker.days
    .filter(
      (day) => day.slots.length && day.date >= today && day.date <= lastDay,
    )
    .map((day) => day.date)
    .sort()[0];
  const week =
    navigation?.scope === scope ? navigation.week : monday(first ?? today);
  const month =
    navigation?.scope === scope ? navigation.month : monthStart(first ?? today);
  const suffix = view === "week" ? `tydzien=${week}` : `miesiac=${month}`;
  const current = useQuery({
    queryKey: key(suffix),
    enabled: active && nearest.isSuccess,
    queryFn: async ({ signal }) => {
      if (view === "week" || rangeRequests) return read(suffix, signal);
      const results = await Promise.all(
        monthWeeks(month, today, lastDay).map((date) =>
          read(`tydzien=${date}`, signal),
        ),
      );
      return {
        picker: {
          weekLabel: "",
          days: results.flatMap((result) => result.picker.days),
        },
      };
    },
    initialData: () =>
      view === "week" && nearest.data && (!first || monday(first) === week)
        ? nearest.data
        : undefined,
    initialDataUpdatedAt: nearest.dataUpdatedAt,
  });
  const days = useMemo(
    () =>
      (current.data?.picker.days ?? []).filter(
        (day) =>
          day.date >= today &&
          day.date <= lastDay &&
          (view === "month"
            ? day.date.startsWith(month.slice(0, 7))
            : day.date >= week && day.date <= shiftDay(week, 4)),
      ),
    [current.data, today, lastDay, view, month, week],
  );
  const error = nearest.isError || current.isError;
  const loading = !current.data || current.isFetching;
  return (
    <AvailabilityCalendar
      key={query}
      view={view}
      month={month}
      week={week}
      today={today}
      lastDay={lastDay}
      days={days}
      status={error ? "error" : loading ? "loading" : "ready"}
      skeletonRows={Math.max(8, ...days.map((day) => day.slots.length))}
      onViewChange={setView}
      onNavigate={(direction) =>
        setNavigation({
          scope,
          week: view === "week" ? shiftDay(week, direction * 7) : week,
          month: view === "month" ? shiftMonth(month, direction) : month,
        })
      }
      onRetry={() => {
        if (nearest.isError) void nearest.refetch();
        else void current.refetch();
      }}
      onChoose={onChoose}
    />
  );
}
