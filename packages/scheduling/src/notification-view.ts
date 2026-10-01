import { formatInTimeZone } from "date-fns-tz";
import type { VisitTone } from "./visits";

// A portal notification (docs/product/booking-plan.md, R13) as the bell's
// list and the live toast show it: what happened, to whose visit and when,
// in Polish, with a link to the visit in the calendar. Admins see the money
// and the specialist; a specialist's own notifications carry neither.

/** A notification as `listNotifications` (@repo/supabase) gives it. */
export interface NotificationLike {
  id: number;
  kind: string;
  actor: "client" | "centre" | "payment" | "system";
  appointmentId: string | null;
  createdAt: string;
  readAt: string | null;
  details: {
    reference: string | null;
    startsAt: string | null;
    mode: "online" | "in_person" | null;
    clientName: string | null;
    serviceName: string | null;
    specialistName: string | null;
    fromStartsAt: string | null;
    reason: string | null;
    refundMinor: number | null;
    refundDueMinor: number | null;
    priceMinor: number | null;
    currencyCode: string | null;
  };
}

export type NotificationIcon =
  "new" | "reserved" | "paid" | "cancelled" | "moved" | "refund";

export interface NotificationView {
  id: number;
  title: string;
  /** `Jan Kowalski · Konsultacja · sob. 03.10, 11:00 · …` */
  description: string;
  tone: VisitTone;
  icon: NotificationIcon;
  /** The visit in the calendar, on its day. */
  href: string | null;
  /** `dziś, 10:05`, `wczoraj, 21:30`, `28.09, 09:00` */
  when: string;
  unread: boolean;
}

export function notificationView(
  notification: NotificationLike,
  {
    timeZone,
    portal,
    now = new Date(),
  }: { timeZone: string; portal: "admin" | "specialist"; now?: Date },
): NotificationView {
  const d = notification.details;
  const local = (instant: string, pattern: string) =>
    formatInTimeZone(new Date(instant), timeZone, pattern);
  const visitTime = (instant: string | null) => {
    if (!instant) return null;
    const weekday = new Intl.DateTimeFormat("pl-PL", {
      weekday: "short",
      timeZone,
    }).format(new Date(instant));
    return `${weekday} ${local(instant, "dd.MM, HH:mm")}`;
  };
  const money = (minor: number | null) =>
    minor === null
      ? null
      : new Intl.NumberFormat("pl-PL", {
          style: "currency",
          currency: d.currencyCode ?? "PLN",
          maximumFractionDigits: minor % 100 === 0 ? 0 : 2,
        }).format(minor / 100);
  const admin = portal === "admin";

  let title: string;
  let tone: VisitTone;
  let icon: NotificationIcon;
  const extra: (string | null)[] = [];
  switch (notification.kind) {
    case "booked":
      [title, tone, icon] = ["Nowa wizyta", "success", "new"];
      break;
    case "reserved":
      [title, tone, icon] = [
        "Nowa rezerwacja, płatność później",
        "info",
        "reserved",
      ];
      break;
    case "centre_booked":
      [title, tone, icon] = ["Centrum umówiło wizytę", "info", "new"];
      break;
    case "paid":
      [title, tone, icon] = ["Rezerwacja opłacona", "success", "paid"];
      break;
    case "cancelled":
      title =
        notification.actor === "system"
          ? "Anulowano – brak płatności"
          : notification.actor === "centre"
            ? "Centrum odwołało wizytę"
            : "Klient odwołał wizytę";
      [tone, icon] = ["danger", "cancelled"];
      if (
        admin &&
        notification.actor !== "system" &&
        d.refundDueMinor !== null
      ) {
        extra.push(
          d.refundDueMinor > 0
            ? `Do zwrotu: ${money(d.refundDueMinor)}`
            : "Bez zwrotu",
        );
      }
      break;
    case "rescheduled":
      title =
        notification.actor === "centre"
          ? "Centrum przesunęło wizytę"
          : "Klient przełożył wizytę";
      [tone, icon] = ["info", "moved"];
      if (d.fromStartsAt) extra.push(`wcześniej ${visitTime(d.fromStartsAt)}`);
      break;
    case "refunded":
      title = `Zwrot pieniędzy: ${money(d.refundMinor) ?? ""}`.trim();
      [tone, icon] = ["info", "refund"];
      break;
    default:
      [title, tone, icon] = ["Zmiana w wizycie", "neutral", "new"];
  }
  if (d.reason && d.reason !== "unpaid") extra.push(d.reason);

  const description = [
    d.clientName,
    d.serviceName,
    visitTime(d.startsAt),
    admin ? d.specialistName : null,
    ...extra,
  ]
    .filter(Boolean)
    .join(" · ");

  const day = (instant: Date | string) =>
    formatInTimeZone(new Date(instant), timeZone, "yyyy-MM-dd");
  const today = day(now);
  const yesterday = day(new Date(now.getTime() - 24 * 60 * 60 * 1000));
  const created = day(notification.createdAt);
  const clock = local(notification.createdAt, "HH:mm");
  const when =
    created === today
      ? `dziś, ${clock}`
      : created === yesterday
        ? `wczoraj, ${clock}`
        : local(notification.createdAt, "dd.MM, HH:mm");

  return {
    id: notification.id,
    title,
    description,
    tone,
    icon,
    href:
      notification.appointmentId && d.startsAt
        ? `/kalendarz?data=${day(d.startsAt)}&wizyta=${notification.appointmentId}`
        : null,
    when,
    unread: notification.readAt === null,
  };
}
