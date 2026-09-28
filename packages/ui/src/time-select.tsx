import type { SelectHTMLAttributes } from "react";
import { cn } from "./lib/utils";

// A time of day on the 15-minute grid, always in 24-hour time (the native
// time input follows the browser's locale and may show AM/PM). A native
// select: renders on the server, works with the keyboard and screen readers.

export const TIME_OPTIONS = Array.from({ length: 96 }, (_, index) => {
  const minutes = index * 15;
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
});

export interface TimeSelectProps extends Omit<
  SelectHTMLAttributes<HTMLSelectElement>,
  "value" | "onChange"
> {
  value: string;
  onChange: (value: string) => void;
}

export function TimeSelect({
  value,
  onChange,
  className,
  ...props
}: TimeSelectProps) {
  // A stored value off the grid stays selectable instead of jumping.
  const options = TIME_OPTIONS.includes(value)
    ? TIME_OPTIONS
    : [...TIME_OPTIONS, value].sort();
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
