/** UTC date arithmetic avoids browser timezone and daylight-saving shifts. */
export function shiftDay(day: string, count: number) {
  const date = new Date(`${day}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + count);
  return date.toISOString().slice(0, 10);
}
export function monthStart(day: string) {
  return `${day.slice(0, 7)}-01`;
}
export function shiftMonth(day: string, count: number) {
  const date = new Date(`${monthStart(day)}T12:00:00Z`);
  date.setUTCMonth(date.getUTCMonth() + count);
  return date.toISOString().slice(0, 10);
}
export function monday(day: string) {
  return shiftDay(day, -((new Date(`${day}T12:00:00Z`).getUTCDay() + 6) % 7));
}
export function monthCells(month: string): (string | null)[] {
  const start = monthStart(month);
  const count = Number(shiftDay(shiftMonth(start, 1), -1).slice(8));
  const padding = (new Date(`${start}T12:00:00Z`).getUTCDay() + 6) % 7;
  const cells: (string | null)[] = [
    ...Array<null>(padding).fill(null),
    ...Array.from({ length: count }, (_, i) => shiftDay(start, i)),
  ];
  while (cells.length % 7) cells.push(null);
  return cells;
}
export function monthWeeks(month: string, today: string, lastDay: string) {
  const weeks = new Set<string>();
  for (const date of monthCells(month)) {
    if (date && date >= today && date <= lastDay) weeks.add(monday(date));
  }
  return [...weeks];
}
/** Keep Monday–Friday aligned, dropping rows containing only a weekend. */
export function workdayMonthCells(month: string): (string | null)[] {
  const cells = monthCells(month).filter((_, index) => index % 7 < 5);
  while (cells.length && cells.slice(0, 5).every((day) => day === null))
    cells.splice(0, 5);
  while (cells.length && cells.slice(-5).every((day) => day === null))
    cells.splice(-5);
  return cells;
}
export function dateLabel(day: string, options: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat("pl-PL", {
    ...options,
    timeZone: "UTC",
  }).format(new Date(`${day}T12:00:00Z`));
}
