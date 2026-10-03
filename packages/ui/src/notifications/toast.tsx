"use client";

import type { NotificationView, VisitTone } from "@repo/scheduling";
import { toast, type ToastTone } from "../toast";
import { TooltipProvider } from "../tooltip";
import { KIND_ICONS, NotificationBadges } from "./icons";

// A notification as it comes, as a toast: the panel's row (what happened,
// its facts as icons; whose visit, when and its number) with "Otwórz".

const TONES: Record<VisitTone, ToastTone> = {
  success: "success",
  info: "info",
  warning: "warning",
  danger: "error",
  neutral: "info",
};

export function showNotificationToast(
  view: NotificationView,
  open?: () => void,
) {
  const Icon = KIND_ICONS[view.icon];
  return toast[TONES[view.tone]](view.title, {
    icon: <Icon aria-hidden="true" />,
    meta: view.badges.length ? (
      <TooltipProvider delayDuration={200}>
        <NotificationBadges badges={view.badges} />
      </TooltipProvider>
    ) : undefined,
    description: [view.summary, view.reference].filter(Boolean).join(" · "),
    action: open ? { label: "Otwórz", onClick: open } : undefined,
  });
}
