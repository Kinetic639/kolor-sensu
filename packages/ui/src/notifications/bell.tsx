"use client";

import { Bell } from "lucide-react";
import { Button } from "../button";
import { cn } from "../lib/utils";
import { unreadNow, useNotifications } from "./context";

// The bell in the header: opens and closes the notifications panel, with
// how many are new (as marked here, before the server's list says so).

export function NotificationsBell({
  items,
  unreadCount,
}: {
  items: { id: number; unread: boolean }[];
  unreadCount: number;
}) {
  const { open, toggle, marked, allReadAt } = useNotifications();
  const count = unreadNow(items, unreadCount, marked, allReadAt);
  return (
    <Button
      aria-controls="powiadomienia"
      aria-expanded={open}
      aria-label={count ? `Powiadomienia, nowe: ${count}` : "Powiadomienia"}
      className={cn("relative", open && "bg-[var(--surface-muted)]")}
      onClick={toggle}
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
  );
}
