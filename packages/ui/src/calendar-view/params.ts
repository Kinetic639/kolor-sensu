import {
  addDays,
  formatDateRange,
  isoWeekday,
  mondayOf,
  WEEKDAY_SHORT,
} from "@repo/scheduling";
import {
  createLoader,
  createParser,
  createSerializer,
  parseAsArrayOf,
  parseAsBoolean,
  parseAsStringLiteral,
  type inferParserType,
} from "nuqs/server";
import {
  parseAsDay,
  parseAsId,
  parseAsPlace,
  parseAsSearch,
} from "../visit-table/params";

// The calendar's state in the URL (docs/product/scheduling-ui-plan.md, K5):
// the view and its date, whose columns (specialists or rooms), the view's
// switches, the location, the patient search, the collapsed columns and
// the visit open in the side panel. Every value is checked; links are
// built from the same parsers.

export const CALENDAR_VIEWS = ["dzien", "tydzien"] as const;
export const CALENDAR_PERSPECTIVES = ["specjalisci", "gabinety"] as const;

export type CalendarView = (typeof CALENDAR_VIEWS)[number];
export type CalendarPerspectiveParam = (typeof CALENDAR_PERSPECTIVES)[number];

/** A column's key: a specialist's or room's id, or "online". */
const parseAsColumn = createParser({
  parse: (value) => parseAsPlace.parse(value),
  serialize: (value: string) => value,
});

/** An availability window shown in the view (its key). */
const parseAsWindow = createParser({
  parse: (value) => (/^[\w:.-]{1,160}$/.test(value) ? value : null),
  serialize: (value: string) => value,
});

/** A picked time: the centre's local date and time, `2030-10-02T12:15`. */
const parseAsSlot = createParser({
  parse: (value) => {
    const match = /^(\d{4}-\d{2}-\d{2})T([01]\d|2[0-3]):([0-5]\d)$/.exec(value);
    return match && parseAsDay.parse(match[1]!) ? value : null;
  },
  serialize: (value: string) => value,
});

export const calendarParsers = {
  /** None: the portal's own (a day for the centre, a week for a specialist). */
  widok: parseAsStringLiteral(CALENDAR_VIEWS),
  /** None: today. */
  data: parseAsDay,
  perspektywa: parseAsStringLiteral(CALENDAR_PERSPECTIVES).withDefault(
    "specjalisci",
  ),
  /** Hide columns (lanes, days) with nothing in them. */
  puste: parseAsBoolean.withDefault(false),
  /** Grey out columns without availability. */
  wyszarz: parseAsBoolean.withDefault(true),
  wizyty: parseAsBoolean.withDefault(true),
  dostepnosc: parseAsBoolean.withDefault(true),
  podsumowanie: parseAsBoolean.withDefault(true),
  /** A location's id, or "online". */
  lokalizacja: parseAsPlace,
  /** A patient (or service, number) to find. */
  q: parseAsSearch,
  /** The day's columns shown narrow. */
  zwiniete: parseAsArrayOf(parseAsColumn).withDefault([]),
  wizyta: parseAsId,
  /** Adding a visit: pick a time in the grid. */
  nowa: parseAsBoolean.withDefault(false),
  /** The time picked for the new visit (the form opens). */
  termin: parseAsSlot,
  /** The column it was picked in (a specialist, room or online). */
  kolumna: parseAsColumn,
  /** Moving this visit (the centre, R12): pick its new place in the grid. */
  przesun: parseAsId,
  /** The availability window open in the side panel. */
  okno: parseAsWindow,
  karta: parseAsStringLiteral(["szczegoly", "historia"] as const).withDefault(
    "szczegoly",
  ),
};

/** The switches that only change what is shown: no need to ask the server. */
export const calendarDisplayParsers = {
  wyszarz: calendarParsers.wyszarz,
  wizyty: calendarParsers.wizyty,
  dostepnosc: calendarParsers.dostepnosc,
  podsumowanie: calendarParsers.podsumowanie,
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

const shortMonth = new Intl.DateTimeFormat("pl-PL", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

/** `Śr, 2 paź 2030` */
export function dayLabel(date: string) {
  return `${WEEKDAY_SHORT[isoWeekday(date) - 1]}, ${shortMonth
    .format(new Date(`${date}T12:00:00Z`))
    .replace(/\.$/, "")}`;
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
    calendarHref(path, params, {
      data,
      wizyta: null,
      okno: null,
      karta: "szczegoly",
    });
  const current = day
    ? date === context.today
    : context.today >= from && context.today <= to;
  return {
    unit: day ? ("dzień" as const) : ("tydzień" as const),
    label: day ? dayLabel(date) : formatDateRange(from, to),
    previousHref: go(addDays(date, -step)),
    nextHref: go(addDays(date, step)),
    todayHref: go(null),
    isCurrent: current,
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
    href: calendarHref(path, params, { widok: tab.key, zwiniete: [] }),
    active: tab.key === active,
  }));
}

/** Specjaliści / Gabinety: whose columns. */
export function calendarPerspectiveTabs(path: string, params: CalendarParams) {
  return [
    { key: "specjalisci" as const, label: "Specjaliści" },
    { key: "gabinety" as const, label: "Gabinety" },
  ].map((tab) => ({
    ...tab,
    href: calendarHref(path, params, { perspektywa: tab.key, zwiniete: [] }),
    active: tab.key === params.perspektywa,
  }));
}

/** A column narrowed, or widened back. */
export function calendarCollapseHref(
  path: string,
  params: CalendarParams,
  key: string,
) {
  const collapsed = params.zwiniete.includes(key);
  return calendarHref(path, params, {
    zwiniete: collapsed
      ? params.zwiniete.filter((one) => one !== key)
      : [...params.zwiniete, key],
  });
}

/** Adding on (pick a time) or off; any open panel closes. */
export function calendarAddHref(
  path: string,
  params: CalendarParams,
  on: boolean,
) {
  return calendarHref(path, params, {
    nowa: on,
    termin: null,
    kolumna: null,
    przesun: null,
    wizyta: null,
    okno: null,
    karta: "szczegoly",
  });
}

/** The new visit's form at a time, in a column. */
export function calendarPickHref(
  path: string,
  params: CalendarParams,
  slot: string,
  column: string | null,
) {
  return calendarHref(path, params, {
    nowa: true,
    termin: slot,
    kolumna: column,
    wizyta: null,
    okno: null,
  });
}

/** A visit opened in the side panel. */
export function calendarVisitHref(
  path: string,
  params: CalendarParams,
  visitId: string,
) {
  return calendarHref(path, params, {
    wizyta: visitId,
    okno: null,
    karta: "szczegoly",
  });
}

/** An availability window opened in the side panel. */
export function calendarAvailabilityHref(
  path: string,
  params: CalendarParams,
  key: string,
) {
  return calendarHref(path, params, {
    okno: key,
    wizyta: null,
    karta: "szczegoly",
  });
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
  return calendarHref(path, params, {
    wizyta: null,
    okno: null,
    karta: "szczegoly",
  });
}
