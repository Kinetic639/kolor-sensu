import {
  calculateOccupancyPercent,
  isScheduleResourceUnavailable,
  type RoomScheduleResource,
  type ScheduleResource,
  type SpecialistScheduleResource,
} from "@repo/scheduling";
import type { HTMLAttributes } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "./avatar";
import { cn } from "./lib/utils";
import { getRoomColorTokenFamily } from "./scheduling-colors";

export interface ResourceHeaderProps extends Omit<
  HTMLAttributes<HTMLElement>,
  "color" | "resource"
> {
  resource: ScheduleResource;
}

export function ResourceHeader({
  resource,
  className,
  ...props
}: ResourceHeaderProps) {
  const unavailable = isScheduleResourceUnavailable(resource);
  const occupancy = calculateOccupancyPercent(
    resource.bookedMinutes,
    resource.availableMinutes,
  );

  return (
    <article
      aria-label={resource.name}
      className={cn(
        "w-full min-w-0 overflow-hidden border-b border-[var(--border)] bg-[var(--surface)] px-2.5 py-2.5 text-[var(--text)]",
        unavailable && "bg-[var(--surface-muted)] text-[var(--text-muted)]",
        className,
      )}
      data-state={unavailable ? "unavailable" : "available"}
      role="group"
      {...props}
    >
      {resource.type === "specialist" ? (
        <SpecialistHeaderContent
          occupancy={occupancy}
          resource={resource}
          unavailable={unavailable}
        />
      ) : (
        <RoomHeaderContent
          occupancy={occupancy}
          resource={resource}
          unavailable={unavailable}
        />
      )}
    </article>
  );
}

function SpecialistHeaderContent({
  occupancy,
  resource,
  unavailable,
}: {
  occupancy: number;
  resource: SpecialistScheduleResource;
  unavailable: boolean;
}) {
  return (
    <>
      <div className="flex min-w-0 items-center gap-2">
        <Avatar
          className={cn(
            "size-9 shrink-0 border border-[var(--border)]",
            unavailable && "opacity-55 grayscale",
          )}
        >
          {resource.avatar.src ? (
            <AvatarImage
              alt={resource.avatar.alt ?? resource.name}
              src={resource.avatar.src}
            />
          ) : null}
          <AvatarFallback className="text-xs">
            {resource.avatar.initials}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <h3
            className={cn(
              "truncate text-xs leading-tight font-semibold text-[var(--text)]",
              unavailable && "text-[var(--text-muted)]",
            )}
          >
            {resource.name}
          </h3>
          <p className="mt-0.5 truncate text-[10px] leading-tight text-[var(--text-muted)]">
            {resource.professionalTitle}
          </p>
        </div>
      </div>
      <div className="mt-2 flex min-w-0 items-end justify-between gap-2">
        <div className="min-w-0 space-y-0.5 text-[10px] leading-tight text-[var(--text-muted)]">
          <p>
            {unavailable ? "Brak dostępności" : resource.availabilitySummary}
          </p>
          <p>{formatAppointmentRatio(resource)}</p>
        </div>
        <OccupancyRing muted={unavailable} value={occupancy} />
      </div>
    </>
  );
}

function RoomHeaderContent({
  occupancy,
  resource,
  unavailable,
}: {
  occupancy: number;
  resource: RoomScheduleResource;
  unavailable: boolean;
}) {
  const tokens = getRoomColorTokenFamily(resource.color);
  return (
    <div className="flex min-w-0 items-start gap-2">
      <span
        aria-hidden="true"
        className={cn(
          "mt-0.5 size-4 shrink-0 rounded-full border",
          unavailable && "opacity-40 grayscale",
        )}
        style={{
          background: `var(${tokens.surface})`,
          borderColor: `var(${tokens.border})`,
        }}
      />
      <div className="min-w-0 flex-1">
        <h3
          className={cn(
            "truncate text-xs font-semibold text-[var(--text)]",
            unavailable && "text-[var(--text-muted)]",
          )}
        >
          {resource.name}
        </h3>
        <p className="mt-1 truncate text-[10px] text-[var(--text-muted)]">
          {unavailable
            ? "Brak dostępności"
            : (resource.availabilitySummary ?? resource.location)}
        </p>
      </div>
      <div className="shrink-0 text-right">
        <strong
          className={cn(
            "block text-xs leading-tight font-semibold text-[var(--text)]",
            unavailable && "text-[var(--text-muted)]",
          )}
        >
          {occupancy}%
        </strong>
        <span className="block text-[9px] text-[var(--text-muted)]">
          obłożenia
        </span>
      </div>
    </div>
  );
}

function OccupancyRing({ muted, value }: { muted: boolean; value: number }) {
  const circumference = 2 * Math.PI * 13;
  const offset = circumference - (value / 100) * circumference;
  return (
    <div
      aria-label={`${value}% obłożenia`}
      aria-valuemax={100}
      aria-valuemin={0}
      aria-valuenow={value}
      className={cn("relative size-9 shrink-0", muted && "opacity-55")}
      role="progressbar"
    >
      <svg className="size-9 -rotate-90" viewBox="0 0 36 36" aria-hidden="true">
        <circle
          className="stroke-[var(--border)]"
          cx="18"
          cy="18"
          fill="none"
          r="13"
          strokeWidth="2.5"
        />
        <circle
          className="stroke-[var(--primary)]"
          cx="18"
          cy="18"
          fill="none"
          r="13"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          strokeWidth="2.5"
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-[9px] font-semibold text-[var(--text-muted)]">
        {value}%
      </span>
    </div>
  );
}

function formatAppointmentRatio(resource: SpecialistScheduleResource) {
  if (resource.availableMinutes <= 0) return "0/0 spotkań";
  const availableHours = Math.max(
    1,
    Math.round(resource.availableMinutes / 60),
  );
  return `${resource.appointmentCount}/${availableHours} spotkań`;
}
