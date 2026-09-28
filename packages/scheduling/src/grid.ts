// Calendar grid arithmetic (docs/product/scheduling-ui-plan.md, K1): the
// day is minutes since local midnight; the UI turns them into positions.
// Nothing here measures pixels.

export interface MinuteRange {
  start: number;
  end: number;
}

export function timeToMinutes(time: string) {
  const [hours, minutes] = time.slice(0, 5).split(":").map(Number) as [
    number,
    number,
  ];
  return hours * 60 + minutes;
}

export function minutesToTime(minutes: number) {
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
}

export function snapMinutes(minutes: number, step = 15) {
  return Math.round(minutes / step) * step;
}

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

/** A position in a day column (0 top … 1 bottom) as snapped minutes. */
export function pointerToMinutes(ratio: number, range: MinuteRange, step = 15) {
  const minutes = range.start + clamp(ratio, 0, 1) * (range.end - range.start);
  return clamp(snapMinutes(minutes, step), range.start, range.end);
}

const MIN_DRAG = 30;
const CLICK_LENGTH = 60;

/**
 * What a drag from `from` to `to` creates: at least half an hour (a click
 * or a small drag gives an hour), inside the visible range.
 */
export function dragRange(from: number, to: number, range: MinuteRange) {
  let start = Math.min(from, to);
  let end = Math.max(from, to);
  if (end - start < MIN_DRAG) end = start + CLICK_LENGTH;
  if (end > range.end) {
    end = range.end;
    start = Math.min(start, end - CLICK_LENGTH);
  }
  return { start: Math.max(start, range.start), end };
}

/** 8:00–20:00, widened to whole hours around anything outside it. */
export function visibleRange(
  blocks: MinuteRange[],
  defaults: MinuteRange = { start: 8 * 60, end: 20 * 60 },
): MinuteRange {
  const start = Math.min(defaults.start, ...blocks.map((block) => block.start));
  const end = Math.max(defaults.end, ...blocks.map((block) => block.end));
  return {
    start: Math.floor(start / 60) * 60,
    end: Math.min(24 * 60, Math.ceil(end / 60) * 60),
  };
}

export function formatHours(minutes: number) {
  const hours = Math.round((minutes / 60) * 10) / 10;
  return `${String(hours).replace(".", ",")} godz.`;
}
