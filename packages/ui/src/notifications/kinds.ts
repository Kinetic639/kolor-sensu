import type { NotificationIcon, VisitTone } from "@repo/scheduling";
import {
  Banknote,
  CalendarClock,
  CalendarPlus,
  CalendarX,
  CreditCard,
  Hourglass,
  UserCheck,
  type LucideIcon,
  ClipboardCheck,
} from "lucide-react";

// A notification's kind as an icon, a tone as a small square's colours: a
// plain module (not a client one), so server components (the dashboard's
// list of what needs doing) read them as they are, not as references to
// client code.

export const KIND_ICONS: Record<NotificationIcon, LucideIcon> = {
  new: CalendarPlus,
  reserved: Hourglass,
  paid: CreditCard,
  cancelled: CalendarX,
  moved: CalendarClock,
  refund: Banknote,
  profile: UserCheck,
  closing: ClipboardCheck,
};

export const TONE_SQUARES: Record<VisitTone, string> = {
  success: "bg-[var(--success-soft)] text-[var(--success)]",
  info: "bg-[var(--info-soft)] text-[var(--info)]",
  warning: "bg-[var(--warning-soft)] text-[var(--warning)]",
  danger: "bg-[var(--danger-soft)] text-[var(--danger)]",
  neutral: "bg-[var(--surface-muted)] text-[var(--text-muted)]",
};
