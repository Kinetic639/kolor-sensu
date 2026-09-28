// Polish date labels for calendars. Local calendar dates are formatted at
// UTC noon, so no time zone can move them to another day.

export const WEEKDAY_NAMES = [
  "Poniedziałek",
  "Wtorek",
  "Środa",
  "Czwartek",
  "Piątek",
  "Sobota",
  "Niedziela",
];
export const WEEKDAY_SHORT = ["Pon", "Wt", "Śr", "Czw", "Pt", "Sob", "Niedz"];

const atNoon = (date: string) => new Date(`${date}T12:00:00Z`);
const dayMonth = new Intl.DateTimeFormat("pl-PL", {
  day: "numeric",
  month: "long",
  timeZone: "UTC",
});
const fullDate = new Intl.DateTimeFormat("pl-PL", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});
const weekdayLong = new Intl.DateTimeFormat("pl-PL", {
  weekday: "long",
  timeZone: "UTC",
});

/** `7 stycznia 2030` */
export function formatDate(date: string) {
  return fullDate.format(atNoon(date));
}

/** `7 stycznia` */
export function formatDayMonth(date: string) {
  return dayMonth.format(atNoon(date));
}

/** `poniedziałek` */
export function formatWeekday(date: string) {
  return weekdayLong.format(atNoon(date));
}

/** `7–13 stycznia 2030`, `30 stycznia – 2 lutego 2030`, … */
export function formatDateRange(from: string, to: string) {
  if (from === to) return formatDate(from);
  if (from.slice(0, 7) === to.slice(0, 7)) {
    return `${Number(from.slice(8))}–${formatDate(to)}`;
  }
  if (from.slice(0, 4) === to.slice(0, 4)) {
    return `${formatDayMonth(from)} – ${formatDate(to)}`;
  }
  return `${formatDate(from)} – ${formatDate(to)}`;
}
