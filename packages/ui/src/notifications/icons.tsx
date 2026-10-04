"use client";

import type {
  NotificationBadge,
  NotificationIcon,
  VisitTone,
} from "@repo/scheduling";
import {
  AlarmClock,
  Ban,
  Building2,
  Coins,
  CreditCard,
  Hourglass,
  TimerOff,
  User,
  Video,
  type LucideIcon,
} from "lucide-react";
import { cn } from "../lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "../tooltip";
import { KIND_ICONS, TONE_SQUARES } from "./kinds";

// A notification's kind as a small square in its tone, and its facts as
// tiny icons, each with its words in a tooltip (and for a screen reader).
// The kinds' icons and the tones' colours live in a plain module (kinds.ts)
// so that server components can read them too.

export { KIND_ICONS, TONE_SQUARES };

const BADGE_ICONS: Record<NotificationBadge["id"], LucideIcon> = {
  "paid-now": CreditCard,
  "pay-later": Hourglass,
  client: User,
  centre: Building2,
  system: TimerOff,
  "refund-due": Coins,
  "no-refund": Ban,
  refunded: Coins,
  online: Video,
  soon: AlarmClock,
};

const BADGE_TONES: Record<VisitTone, string> = {
  success: "text-[var(--success)]",
  info: "text-[var(--info)]",
  warning: "text-[var(--warning)]",
  danger: "text-[var(--danger)]",
  neutral: "text-[var(--text-subtle)]",
};

export function KindIcon({
  icon,
  tone,
  dim = false,
}: {
  icon: NotificationIcon;
  tone: VisitTone;
  dim?: boolean;
}) {
  const Icon = KIND_ICONS[icon];
  return (
    <span
      aria-hidden="true"
      className={cn(
        "grid size-5 shrink-0 place-items-center rounded-[5px]",
        TONE_SQUARES[tone],
        dim && "opacity-70",
      )}
    >
      <Icon className="size-3" />
    </span>
  );
}

/** The facts as icons; needs a TooltipProvider above. */
export function NotificationBadges({
  badges,
}: {
  badges: NotificationBadge[];
}) {
  if (!badges.length) return null;
  return (
    <span className="inline-flex shrink-0 items-center gap-0.5">
      {badges.map((badge) => {
        const Icon = BADGE_ICONS[badge.id];
        return (
          <Tooltip key={badge.id}>
            <TooltipTrigger asChild>
              <span
                aria-label={badge.label}
                className={cn(
                  "inline-grid size-4 place-items-center rounded-[4px] hover:bg-[var(--surface-muted)]",
                  BADGE_TONES[badge.tone],
                )}
                role="img"
              >
                <Icon aria-hidden="true" className="size-3" />
              </span>
            </TooltipTrigger>
            <TooltipContent>{badge.label}</TooltipContent>
          </Tooltip>
        );
      })}
    </span>
  );
}
