import {
  addDays,
  formatDate,
  formatDateRange,
  formatDateRangeShort,
  formatWeekday,
  mondayOf,
} from "@repo/scheduling";
import {
  createLoader,
  createSerializer,
  parseAsStringLiteral,
  type inferParserType,
} from "nuqs/server";
import { parseAsDay, parseAsId } from "../visit-table/params";

// The calendar's state in the URL (docs/product/scheduling-ui-plan.md, K5):
// the view, its date, whose columns (specialists or rooms), the one
// resource of a week, and the visit open in the side panel. Every value is
// checked; links are built from the same parsers.

export const CALENDAR_VIEWS = ["dzien", "tydzien"] as const;
export const CALENDAR_PERSPECTIVES = ["specjalisci", "gabinety"] as const;

export type CalendarView = (typeof CALENDAR_VIEWS)[number];
export type CalendarPerspectiveParam = (typeof CALENDAR_PERSPECTIVES)[number];

export const calendarParsers = {
  /** None: the portal's own (a day for the centre, a week for a specialist). */
  widok: parseAsStringLiteral(CALENDAR_VIEWS),
  /** None: today. */
  data: parseAsDay,
  perspektywa: parseAsStringLiteral(CALENDAR_PERSPECTIVES).withDefault(
    "specjalisci",
  ),
  /** The specialist or room of a week (none: the first). */
  zasob: parseAsId,
  wizyta: parseAsId,
  karta: parseAsStringLiteral(["szczegoly", "historia"] as const).withDefault(
    "szczegoly",
  ),
};

export type CalendarParams = inferParserType<typeof calendarParsers>;

export const loadCalendarParams = createLoader(calendarParsers);

const serialize = createSerializer(calendarParsers, { clearOnDefault: true });

/** The calendar's address with some values changed (defaults left out). */
export function calendarHref(
  path: string,
  params: CalendarParams,
  patch: Partial<CalendarParams>,
) {
  return serialize(path, { ...params, ...patch });
}

interface Context {
  today: string;
  defaultView: CalendarView;
}

/** The view shown and its local dates (a week runs Monday to Sunday). */
export function calendarPeriod(
  params: CalendarParams,
  { today, defaultView }: Context,
) {
  const view = params.widok ?? defaultView;
  const date = params.data ?? today;
  if (view === "dzien") return { view, date, from: date, to: date };
  const from = mondayOf(date);
  return { view, date, from, to: addDays(from, 6) };
}

/** The period's label and links to its neighbours (the panel closes). */
export function calendarNav(
  path: string,
  params: CalendarParams,
  context: Context,
) {
  const { view, date, from, to } = calendarPeriod(params, context);
  const day = view === "dzien";
  const step = day ? 1 : 7;
  const go = (data: string | null) =>
    calendarHref(path, params, { data, wizyta: null, karta: "szczegoly" });
  const current = day
    ? date === context.today
    : context.today >= from && context.today <= to;
  return {
    unit: day ? ("dzień" as const) : ("tydzień" as const),
    label: day
      ? `${formatWeekday(date)}, ${formatDate(date)}`
      : formatDateRangeShort(from, to),
    title: day ? undefined : formatDateRange(from, to),
    previousHref: go(addDays(date, -step)),
    nextHref: go(addDays(date, step)),
    todayHref: current ? null : go(null),
  };
}

/** Dzień / Tydzień, on the same date. */
export function calendarViewTabs(
  path: string,
  params: CalendarParams,
  defaultView: CalendarView,
) {
  const active = params.widok ?? defaultView;
  return [
    { key: "dzien" as const, label: "Dzień" },
    { key: "tydzien" as const, label: "Tydzień" },
  ].map((tab) => ({
    ...tab,
    href: calendarHref(path, params, { widok: tab.key }),
    active: tab.key === active,
  }));
}

/** Specjaliści / Gabinety: whose columns (a day) or whose week. */
export function calendarPerspectiveTabs(path: string, params: CalendarParams) {
  return [
    { key: "specjalisci" as const, label: "Specjaliści" },
    { key: "gabinety" as const, label: "Gabinety" },
  ].map((tab) => ({
    ...tab,
    href: calendarHref(path, params, { perspektywa: tab.key, zasob: null }),
    active: tab.key === params.perspektywa,
  }));
}

/** A visit opened in the side panel. */
export function calendarVisitHref(
  path: string,
  params: CalendarParams,
  visitId: string,
) {
  return calendarHref(path, params, { wizyta: visitId, karta: "szczegoly" });
}

export function calendarPanelTabs(path: string, params: CalendarParams) {
  return [
    { key: "szczegoly" as const, label: "Szczegóły" },
    { key: "historia" as const, label: "Historia" },
  ].map((tab) => ({
    ...tab,
    href: calendarHref(path, params, { karta: tab.key }),
  }));
}

export function calendarPanelCloseHref(path: string, params: CalendarParams) {
  return calendarHref(path, params, { wizyta: null, karta: "szczegoly" });
}
