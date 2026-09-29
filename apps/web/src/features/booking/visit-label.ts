import { formatDate, formatWeekday } from "@repo/scheduling";

// A visit's time as the booking pages and Stripe show it, in the centre's
// time zone.

function local(
  instant: string,
  timeZone: string,
  options: Intl.DateTimeFormatOptions,
) {
  return new Intl.DateTimeFormat("pl-PL", { timeZone, ...options }).format(
    new Date(instant),
  );
}

/** `10:42` */
export function localTime(instant: string, timeZone: string) {
  return local(instant, timeZone, { hour: "2-digit", minute: "2-digit" });
}

/** `czwartek, 2 października 2030, godz. 10:00` */
export function visitLabel(startsAt: string, timeZone: string) {
  const date = local(startsAt, timeZone, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
    .split(".")
    .reverse()
    .join("-");
  return `${formatWeekday(date)}, ${formatDate(date)}, godz. ${localTime(startsAt, timeZone)}`;
}
