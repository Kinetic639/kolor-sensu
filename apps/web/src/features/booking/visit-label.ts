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
function localDate(instant: string, timeZone: string) {
  return local(instant, timeZone, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
    .split(".")
    .reverse()
    .join("-");
}

/** `8 października 2030, godz. 11:00` (a deadline, after "do"). */
export function deadlineLabel(instant: string, timeZone: string) {
  return `${formatDate(localDate(instant, timeZone))}, godz. ${localTime(instant, timeZone)}`;
}

export function visitLabel(startsAt: string, timeZone: string) {
  const date = localDate(startsAt, timeZone);
  return `${formatWeekday(date)}, ${formatDate(date)}, godz. ${localTime(startsAt, timeZone)}`;
}
