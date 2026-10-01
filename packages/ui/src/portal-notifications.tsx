"use client";

import type {
  NotificationIcon,
  NotificationView,
  VisitTone,
} from "@repo/scheduling";
import {
  Banknote,
  Bell,
  CalendarClock,
  CalendarPlus,
  CalendarX,
  CreditCard,
  Hourglass,
  type LucideIcon,
} from "lucide-react";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "./button";
import {
  NotificationDrawer,
  NotificationItem,
  type NotificationItemProps,
} from "./notification";

// The bell in a portal's header and its inbox (docs/product/booking-plan.md,
// R13): the latest notifications from the server; opening it reads them
// (the dots stay while it is open), a notification opens its visit.

const ICONS: Record<NotificationIcon, LucideIcon> = {
  new: CalendarPlus,
  reserved: Hourglass,
  paid: CreditCard,
  cancelled: CalendarX,
  moved: CalendarClock,
  refund: Banknote,
};

const TONES: Record<VisitTone, NonNullable<NotificationItemProps["tone"]>> = {
  success: "mint",
  info: "blue",
  warning: "peach",
  danger: "rose",
  neutral: "lilac",
};

export interface PortalNotificationsProps {
  items: NotificationView[];
  unreadCount: number;
  /** Marks the portal's inbox read (a server action). */
  markRead: () => Promise<unknown>;
}

export function PortalNotifications({
  items,
  unreadCount,
  markRead,
}: PortalNotificationsProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  // Unread when the inbox was opened: still marked while it stays open.
  const [fresh, setFresh] = useState<ReadonlySet<number>>(new Set());

  const onOpenChange = (next: boolean) => {
    setOpen(next);
    if (next && unreadCount > 0) {
      setFresh(
        new Set(items.filter((item) => item.unread).map((item) => item.id)),
      );
      void markRead().then(() => router.refresh());
    }
  };

  return (
    <NotificationDrawer
      count={unreadCount}
      onOpenChange={onOpenChange}
      open={open}
      trigger={
        <Button
          aria-label={
            unreadCount
              ? `Powiadomienia, nowe: ${unreadCount}`
              : "Powiadomienia"
          }
          className="relative"
          size="icon"
          variant="ghost"
        >
          <Bell aria-hidden="true" className="size-5" />
          {unreadCount ? (
            <span
              aria-hidden="true"
              className="absolute top-0.5 right-0.5 flex min-w-4 items-center justify-center rounded-full bg-[var(--danger)] px-1 text-[0.625rem] leading-4 font-semibold text-white ring-2 ring-white"
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          ) : null}
        </Button>
      }
    >
      {items.length ? (
        items.map((item) => (
          <NotificationItem
            description={item.description}
            icon={ICONS[item.icon]}
            key={item.id}
            onClick={
              item.href
                ? () => {
                    setOpen(false);
                    router.push(item.href as Route);
                  }
                : undefined
            }
            time={item.when}
            title={item.title}
            tone={TONES[item.tone]}
            unread={item.unread || fresh.has(item.id)}
          />
        ))
      ) : (
        <p className="py-8 text-center text-sm text-[var(--text-muted)]">
          Brak powiadomień. Pojawią się tu nowe rezerwacje, odwołania i zmiany
          terminów.
        </p>
      )}
    </NotificationDrawer>
  );
}
