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
  Check,
  CheckCheck,
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
import { IconButton } from "./icon-action";
import {
  NotificationDrawer,
  NotificationItem,
  type NotificationItemProps,
} from "./notification";

// The bell in a portal's header and its inbox (docs/product/booking-plan.md,
// R13): the latest notifications from the server. One stays unread until
// the person marks it (its button), opens it (its booking), or marks them
// all; the list shows it at once, the database follows, and the page then
// reloads the inbox from it.

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
  /** Marks one notification read (a server action). */
  markRead: (id: number) => Promise<unknown>;
  /** Marks the portal's inbox read (a server action). */
  markAllRead: () => Promise<unknown>;
}

export function PortalNotifications({
  items,
  unreadCount,
  markRead,
  markAllRead,
}: PortalNotificationsProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  // Marked here, before the server's list says so.
  const [read, setRead] = useState<ReadonlySet<number>>(new Set());
  const unread = (item: NotificationView) => item.unread && !read.has(item.id);
  const count = Math.max(
    0,
    unreadCount -
      items.filter((item) => item.unread && read.has(item.id)).length,
  );

  const markOne = (id: number) => {
    setRead((done) => new Set(done).add(id));
    void markRead(id).then(() => router.refresh());
  };
  const markAll = () => {
    setRead(new Set(items.map((item) => item.id)));
    void markAllRead().then(() => router.refresh());
  };

  return (
    <NotificationDrawer
      count={count}
      headerAction={
        count ? (
          <IconButton
            icon={<CheckCheck aria-hidden="true" />}
            label="Oznacz wszystkie jako przeczytane"
            onClick={markAll}
          />
        ) : null
      }
      onOpenChange={setOpen}
      open={open}
      trigger={
        <Button
          aria-label={count ? `Powiadomienia, nowe: ${count}` : "Powiadomienia"}
          className="relative"
          size="icon"
          variant="ghost"
        >
          <Bell aria-hidden="true" className="size-5" />
          {count ? (
            <span
              aria-hidden="true"
              className="absolute top-0.5 right-0.5 flex min-w-4 items-center justify-center rounded-full bg-[var(--danger)] px-1 text-[0.625rem] leading-4 font-semibold text-[var(--danger-foreground)] ring-2 ring-[var(--surface)]"
            >
              {count > 9 ? "9+" : count}
            </span>
          ) : null}
        </Button>
      }
    >
      {items.length ? (
        items.map((item) => (
          <NotificationItem
            action={
              unread(item) ? (
                <IconButton
                  icon={<Check aria-hidden="true" />}
                  label="Oznacz jako przeczytane"
                  onClick={() => markOne(item.id)}
                />
              ) : null
            }
            description={item.description}
            subtitle={item.reference ? `Nr ${item.reference}` : null}
            icon={ICONS[item.icon]}
            key={item.id}
            onClick={
              item.href
                ? () => {
                    if (unread(item)) markOne(item.id);
                    setOpen(false);
                    router.push(item.href as Route);
                  }
                : undefined
            }
            time={item.when}
            title={item.title}
            tone={TONES[item.tone]}
            unread={unread(item)}
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
