import { describe, expect, it } from "vitest";
import {
  dragRange,
  dragRangeAround,
  formatHours,
  minutesToTime,
  pointerToMinutes,
  snapMinutes,
  timeToMinutes,
  visibleRange,
} from "./grid";

describe("time and minutes", () => {
  it("converts HH:MM to minutes since midnight and back", () => {
    expect(timeToMinutes("09:30")).toBe(570);
    expect(timeToMinutes("09:30:00")).toBe(570);
    expect(minutesToTime(570)).toBe("09:30");
    expect(minutesToTime(24 * 60)).toBe("24:00");
  });

  it("snaps to the nearest step", () => {
    expect(snapMinutes(577, 15)).toBe(570);
    expect(snapMinutes(578, 15)).toBe(585);
  });
});

describe("pointerToMinutes", () => {
  const range = { start: 8 * 60, end: 20 * 60 };

  it("maps a position in the column to snapped minutes", () => {
    expect(pointerToMinutes(0, range)).toBe(480);
    expect(pointerToMinutes(0.5, range)).toBe(840);
    expect(pointerToMinutes(0.1, range)).toBe(555);
  });

  it("stays inside the visible range", () => {
    expect(pointerToMinutes(-0.2, range)).toBe(480);
    expect(pointerToMinutes(1.3, range)).toBe(1200);
  });
});

describe("dragRange", () => {
  const range = { start: 8 * 60, end: 20 * 60 };

  it("orders the ends whichever way the pointer moved", () => {
    expect(dragRange(600, 540, range)).toEqual({ start: 540, end: 600 });
  });

  it("makes a click or a tiny drag an hour long", () => {
    expect(dragRange(600, 600, range)).toEqual({ start: 600, end: 660 });
    expect(dragRange(600, 615, range)).toEqual({ start: 600, end: 660 });
  });

  it("keeps half an hour or more as dragged, within the range", () => {
    expect(dragRange(600, 630, range)).toEqual({ start: 600, end: 630 });
    expect(dragRange(1170, 1170, range)).toEqual({ start: 1140, end: 1200 });
  });
});

describe("dragRangeAround", () => {
  const range = { start: 8 * 60, end: 20 * 60 };
  // Someone else has the room 10:00–12:00; it is closed from 18:00.
  const blocked = [
    { start: 600, end: 720 },
    { start: 1080, end: 1200 },
  ];

  it("does nothing when the press is on a blocked time", () => {
    expect(dragRangeAround(660, 780, range, blocked)).toBeNull();
    expect(dragRangeAround(600, 540, range, blocked)).toBeNull();
    expect(dragRangeAround(1080, 1100, range, blocked)).toBeNull();
  });

  it("stops a drag down where the blocked time begins", () => {
    expect(dragRangeAround(540, 780, range, blocked)).toEqual({
      start: 540,
      end: 600,
    });
    // A click just before it: only the time that is left.
    expect(dragRangeAround(570, 570, range, blocked)).toEqual({
      start: 570,
      end: 600,
    });
  });

  it("stops a drag up where the blocked time ends", () => {
    expect(dragRangeAround(780, 540, range, blocked)).toEqual({
      start: 720,
      end: 780,
    });
    // Right after it is free again.
    expect(dragRangeAround(720, 780, range, blocked)).toEqual({
      start: 720,
      end: 780,
    });
  });

  it("gives nothing when less than 15 minutes are left", () => {
    expect(
      dragRangeAround(600, 600, range, [{ start: 615, end: 700 }]),
    ).toEqual({ start: 600, end: 615 });
    expect(
      dragRangeAround(595, 595, range, [{ start: 600, end: 700 }]),
    ).toBeNull();
  });

  it("is dragRange when nothing is blocked", () => {
    expect(dragRangeAround(600, 600, range, [])).toEqual(
      dragRange(600, 600, range),
    );
  });
});

describe("visibleRange", () => {
  it("shows 8:00–20:00 by default", () => {
    expect(visibleRange([])).toEqual({ start: 480, end: 1200 });
  });

  it("widens to whole hours around earlier or later blocks", () => {
    expect(
      visibleRange([
        { start: 7 * 60 + 30, end: 9 * 60 },
        { start: 19 * 60, end: 21 * 60 + 15 },
      ]),
    ).toEqual({ start: 420, end: 1320 });
  });
});

describe("formatHours", () => {
  it("writes hours the Polish way", () => {
    expect(formatHours(360)).toBe("6 godz.");
    expect(formatHours(90)).toBe("1,5 godz.");
    expect(formatHours(0)).toBe("0 godz.");
  });
});
