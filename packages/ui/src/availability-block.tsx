import type { ScheduleAvailability } from "@repo/scheduling";
import { Laptop2, MapPin, XCircle } from "lucide-react";
import type { HTMLAttributes } from "react";
import { cn } from "./lib/utils";
import {
  availabilityVariantClasses,
  getAvailabilityVisualVariant,
} from "./scheduling-colors";

export interface AvailabilityBlockProps extends Omit<
  HTMLAttributes<HTMLElement>,
  "children"
> {
  availability: ScheduleAvailability | null;
  locale?: string;
  timeZone?: string;
  variant?: "default" | "compact";
}

export function AvailabilityBlock({
  availability,
  locale = "pl-PL",
  timeZone = "Europe/Warsaw",
  variant = "default",
  className,
  ...props
}: AvailabilityBlockProps) {
  if (!availability) {
    return (
      <article
        aria-label="Brak dostępności"
        className={cn(
          "relative h-full w-full min-w-0 overflow-hidden rounded-[var(--ks-radius-sm)] border border-dashed border-[var(--border)] bg-[repeating-linear-gradient(135deg,var(--surface-muted)_0,var(--surface-muted)_8px,var(--surface-subtle)_8px,var(--surface-subtle)_16px)] text-[var(--text-muted)] before:absolute before:inset-y-1 before:left-0 before:w-1 before:bg-[var(--text-subtle)]",
          variant === "compact" ? "px-2 py-1.5 pl-3" : "p-2.5 pl-3.5",
          className,
        )}
        data-kind="unavailable"
        data-state="unavailable"
        data-variant={variant}
        role="note"
        {...props}
      >
        <div className="flex min-w-0 items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[10px] leading-none font-medium">—</p>
            <h3 className="mt-1 truncate text-xs font-medium">
              Brak dostępności
            </h3>
          </div>
          <XCircle
            className="size-3.5 shrink-0 opacity-60"
            aria-hidden="true"
          />
        </div>
        {variant === "default" ? (
          <p className="mt-2 text-[10px] leading-snug opacity-70">
            Brak godzin w wybranym zakresie
          </p>
        ) : null}
      </article>
    );
  }

  const visualVariant = getAvailabilityVisualVariant(availability);
  const Icon = availability.kind === "room" ? MapPin : Laptop2;
  const label = getAvailabilityLabel(availability);

  return (
    <article
      aria-label={label}
      className={cn(
        "relative h-full w-full min-w-0 overflow-hidden rounded-[var(--ks-radius-sm)] border text-current before:absolute before:inset-y-1 before:left-0 before:w-1",
        variant === "compact" ? "px-2 py-1.5 pl-3" : "p-2.5 pl-3.5",
        availability.kind === "hybrid" &&
          "after:absolute after:top-1 after:bottom-1 after:left-1 after:w-px",
        availabilityVariantClasses[visualVariant],
        className,
      )}
      data-kind={availability.kind}
      data-state="available"
      data-variant={variant}
      role="group"
      {...props}
    >
      <div className="flex min-w-0 items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[10px] leading-none font-semibold tabular-nums">
            {formatTimeRange(
              availability.start,
              availability.end,
              locale,
              timeZone,
            )}
          </p>
          <h3 className="mt-1 truncate text-xs leading-tight font-medium">
            {label}
          </h3>
        </div>
        {availability.kind === "hybrid" ? (
          <span
            className="flex shrink-0 items-center gap-0.5 opacity-65"
            aria-hidden="true"
          >
            <MapPin className="size-3.5" />
            <Laptop2 className="size-3.5" />
          </span>
        ) : (
          <Icon className="size-3.5 shrink-0 opacity-65" aria-hidden="true" />
        )}
      </div>
      {variant === "default" ? (
        <p className="mt-2 text-[10px] leading-snug opacity-70">
          {getAvailabilityDescription(availability)}
        </p>
      ) : null}
    </article>
  );
}

function getAvailabilityLabel(availability: ScheduleAvailability) {
  if (availability.kind === "room") return availability.roomName;
  if (availability.kind === "online") return "Online";
  return "Hybrydowo";
}

function getAvailabilityDescription(availability: ScheduleAvailability) {
  if (availability.kind === "room") return "Dostępność stacjonarna";
  if (availability.kind === "online") return "Konsultacje online";
  return availability.roomName
    ? `Stacjonarnie i online · ${availability.roomName}`
    : "Stacjonarnie i online";
}

function formatTimeRange(
  start: string,
  end: string,
  locale: string,
  timeZone: string,
) {
  const formatter = new Intl.DateTimeFormat(locale, {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone,
  });
  return `${formatter.format(new Date(start))}–${formatter.format(new Date(end))}`;
}
