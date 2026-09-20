import { ChevronRight, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { Avatar, AvatarFallback } from "./avatar";
import { Button } from "./button";
import { Card } from "./card";
import { cn } from "./lib/utils";
import { SectionHeader, StatusBadge, type StatusTone } from "./portal-content";

export interface DashboardSectionProps {
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
}

export function DashboardSection({
  title,
  description,
  actionLabel,
  onAction,
  children,
  className,
  contentClassName,
}: DashboardSectionProps) {
  return (
    <Card className={cn("min-w-0 p-4 sm:p-5", className)}>
      <SectionHeader
        title={title}
        description={description}
        action={
          actionLabel ? (
            <Button
              className="h-auto shrink-0 px-2 py-1 text-xs"
              variant="ghost"
              onClick={onAction}
            >
              {actionLabel}
              <ChevronRight className="size-3.5" aria-hidden="true" />
            </Button>
          ) : null
        }
      />
      <div className={cn("mt-4", contentClassName)}>{children}</div>
    </Card>
  );
}

export interface AppointmentItemData {
  id: string;
  time: string;
  duration: string;
  clientName: string;
  service: string;
  location: string;
  status?: string;
  statusTone?: StatusTone;
}

export interface AppointmentListItemProps {
  appointment: AppointmentItemData;
  className?: string;
}

export function AppointmentListItem({
  appointment,
  className,
}: AppointmentListItemProps) {
  const initials = appointment.clientName
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2);

  return (
    <li
      className={cn(
        "grid grid-cols-[3.5rem_2.25rem_minmax(0,1fr)] items-center gap-3 border-b border-[var(--border)] py-3 last:border-b-0",
        className,
      )}
    >
      <div>
        <p className="text-sm font-bold text-[var(--text)]">
          {appointment.time}
        </p>
        <p className="text-[0.6875rem] text-[var(--text-muted)]">
          {appointment.duration}
        </p>
      </div>
      <Avatar className="size-9">
        <AvatarFallback className="text-xs">{initials}</AvatarFallback>
      </Avatar>
      <div className="min-w-0">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <p className="truncate text-sm font-semibold text-[var(--text)]">
            {appointment.clientName}
          </p>
          {appointment.status ? (
            <StatusBadge
              className="px-1.5 py-0 text-[0.625rem]"
              tone={appointment.statusTone}
            >
              {appointment.status}
            </StatusBadge>
          ) : null}
        </div>
        <p className="truncate text-xs text-[var(--text-muted)]">
          {appointment.service} · {appointment.location}
        </p>
      </div>
    </li>
  );
}

export interface AppointmentListProps {
  items: AppointmentItemData[];
  className?: string;
}

export function AppointmentList({ items, className }: AppointmentListProps) {
  return (
    <ol className={className} aria-label="Lista wizyt">
      {items.map((appointment) => (
        <AppointmentListItem appointment={appointment} key={appointment.id} />
      ))}
    </ol>
  );
}

const itemToneClasses = {
  neutral: "bg-[var(--surface-muted)] text-[var(--text-muted)]",
  success: "bg-[var(--success-soft)] text-[var(--success)]",
  warning: "bg-[var(--warning-soft)] text-[var(--warning)]",
  danger: "bg-[var(--danger-soft)] text-[var(--danger)]",
  info: "bg-[var(--info-soft)] text-[var(--info)]",
} as const;

export interface AttentionItemData {
  id: string;
  title: string;
  description: string;
  icon: LucideIcon;
  tone?: StatusTone;
}

export function AttentionItem({ item }: { item: AttentionItemData }) {
  const Icon = item.icon;
  return (
    <li className="flex gap-3 border-b border-[var(--border)] py-3 first:pt-0 last:border-b-0 last:pb-0">
      <span
        className={cn(
          "flex size-9 shrink-0 items-center justify-center rounded-[var(--radius-control)]",
          itemToneClasses[item.tone ?? "neutral"],
        )}
      >
        <Icon className="size-4.5" aria-hidden="true" />
      </span>
      <div className="min-w-0">
        <p className="text-sm font-semibold text-[var(--text)]">{item.title}</p>
        <p className="mt-0.5 text-xs leading-relaxed text-[var(--text-muted)]">
          {item.description}
        </p>
      </div>
    </li>
  );
}

export interface AttentionListProps {
  items: AttentionItemData[];
}

export function AttentionList({ items }: AttentionListProps) {
  return (
    <ul aria-label="Elementy wymagające uwagi">
      {items.map((item) => (
        <AttentionItem item={item} key={item.id} />
      ))}
    </ul>
  );
}

export interface SummaryItemData {
  id: string;
  title: string;
  description?: string;
  value?: string;
  icon?: LucideIcon;
  tone?: StatusTone;
}

export interface SummaryListProps {
  items: SummaryItemData[];
  ariaLabel: string;
}

export function SummaryList({ items, ariaLabel }: SummaryListProps) {
  return (
    <ul className="divide-y divide-[var(--border)]" aria-label={ariaLabel}>
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <li
            className="flex items-center gap-3 py-3 first:pt-0 last:pb-0"
            key={item.id}
          >
            {Icon ? (
              <span
                className={cn(
                  "flex size-9 shrink-0 items-center justify-center rounded-full",
                  itemToneClasses[item.tone ?? "neutral"],
                )}
              >
                <Icon className="size-4" aria-hidden="true" />
              </span>
            ) : null}
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-[var(--text)]">
                {item.title}
              </p>
              {item.description ? (
                <p className="truncate text-xs text-[var(--text-muted)]">
                  {item.description}
                </p>
              ) : null}
            </div>
            {item.value ? (
              <span className="shrink-0 text-xs font-semibold text-[var(--text-muted)]">
                {item.value}
              </span>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}

export interface EventItemData {
  id: string;
  day: string;
  month: string;
  title: string;
  meta: string;
}

export function EventList({ items }: { items: EventItemData[] }) {
  return (
    <ul className="space-y-3" aria-label="Nadchodzące wydarzenia">
      {items.map((item) => (
        <li
          className="flex gap-3 rounded-[var(--radius-control)] bg-[var(--surface-subtle)] p-3"
          key={item.id}
        >
          <div className="flex size-11 shrink-0 flex-col items-center justify-center rounded-[var(--radius-control)] bg-[var(--primary-soft)] text-[var(--primary)]">
            <span className="text-sm leading-none font-bold">{item.day}</span>
            <span className="mt-0.5 text-[0.5625rem] font-bold uppercase">
              {item.month}
            </span>
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-[var(--text)]">
              {item.title}
            </p>
            <p className="mt-0.5 text-xs text-[var(--text-muted)]">
              {item.meta}
            </p>
          </div>
        </li>
      ))}
    </ul>
  );
}

export interface AvailabilityDayData {
  id: string;
  day: string;
  date: string;
  hours: string;
  available?: boolean;
}

export function AvailabilitySummary({
  items,
}: {
  items: AvailabilityDayData[];
}) {
  return (
    <ul
      className="grid grid-cols-3 gap-2"
      aria-label="Dostępność w tym tygodniu"
    >
      {items.map((item) => (
        <li
          className={cn(
            "rounded-[var(--radius-control)] border p-2 text-center",
            item.available
              ? "border-[var(--primary)] bg-[var(--primary-soft)]"
              : "border-[var(--border)] bg-[var(--surface-subtle)]",
          )}
          key={item.id}
        >
          <p className="text-[0.625rem] font-bold text-[var(--text-muted)] uppercase">
            {item.day}
          </p>
          <p className="mt-1 text-sm font-semibold text-[var(--text)]">
            {item.date}
          </p>
          <p className="mt-1 text-[0.625rem] text-[var(--text-muted)]">
            {item.hours}
          </p>
        </li>
      ))}
    </ul>
  );
}
