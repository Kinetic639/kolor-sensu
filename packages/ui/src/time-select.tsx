import type { SelectHTMLAttributes } from "react";
import { cn } from "./lib/utils";

// A time of day on a grid (every 15 minutes, or the centre's: every full
// hour), always in 24-hour time (the native time input follows the
// browser's locale and may show AM/PM). A native select: renders on the
// server, works with the keyboard and screen readers.

/** The times of a day every `step` minutes, from midnight. */
function dayTimes(step: number) {
  return Array.from({ length: Math.floor((24 * 60) / step) }, (_, index) => {
    const minutes = index * step;
    return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
  });
}

export const TIME_OPTIONS = dayTimes(15);

export interface TimeSelectProps extends Omit<
  SelectHTMLAttributes<HTMLSelectElement>,
  "value" | "onChange"
> {
  value: string;
  onChange: (value: string) => void;
  /** Minutes between the times offered (the centre's grid: 60). */
  step?: number;
}

export function TimeSelect({
  value,
  onChange,
  step = 15,
  className,
  ...props
}: TimeSelectProps) {
  const times = step === 15 ? TIME_OPTIONS : dayTimes(step);
  // A stored value off the grid stays selectable instead of jumping.
  const options = times.includes(value) ? times : [...times, value].sort();
  return (
    <select
      className={cn(
        "h-10 rounded-[var(--radius-control)] border border-[var(--border)] bg-[var(--surface)] px-3 text-sm font-semibold text-[var(--text)] tabular-nums shadow-[0_1px_2px_rgb(15_39_71/0.03)] outline-none focus-visible:border-[var(--ring)] focus-visible:ring-3 focus-visible:ring-[color-mix(in_srgb,var(--ring)_18%,transparent)] disabled:cursor-not-allowed disabled:bg-[var(--surface-muted)] aria-invalid:border-[var(--danger)]",
        className,
      )}
      onChange={(event) => onChange(event.target.value)}
      value={value}
      {...props}
    >
      {options.map((time) => (
        <option key={time} value={time}>
          {time}
        </option>
      ))}
    </select>
  );
}
