import {
  AlertTriangle,
  Inbox,
  LoaderCircle,
  RefreshCw,
  type LucideIcon,
} from "lucide-react";
import type { ReactNode } from "react";
import { Badge, type BadgeProps } from "./badge";
import { Button } from "./button";
import { Card } from "./card";
import { cn } from "./lib/utils";

export interface PageHeaderProps {
  title: string;
  description?: string;
  eyebrow?: string;
  actions?: ReactNode;
  meta?: ReactNode;
  className?: string;
}

export function PageHeader({
  title,
  description,
  eyebrow,
  actions,
  meta,
  className,
}: PageHeaderProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between",
        className,
      )}
    >
      <div className="min-w-0">
        {eyebrow ? (
          <p className="mb-1 text-xs font-bold tracking-[0.08em] text-[var(--primary)] uppercase">
            {eyebrow}
          </p>
        ) : null}
        <h1 className="font-heading text-3xl leading-[var(--ks-leading-tight)] font-semibold tracking-[-0.025em] text-[var(--text)] sm:text-4xl">
          {title}
        </h1>
        {description ? (
          <p className="mt-1 max-w-3xl text-sm leading-relaxed text-[var(--text-muted)] sm:text-base">
            {description}
          </p>
        ) : null}
      </div>
      {actions || meta ? (
        <div className="flex shrink-0 items-center gap-3">
          {meta}
          {actions}
        </div>
      ) : null}
    </div>
  );
}

export interface SectionHeaderProps {
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

export function SectionHeader({
  title,
  description,
  action,
  className,
}: SectionHeaderProps) {
  return (
    <div className={cn("flex items-start justify-between gap-4", className)}>
      <div>
        <h2 className="font-heading text-xl leading-tight font-semibold text-[var(--text)]">
          {title}
        </h2>
        {description ? (
          <p className="mt-1 text-sm text-[var(--text-muted)]">{description}</p>
        ) : null}
      </div>
      {action}
    </div>
  );
}

const metricToneClasses = {
  mint: "bg-[var(--accent-mint)] text-[var(--success)]",
  blue: "bg-[var(--accent-blue)] text-[var(--info)]",
  lilac: "bg-[var(--accent-lilac)] text-[#6848d7]",
  peach: "bg-[var(--accent-peach)] text-[#c45f18]",
  rose: "bg-[var(--accent-rose)] text-[var(--danger)]",
} as const;

export interface MetricCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  tone?: keyof typeof metricToneClasses;
  detail?: string;
  trend?: string;
  trendDirection?: "up" | "down" | "neutral";
  className?: string;
}

export function MetricCard({
  label,
  value,
  icon: Icon,
  tone = "mint",
  detail,
  trend,
  trendDirection = "neutral",
  className,
}: MetricCardProps) {
  return (
    <Card className={cn("flex min-h-28 items-center gap-4 p-4", className)}>
      <span
        className={cn(
          "flex size-12 shrink-0 items-center justify-center rounded-[var(--radius-control)]",
          metricToneClasses[tone],
        )}
      >
        <Icon className="size-6" aria-hidden="true" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-[var(--text)]">{label}</p>
        <div className="mt-1 flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <p className="font-heading text-3xl leading-none font-semibold text-[var(--text)]">
            {value}
          </p>
          {trend ? (
            <span
              className={cn(
                "rounded-full px-2 py-1 text-xs font-bold",
                trendDirection === "up" &&
                  "bg-[var(--success-soft)] text-[var(--success)]",
                trendDirection === "down" &&
                  "bg-[var(--danger-soft)] text-[var(--danger)]",
                trendDirection === "neutral" &&
                  "bg-[var(--surface-muted)] text-[var(--text-muted)]",
              )}
            >
              {trend}
            </span>
          ) : null}
        </div>
        {detail ? (
          <p className="mt-1 truncate text-xs text-[var(--text-muted)]">
            {detail}
          </p>
        ) : null}
      </div>
    </Card>
  );
}

export type StatusTone = "neutral" | "success" | "warning" | "danger" | "info";

export interface StatusBadgeProps extends Omit<BadgeProps, "variant"> {
  tone?: StatusTone;
  dot?: boolean;
}

export function StatusBadge({
  tone = "neutral",
  dot = true,
  children,
  ...props
}: StatusBadgeProps) {
  return (
    <Badge variant={tone} {...props}>
      {dot ? <span className="size-1.5 rounded-full bg-current" /> : null}
      {children}
    </Badge>
  );
}

interface StateProps {
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

function StateFrame({
  icon,
  title,
  description,
  action,
  className,
}: StateProps & { icon: ReactNode }) {
  return (
    <div
      className={cn(
        "flex min-h-64 flex-col items-center justify-center rounded-[var(--radius-surface)] border border-dashed border-[var(--border-strong)] bg-[var(--surface-subtle)] p-8 text-center",
        className,
      )}
    >
      <span className="flex size-12 items-center justify-center rounded-full bg-[var(--primary-soft)] text-[var(--primary)]">
        {icon}
      </span>
      <h3 className="font-heading mt-4 text-xl font-semibold text-[var(--text)]">
        {title}
      </h3>
      {description ? (
        <p className="mt-1 max-w-md text-sm leading-relaxed text-[var(--text-muted)]">
          {description}
        </p>
      ) : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

export function EmptyState(props: StateProps) {
  return <StateFrame icon={<Inbox className="size-6" />} {...props} />;
}

export function LoadingState({
  title = "Ładowanie danych",
  description = "To potrwa tylko chwilę.",
  ...props
}: Partial<StateProps>) {
  return (
    <StateFrame
      icon={<LoaderCircle className="size-6 animate-spin" />}
      title={title}
      description={description}
      {...props}
    />
  );
}

export function ErrorState({
  title = "Nie udało się wczytać danych",
  description = "Spróbuj ponownie lub wróć za chwilę.",
  action = (
    <Button variant="secondary">
      <RefreshCw className="size-4" aria-hidden="true" />
      Spróbuj ponownie
    </Button>
  ),
  ...props
}: Partial<StateProps>) {
  return (
    <StateFrame
      icon={<AlertTriangle className="size-6 text-[var(--danger)]" />}
      title={title}
      description={description}
      action={action}
      {...props}
    />
  );
}
