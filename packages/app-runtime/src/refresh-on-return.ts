"use client";

import { useEffect, useRef } from "react";

// Shared data (e.g. who has which room) can change while a tab sits in the
// background. When the person comes back after a while, the page reloads
// its data; the database still has the last word on every change.

export interface ReturnRefresherOptions {
  refresh: () => void;
  /** How long the page must have been hidden to refresh on return. */
  minAwayMs: number;
  now?: () => number;
}

export function createReturnRefresher({
  refresh,
  minAwayMs,
  now = Date.now,
}: ReturnRefresherOptions) {
  let hiddenAt: number | null = null;
  return {
    onVisibilityChange(state: DocumentVisibilityState) {
      if (state === "hidden") {
        hiddenAt = now();
        return;
      }
      if (hiddenAt !== null && now() - hiddenAt >= minAwayMs) refresh();
      hiddenAt = null;
    },
  };
}

/** Calls `refresh` when the tab is shown again after `minAwayMs` hidden. */
export function useRefreshOnReturn(refresh: () => void, minAwayMs = 30_000) {
  const latest = useRef(refresh);
  useEffect(() => {
    latest.current = refresh;
  }, [refresh]);

  useEffect(() => {
    const refresher = createReturnRefresher({
      refresh: () => latest.current(),
      minAwayMs,
    });
    const onChange = () =>
      refresher.onVisibilityChange(document.visibilityState);
    document.addEventListener("visibilitychange", onChange);
    return () => document.removeEventListener("visibilitychange", onChange);
  }, [minAwayMs]);
}
