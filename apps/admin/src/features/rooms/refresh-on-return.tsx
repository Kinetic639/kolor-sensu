"use client";

import { useRefreshOnReturn } from "@repo/app-runtime/refresh-on-return";
import { useRouter } from "next/navigation";

/** Reloads the room's data when the tab is shown again after a while. */
export function RefreshOnReturn() {
  const router = useRouter();
  useRefreshOnReturn(router.refresh);
  return null;
}
