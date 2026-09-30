import type { MinuteRange } from "@repo/scheduling";

// The calendar's vertical scale, shared by the server-rendered grid and the
// client's slot picker: an hour is 68 pixels (the reference's).

export const HOUR_HEIGHT = 68;

export const minutesToPx = (minutes: number) => (minutes / 60) * HOUR_HEIGHT;

export function rangeHeight(range: MinuteRange) {
  return minutesToPx(Math.max(60, range.end - range.start));
}
