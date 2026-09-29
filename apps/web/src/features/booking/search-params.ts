import type { Route } from "next";
import {
  createLoader,
  createParser,
  createSerializer,
  parseAsStringLiteral,
  type inferParserType,
} from "nuqs/server";

// The booking wizard's state lives in the URL (docs/product/booking-plan.md):
// every choice is a plain link, the page renders on the server from these
// values, and a shared or reloaded address shows the same step. Personal
// data, holds and payments never go into the URL.

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const DATE = /^(\d{4})-(\d{2})-(\d{2})$/;
const LOCAL_TIME = /^(\d{4}-\d{2}-\d{2})T([01]\d|2[0-3]):([0-5]\d)$/;

function isCalendarDate(value: string) {
  const match = DATE.exec(value);
  if (!match) return false;
  const [, year, month, day] = match.map(Number) as [
    never,
    number,
    number,
    number,
  ];
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

const parseAsSlug = createParser({
  parse: (value) => (value.length <= 100 && SLUG.test(value) ? value : null),
  serialize: (value: string) => value,
});

/** A calendar day, `2026-10-05`. */
const parseAsDay = createParser({
  parse: (value) => (isCalendarDate(value) ? value : null),
  serialize: (value: string) => value,
});

/**
 * A wall-clock time in the centre's time zone, `2026-10-07T10:00`: readable
 * in the address, and turned into an instant only against the computed
 * slots on the server, which also rules out times that do not exist.
 */
const parseAsLocalTime = createParser({
  parse: (value) => {
    const match = LOCAL_TIME.exec(value);
    return match && isCalendarDate(match[1]!) ? value : null;
  },
  serialize: (value: string) => value,
});

export const BOOKING_MODES = ["stacjonarnie", "online"] as const;
export type BookingMode = (typeof BOOKING_MODES)[number];

export const BOOKING_NOTICES = ["termin-zajety", "rezerwacja-wygasla"] as const;
export type BookingNotice = (typeof BOOKING_NOTICES)[number];

export const bookingParsers = {
  usluga: parseAsSlug,
  forma: parseAsStringLiteral(BOOKING_MODES),
  lokalizacja: parseAsSlug,
  specjalista: parseAsSlug,
  tydzien: parseAsDay,
  termin: parseAsLocalTime,
  /** A notice shown once, e.g. after the chosen time was taken. */
  uwaga: parseAsStringLiteral(BOOKING_NOTICES),
};

export type BookingParams = inferParserType<typeof bookingParsers>;
export type BookingParamKey = keyof BookingParams;

export const loadBookingParams = createLoader(bookingParsers);

const serialize = createSerializer(bookingParsers);

const BOOKING_PATH = "/umow-wizyte";

/** The wizard with the given choices; unset values (and notices) left out. */
export function bookingHref(values: Partial<BookingParams>): Route {
  return serialize(BOOKING_PATH, { ...values, uwaga: null }) as Route;
}

/** The wizard with a notice, and without the time that was refused. */
export function bookingNoticeHref(
  params: BookingParams,
  notice: BookingNotice,
): Route {
  return serialize(BOOKING_PATH, {
    ...params,
    // Back to the week of the refused time.
    tydzien: params.tydzien ?? params.termin?.slice(0, 10) ?? null,
    termin: null,
    uwaga: notice,
  }) as Route;
}

/** Choose a value; any other choice drops the chosen time. */
export function selectBookingHref<Key extends BookingParamKey>(
  params: BookingParams,
  key: Key,
  value: NonNullable<BookingParams[Key]>,
): Route {
  return bookingHref({
    ...params,
    ...(key === "termin" ? {} : { termin: null }),
    [key]: value,
  });
}

/** "Zmień": clear a choice (and the chosen time) to pick it again. */
export function changeBookingHref(
  params: BookingParams,
  key: BookingParamKey,
): Route {
  return bookingHref({ ...params, [key]: null, tydzien: null, termin: null });
}
