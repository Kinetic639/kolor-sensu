"use client";

import { nowAfter, type DayTimeline } from "@repo/scheduling";
import { useEffect, useState } from "react";

// The red line where now is on the day's line: drawn where the server put
// it, then moved on as time goes by (every half a minute), until the page
// reloads its data; gone past the line's end.

export function NowLine({
  line,
}: {
  line: Pick<DayTimeline, "startHour" | "endHour" | "now">;
}) {
  const { startHour, endHour, now } = line;
  const [at, setAt] = useState(now);
  // A new reading (a reload) starts again from where it says.
  useEffect(() => {
    const read = Date.now();
    setAt(now);
    const timer = setInterval(
      () => setAt(nowAfter({ startHour, endHour, now }, Date.now() - read)),
      30_000,
    );
    return () => clearInterval(timer);
  }, [startHour, endHour, now]);
  if (at === null) return null;
  return (
    <span
      aria-hidden="true"
      className="pointer-events-none absolute top-6 right-0 bottom-0 left-[var(--name-w)]"
    >
      <span
        className="absolute top-0 bottom-0 w-0.5 bg-[var(--danger)]"
        style={{ left: `${at}%` }}
      />
    </span>
  );
}
