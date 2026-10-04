"use client";

import { useRefreshEvery } from "@repo/ui/live-updates";

// The dashboard kept to the time (R14): what is due soon, today after
// midnight, now on the day's line. Changes in the database come at once
// (the live updates); time going by, every five minutes while it is seen.

export function KeepFresh() {
  useRefreshEvery(5 * 60_000);
  return null;
}
