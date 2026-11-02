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
export const BOOKING_EDIT_STEPS = [
  "usluga",
  "forma",
  "lokalizacja",
  "specjalista",
  "termin",
] as const;

export const BOOKING_NOTICES = [
  "termin-zajety",
  "rezerwacja-wygasla",
  "za-duzo-prob",
  "weryfikacja",
] as const;
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
  /** Edit one step without erasing the other choices. */
  krok: parseAsStringLiteral(BOOKING_EDIT_STEPS),
  /** Continue a preselected visit after the protected hold check. */
  dalej: parseAsStringLiteral(["auto"]),
};

export type BookingParams = Omit<
  inferParserType<typeof bookingParsers>,
  "krok" | "dalej"
> & {
  krok?: (typeof BOOKING_EDIT_STEPS)[number] | null;
  dalej?: "auto" | null;
};
export type BookingParamKey = keyof BookingParams;

export const loadBookingParams = createLoader(bookingParsers);

const serialize = createSerializer(bookingParsers);

const BOOKING_PATH = "/umow-wizyte";

/** The wizard with the given choices; unset values (and notices) left out. */
export function bookingHref(values: Partial<BookingParams>): Route {
  return serialize(BOOKING_PATH, { ...values, uwaga: null }) as Route;
}

/**
 * The test before a first consultation, with the wizard's choices so far
 * (the way back to them once it is done).
 */
export function intakeHref(values: Partial<BookingParams>): Route {
  return serialize(`${BOOKING_PATH}/test`, { ...values, uwaga: null }) as Route;
}

/**
 * The wizard with a notice, without the time that was refused (or with it,
 * when only the check failed and the client can simply try again).
 */
export function bookingNoticeHref(
  params: BookingParams,
  notice: BookingNotice,
  keepTime = false,
): Route {
  return serialize(BOOKING_PATH, {
    ...params,
    // Back to the week of the refused time.
    tydzien: params.tydzien ?? params.termin?.slice(0, 10) ?? null,
    termin: keepTime ? params.termin : null,
    uwaga: notice,
  }) as Route;
}

/** Keep the requested time; the live wizard revalidates it for the new choice. */
export function selectBookingHref<Key extends BookingParamKey>(
  params: BookingParams,
  key: Key,
  value: NonNullable<BookingParams[Key]>,
): Route {
  return bookingHref({
    ...params,
    krok: null,
    [key]: value,
  });
}

/** Open a step for editing while preserving the remaining visit choices. */
export function changeBookingHref(
  params: BookingParams,
  key: (typeof BOOKING_EDIT_STEPS)[number],
): Route {
  return bookingHref({
    ...params,
    krok: key,
    ...(key === "termin" ? { termin: null } : {}),
  });
}
