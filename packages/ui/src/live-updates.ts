"use client";

import {
  DEFAULT_TIME_ZONE,
  notificationView,
  type NotificationLike,
} from "@repo/scheduling";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { useOptionalNotifications } from "./notifications/context";
import { showNotificationToast } from "./notifications/toast";

// A portal kept up to date as it happens (docs/product/booking-plan.md,
// R13): the database says on the person's own channel that visits changed
// or that there is a notification, and the page reloads its data from the
// server (once for a burst of changes; in a tab in the background, once
// when it is shown again, not for each change). A notification for this
// portal also shows as a toast. The portal passes how to listen (its Supabase client).

export interface LiveSignals {
  onVisits: () => void;
  onNotification: (
    notification: NotificationLike & { portal: "admin" | "specialist" },
  ) => void;
  onReconnect: () => void;
}

export interface LivePortalOptions {
  /** Who listens: a new key listens anew (e.g. the user's id). */
  channelKey: string;
  portal: "admin" | "specialist";
  /** Starts listening; returns how to stop. */
  subscribe: (signals: LiveSignals) => () => void;
  timeZone?: string;
  /** How long to wait for more changes before reloading. */
  delayMs?: number;
}

export function useLivePortal({
  channelKey,
  portal,
  subscribe,
  timeZone = DEFAULT_TIME_ZONE,
  delayMs = 400,
}: LivePortalOptions) {
  const router = useRouter();
  const panel = useOptionalNotifications();
  const panelOpen = useRef(false);
  panelOpen.current = panel?.open ?? false;
  const subscribeRef = useRef(subscribe);
  useEffect(() => {
    subscribeRef.current = subscribe;
  }, [subscribe]);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    let missed = false;
    const refresh = () => {
      clearTimeout(timer);
      if (document.visibilityState === "hidden") {
        missed = true;
        return;
      }
      timer = setTimeout(() => router.refresh(), delayMs);
    };
    const onVisible = () => {
      if (document.visibilityState !== "visible" || !missed) return;
      missed = false;
      refresh();
    };
    document.addEventListener("visibilitychange", onVisible);
    const stop = subscribeRef.current({
      onVisits: refresh,
      onReconnect: refresh,
      onNotification: (notification) => {
        if (notification.portal !== portal) return;
        // With the panel open, it shows there (after the reload) instead.
        if (!panelOpen.current) {
          const view = notificationView(notification, { timeZone, portal });
          const href = view.href;
          showNotificationToast(
            view,
            href ? () => router.push(href as Route) : undefined,
          );
        }
        refresh();
      },
    });
    return () => {
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisible);
      stop();
    };
  }, [channelKey, portal, timeZone, delayMs, router]);
}
