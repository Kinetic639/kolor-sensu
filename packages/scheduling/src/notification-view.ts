import { formatInTimeZone } from "date-fns-tz";
import { bookingHref, type VisitTone } from "./visits";

// A portal notification (docs/product/booking-plan.md, R13) as the panel
// and the live toast show it: what happened in two or three words, whose
// visit and when, the facts that matter as small icons with their words
// for a tooltip, and the rest for when it is opened. A link leads to the
// booking in the bookings table (found by its number, open in the side
// panel). Admins see the money and the specialist; a specialist's own
// notifications carry neither.

/** A notification as `listNotifications` (@repo/supabase) gives it. */
export interface NotificationLike {
  id: number;
  kind: string;
  actor: "client" | "centre" | "payment" | "system" | "specialist";
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
    /** Whose profile (a profile sent for review). */
    specialistId?: string | null;
    fromStartsAt: string | null;
    reason: string | null;
    refundMinor: number | null;
    refundDueMinor: number | null;
    priceMinor: number | null;
    currencyCode: string | null;
  };
}

export type NotificationIcon =
  | "new"
  | "reserved"
  | "paid"
  | "cancelled"
  | "moved"
  | "refund"
  | "profile"
  | "closing";

/** A fact shown as a small icon; `label` is what its tooltip says. */
export interface NotificationBadge {
  id:
    | "paid-now"
    | "pay-later"
    | "client"
    | "centre"
    | "system"
    | "refund-due"
    | "no-refund"
    | "refunded"
    | "online"
    | "soon";
  label: string;
  tone: VisitTone;
}

export interface NotificationDetail {
  label: string;
  value: string;
  tone?: VisitTone;
}

export interface NotificationView {
  id: number;
  /** `Nowa rezerwacja`, `Rezerwacja anulowana`, … */
  title: string;
  /** The booking's number, `2610-016`. */
  reference: string | null;
  /** Whose visit and when: `Jan Kowalski · czw. 08.10, 11:00`. */
  summary: string;
  /** At most three, in order: who, the money, online, soon. */
  badges: NotificationBadge[];
  /** Shown when it is opened. */
  details: NotificationDetail[];
  tone: VisitTone;
  icon: NotificationIcon;
  /** The booking, to load as it is now when opened. */
  visitId: string | null;
  /** The booking in the bookings table: found by its number, opened; or
   * the profile on the specialist's page. */
  href: string | null;
  /** What the link says: the booking's number, `Profil`. */
  linkText: string | null;
  /** Whom it is about, shown as their chip (a profile sent for review). */
  person?: { id: string; name: string } | null;
  /** `Dziś`, `Wczoraj`, `Poniedziałek 28.09`: the group it is in. */
  day: string;
  /** `10:05`, when it came. */
  time: string;
  unread: boolean;
}

const NEW_KINDS = new Set(["booked", "reserved", "centre_booked"]);
const PROFILE_KINDS = new Set([
  "profile_submitted",
  "profile_approved",
  "profile_rejected",
]);
const SOON_MS = 48 * 60 * 60 * 1000;

export function notificationView(
  notification: NotificationLike,
  {
    timeZone,
    portal,
    now = new Date(),
  }: { timeZone: string; portal: "admin" | "specialist"; now?: Date },
): NotificationView {
  const d = notification.details;
  const { kind, actor } = notification;
  const admin = portal === "admin";
  const local = (instant: string, pattern: string) =>
    formatInTimeZone(new Date(instant), timeZone, pattern);
  const weekday = (instant: string) =>
    new Intl.DateTimeFormat("pl-PL", { weekday: "short", timeZone }).format(
      new Date(instant),
    );
  const visitTime = (instant: string, pattern: string) =>
    `${weekday(instant)} ${local(instant, pattern)}`;
  const money = (minor: number) =>
    new Intl.NumberFormat("pl-PL", {
      style: "currency",
      currency: d.currencyCode ?? "PLN",
      maximumFractionDigits: minor % 100 === 0 ? 0 : 2,
    }).format(minor / 100);

  const dayOfCreated = (instant: Date | string) =>
    formatInTimeZone(new Date(instant), timeZone, "yyyy-MM-dd");
  const longWeekday = new Intl.DateTimeFormat("pl-PL", {
    weekday: "long",
    timeZone,
  }).format(new Date(notification.createdAt));
  const createdOn = dayOfCreated(notification.createdAt);
  const day =
    createdOn === dayOfCreated(now)
      ? "Dziś"
      : createdOn ===
          dayOfCreated(new Date(now.getTime() - 24 * 60 * 60 * 1000))
        ? "Wczoraj"
        : `${longWeekday[0]!.toUpperCase()}${longWeekday.slice(1)} ${local(notification.createdAt, "dd.MM")}`;

  // The profile: sent for review (admins, leading to it on the
  // specialist's page, their chip in the details), approved or sent back
  // (the specialist, leading to their own profile).
  if (PROFILE_KINDS.has(kind)) {
    const name = d.specialistName ?? "Specjalista";
    const when = visitTime(notification.createdAt, "dd.MM.yyyy, HH:mm");
    const shared = {
      id: notification.id,
      reference: null,
      badges: [],
      icon: "profile" as const,
      visitId: null,
      day,
      time: local(notification.createdAt, "HH:mm"),
      unread: notification.readAt === null,
    };
    if (kind === "profile_submitted") {
      return {
        ...shared,
        title: "Profil do weryfikacji",
        summary: name,
        details: [{ label: "Wysłany", value: when }],
        tone: "info",
        href: d.specialistId
          ? `/specjalisci/${d.specialistId}?zakladka=profil`
          : null,
        linkText: d.specialistId ? "Profil" : null,
        person: d.specialistId ? { id: d.specialistId, name } : null,
      };
    }
    const approved = kind === "profile_approved";
    return {
      ...shared,
      title: approved ? "Profil zatwierdzony" : "Profil do poprawy",
      summary: approved
        ? "Zmiany są już na stronie"
        : (d.reason ?? "Zobacz uwagi centrum"),
      details: [
        { label: approved ? "Zatwierdzony" : "Odesłany", value: when },
        ...(!approved && d.reason ? [{ label: "Powód", value: d.reason }] : []),
      ],
      tone: approved ? "success" : "warning",
      href: "/profil",
      linkText: "Profil",
      person: null,
    };
  }

  // A visit that has ended, to close: what it was and when, leading to it.
  if (kind === "visit_to_close") {
    const what = [
      d.serviceName,
      d.startsAt ? visitTime(d.startsAt, "dd.MM, HH:mm") : null,
    ]
      .filter(Boolean)
      .join(" · ");
    return {
      id: notification.id,
      title: "Wizyta do zamknięcia",
      reference: d.reference,
      summary: what,
      badges: [],
      details: [
        {
          label: "Do zrobienia",
          value: "Zaznacz, czy się odbyła, i dodaj tagi.",
        },
      ],
      tone: "warning",
      icon: "closing",
      visitId: notification.appointmentId,
      href:
        notification.appointmentId && d.reference
          ? bookingHref({
              id: notification.appointmentId,
              reference: d.reference,
            })
          : null,
      linkText: d.reference,
      person: null,
      day,
      time: local(notification.createdAt, "HH:mm"),
      unread: notification.readAt === null,
    };
  }

  let title: string;
  let tone: VisitTone;
  let icon: NotificationIcon;
  if (NEW_KINDS.has(kind)) {
    [title, tone, icon] = ["Nowa rezerwacja", "success", "new"];
  } else if (kind === "paid") {
    [title, tone, icon] = ["Rezerwacja opłacona", "success", "paid"];
  } else if (kind === "rescheduled") {
    [title, tone, icon] = ["Rezerwacja przełożona", "info", "moved"];
  } else if (kind === "cancelled") {
    [title, tone, icon] = ["Rezerwacja anulowana", "danger", "cancelled"];
  } else if (kind === "refunded") {
    [title, tone, icon] = ["Zwrot pieniędzy", "info", "refund"];
  } else {
    [title, tone, icon] = ["Zmiana w rezerwacji", "neutral", "new"];
  }

  // Who did it, the money, online, soon: at most three.
  const badges: NotificationBadge[] = [];
  const changed =
    kind === "cancelled"
      ? "Odwołana"
      : kind === "rescheduled"
        ? "Przełożona"
        : null;
  if (kind === "booked") {
    badges.push({
      id: "paid-now",
      label: "Opłacona online przy rezerwacji",
      tone: "success",
    });
  } else if (kind === "reserved") {
    badges.push({
      id: "pay-later",
      label: "Płatność później",
      tone: "warning",
    });
  } else if (kind === "centre_booked") {
    badges.push({
      id: "centre",
      label: "Umówiona przez centrum",
      tone: "neutral",
    });
  } else if (changed && actor === "system") {
    badges.push({
      id: "system",
      label: "Anulowana automatycznie: brak płatności",
      tone: "danger",
    });
  } else if (changed && (actor === "client" || actor === "centre")) {
    badges.push({
      id: actor,
      label: `${changed} przez ${actor === "client" ? "klienta" : "centrum"}`,
      tone: "neutral",
    });
  }
  if (admin && kind === "cancelled" && actor !== "system") {
    if (d.refundDueMinor !== null && d.refundDueMinor > 0) {
      badges.push({
        id: "refund-due",
        label: `Do zwrotu: ${money(d.refundDueMinor)}`,
        tone: "warning",
      });
    } else if (d.refundDueMinor === 0) {
      badges.push({ id: "no-refund", label: "Bez zwrotu", tone: "neutral" });
    }
  }
  if (admin && kind === "refunded" && d.refundMinor !== null) {
    badges.push({
      id: "refunded",
      label: `Zwrócono ${money(d.refundMinor)}`,
      tone: "success",
    });
  }
  if (d.mode === "online") {
    badges.push({ id: "online", label: "Wizyta online", tone: "info" });
  }
  if (d.startsAt && kind !== "refunded") {
    const ahead =
      new Date(d.startsAt).getTime() -
      new Date(notification.createdAt).getTime();
    if (ahead > 0 && ahead < SOON_MS) {
      badges.push({
        id: "soon",
        label: "Wizyta za mniej niż 48 h",
        tone: "warning",
      });
    }
  }

  // Opened: the rest.
  const details: NotificationDetail[] = [];
  if (d.startsAt) {
    details.push({
      label: "Termin",
      value: visitTime(d.startsAt, "dd.MM.yyyy, HH:mm"),
    });
  }
  if (d.fromStartsAt) {
    details.push({
      label: "Wcześniej",
      value: visitTime(d.fromStartsAt, "dd.MM.yyyy, HH:mm"),
    });
  }
  // The specialist, the place and the payment come from the booking as it
  // is now, when it is opened (the panel asks for it).
  if (d.serviceName) details.push({ label: "Usługa", value: d.serviceName });
  if (
    admin &&
    (NEW_KINDS.has(kind) || kind === "paid") &&
    d.priceMinor !== null
  ) {
    details.push({ label: "Cena", value: money(d.priceMinor) });
  }
  if (admin && kind === "cancelled" && actor !== "system") {
    if (d.refundDueMinor !== null && d.refundDueMinor > 0) {
      details.push({
        label: "Zwrot",
        value: `${money(d.refundDueMinor)} do zwrotu`,
        tone: "warning",
      });
    } else if (d.refundDueMinor === 0) {
      details.push({ label: "Zwrot", value: "Bez zwrotu" });
    }
  }
  if (admin && kind === "refunded" && d.refundMinor !== null) {
    details.push({ label: "Zwrócono", value: money(d.refundMinor) });
  }
  if (d.reason && d.reason !== "unpaid") {
    details.push({ label: "Powód", value: d.reason });
  }

  return {
    id: notification.id,
    title,
    reference: d.reference,
    summary: [
      d.clientName,
      d.startsAt ? visitTime(d.startsAt, "dd.MM, HH:mm") : null,
    ]
      .filter(Boolean)
      .join(" · "),
    badges: badges.slice(0, 3),
    details,
    tone,
    icon,
    visitId: notification.appointmentId,
    href: notification.appointmentId
      ? bookingHref({ id: notification.appointmentId, reference: d.reference })
      : null,
    linkText: d.reference,
    day,
    time: local(notification.createdAt, "HH:mm"),
    unread: notification.readAt === null,
  };
}

/** The notifications by the day they came, newest first as given. */
export function notificationDays(views: NotificationView[]) {
  const days: { day: string; items: NotificationView[] }[] = [];
  for (const view of views) {
    const last = days.at(-1);
    if (last?.day === view.day) last.items.push(view);
    else days.push({ day: view.day, items: [view] });
  }
  return days;
}
