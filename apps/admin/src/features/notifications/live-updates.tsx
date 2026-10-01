"use client";

import { createClient } from "@/lib/supabase/client";
import { subscribeToPortalUpdates } from "@repo/supabase";
import { useLivePortal } from "@repo/ui/live-updates";

// The portal kept up to date as it happens (R13): on this person's own
// channel, the database says visits changed or there is a notification.

export function LiveUpdates({ userId }: { userId: string }) {
  useLivePortal({
    channelKey: userId,
    portal: "admin",
    subscribe: (signals) =>
      subscribeToPortalUpdates(createClient(), userId, signals),
  });
  return null;
}
