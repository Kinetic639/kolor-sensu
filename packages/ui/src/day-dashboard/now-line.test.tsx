import { act, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NowLine } from "./now-line";

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

const lineAt = (container: HTMLElement) =>
  container.querySelector<HTMLElement>("[style]")?.style.left;

describe("NowLine", () => {
  it("drawn where the server put it, then moving on with time", () => {
    const { container } = render(
      <NowLine line={{ startHour: 8, endHour: 18, now: 50 }} />,
    );
    expect(lineAt(container)).toBe("50%");
    // An hour later, on a ten-hour line: 10% further.
    act(() => vi.advanceTimersByTime(60 * 60_000));
    expect(parseFloat(lineAt(container)!)).toBeCloseTo(60);
  });

  it("gone past the line's end; none for a day that is not today", () => {
    const { container, rerender } = render(
      <NowLine line={{ startHour: 8, endHour: 18, now: 99 }} />,
    );
    act(() => vi.advanceTimersByTime(30 * 60_000));
    expect(container).toBeEmptyDOMElement();
    rerender(<NowLine line={{ startHour: 8, endHour: 18, now: null }} />);
    expect(container).toBeEmptyDOMElement();
  });
});
