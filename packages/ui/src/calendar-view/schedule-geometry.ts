import type { MinuteRange } from "@repo/scheduling";

// The calendar's vertical scale, shared by the server-rendered grid and the
// client's slot picker: an hour is 60 pixels (about ten hours of a day on a laptop).

export const HOUR_HEIGHT = 60;

/** The hours' column on the left, in pixels. */
export const AXIS_WIDTH = 52;

export const minutesToPx = (minutes: number) => (minutes / 60) * HOUR_HEIGHT;

export function rangeHeight(range: MinuteRange) {
  return minutesToPx(Math.max(60, range.end - range.start));
}
