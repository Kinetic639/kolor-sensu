"use client";

import { Bell, ChevronRight, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { Badge } from "./badge";
import { cn } from "./lib/utils";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  type SheetContentProps,
} from "./sheet";

const notificationToneClasses = {
  mint: "bg-[var(--accent-mint)] text-[var(--success)]",
  blue: "bg-[var(--accent-blue)] text-[var(--info)]",
  lilac: "bg-[var(--accent-lilac)] text-[#6848d7]",
  peach: "bg-[var(--accent-peach)] text-[#c45f18]",
  rose: "bg-[var(--accent-rose)] text-[var(--danger)]",
} as const;

export interface NotificationItemProps {
  title: string;
  /** Secondary text under the title (e.g. the booking's number). */
  subtitle?: string | null;
  description: string;
  time: string;
  icon: LucideIcon;
  tone?: keyof typeof notificationToneClasses;
  category?: string;
  unread?: boolean;
  expanded?: boolean;
  details?: ReactNode;
  onClick?: () => void;
  /** A control beside it (e.g. "mark as read"), outside its own button. */
  action?: ReactNode;
  className?: string;
}

export function NotificationItem({
  title,
  subtitle,
  description,
  time,
  icon: Icon,
  tone = "mint",
  category,
  unread = false,
  expanded = false,
  details,
  onClick,
  action,
  className,
}: NotificationItemProps) {
  return (
    <article
      className={cn(
        "relative rounded-[var(--radius-control)] border border-[var(--border)] bg-[var(--surface)]",
        expanded && "border-[var(--primary-soft)] bg-[var(--surface-subtle)]",
        className,
      )}
    >
      <div className="flex items-stretch">
        <button
          className="flex min-w-0 flex-1 items-start gap-3 p-3 text-left outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
          onClick={onClick}
          type="button"
        >
          {unread ? (
            <span className="mt-3 size-2 shrink-0 rounded-full bg-[var(--info)]" />
          ) : (
            <span className="w-2 shrink-0" />
          )}
          <span
            className={cn(
              "flex size-10 shrink-0 items-center justify-center rounded-[var(--radius-control)]",
              notificationToneClasses[tone],
            )}
          >
            <Icon className="size-5" aria-hidden="true" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="flex items-start justify-between gap-3">
              <span className="font-heading text-sm leading-snug font-semibold text-[var(--text)]">
                {title}
              </span>
              <span className="shrink-0 text-xs text-[var(--text-muted)]">
                {time}
              </span>
            </span>
            {subtitle ? (
              <span className="block text-[0.6875rem] font-medium text-[var(--text-subtle)] tabular-nums">
                {subtitle}
              </span>
            ) : null}
            <span className="mt-0.5 line-clamp-2 block text-xs leading-relaxed text-[var(--text-muted)]">
              {description}
            </span>
            {category ? (
              <Badge className="mt-2" variant="success">
                {category}
              </Badge>
            ) : null}
          </span>
          <ChevronRight className="mt-3 size-4 shrink-0 text-[var(--text-muted)]" />
        </button>
        {action ? (
          <div className="flex shrink-0 items-start pt-2 pr-2">{action}</div>
        ) : null}
      </div>
      {expanded && details ? (
        <div className="border-t border-[var(--border)] p-4">{details}</div>
      ) : null}
    </article>
  );
}

export interface NotificationDrawerProps {
  trigger?: ReactNode;
  children: ReactNode;
  count?: number;
  defaultOpen?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  side?: SheetContentProps["side"];
  /** A control in the header (e.g. "mark all as read"). */
  headerAction?: ReactNode;
}

export function NotificationDrawer({
  trigger,
  children,
  count = 0,
  defaultOpen,
  open,
  onOpenChange,
  side = "right",
  headerAction,
}: NotificationDrawerProps) {
  return (
    <Sheet defaultOpen={defaultOpen} open={open} onOpenChange={onOpenChange}>
      {trigger ? <SheetTrigger asChild>{trigger}</SheetTrigger> : null}
      <SheetContent
        className={cn(
          "w-full p-0",
          side === "right" && "sm:max-w-[34rem]",
          side === "bottom" && "min-h-[78vh]",
        )}
        side={side}
      >
        <SheetHeader className="border-b border-[var(--border)] p-6 pr-14">
          <div className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-full bg-[var(--primary-soft)] text-[var(--primary)]">
              <Bell className="size-5" aria-hidden="true" />
            </span>
            <div>
              <SheetTitle>Powiadomienia</SheetTitle>
              <SheetDescription>
                {count
                  ? `Nowe: ${count}`
                  : "Bądź na bieżąco z wizytami i ważnymi informacjami."}
              </SheetDescription>
            </div>
            {headerAction ? (
              <div className="ml-auto">{headerAction}</div>
            ) : null}
          </div>
        </SheetHeader>
        <div className="space-y-2 overflow-y-auto p-4">{children}</div>
      </SheetContent>
    </Sheet>
  );
}
