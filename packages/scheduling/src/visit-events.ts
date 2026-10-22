import { formatInTimeZone } from "date-fns-tz";
import type { VisitTone } from "./visits";

// A reservation's history (the audit log, `list_visit_events`) as the
// portals show it: what happened, when, who did it, and the facts that
// matter (the time, the money, the e-mail), in Polish. Pure, so every kind
// is tested; kinds added later (e.g. text messages) still show.

/** An entry as `listVisitEvents` (@repo/supabase) gives it. */
export interface VisitEventLike {
  id: number;
  occurredAt: string;
  kind: string;
  actor: "client" | "centre" | "payment" | "system";
  actorName: string | null;
  details: Record<string, unknown>;
}

export interface VisitEventRow {
  id: number;
  /** `30.09.2026, 07:05`, where the centre is. */
  when: string;
  title: string;
  detail: string | null;
  /** `Klient`, `Centrum · Michał Stępień`, `Płatność (Stripe)`, `System` */
  actor: string;
  tone: VisitTone;
  /** Restored from the visit's data when the log began. */
  restored: boolean;
}

const EMAILS: Record<string, string> = {
  confirmation: "Potwierdzenie rezerwacji",
  rescheduled: "Nowy termin",
  cancelled: "Odwołanie",
  reminder: "Przypomnienie o wizycie",
  reserved: "Rezerwacja z linkiem do płatności",
  payment_reminder: "Przypomnienie o płatności",
  payment_last_call: "Ostatnie przypomnienie o płatności",
  refunded: "Zwrot pieniędzy",
};

const ACTORS = {
  client: "Klient",
  centre: "Centrum",
  payment: "Płatność (Stripe)",
  system: "System",
} as const;

const KINDS: Record<string, { title: string; tone: VisitTone }> = {
  created: { title: "Zarezerwowano termin", tone: "neutral" },
  details_saved: { title: "Klient podał dane", tone: "neutral" },
  hold_released: { title: "Klient zwolnił termin", tone: "neutral" },
  hold_expired: { title: "Blokada terminu wygasła", tone: "neutral" },
  awaiting_payment: {
    title: "Czeka na potwierdzenie płatności",
    tone: "warning",
  },
  confirmed: { title: "Wizyta potwierdzona", tone: "success" },
  cancelled: { title: "Wizyta odwołana", tone: "danger" },
  rescheduled: { title: "Zmieniono termin", tone: "info" },
  payment_started: { title: "Rozpoczęto płatność", tone: "neutral" },
  payment_succeeded: { title: "Płatność przyjęta", tone: "success" },
  payment_failed: { title: "Płatność nieudana", tone: "danger" },
  payment_expired: { title: "Sesja płatności wygasła", tone: "neutral" },
  refund_recorded: { title: "Zwrot zlecony w Stripe", tone: "info" },
  email_sent: { title: "Wysłano e-mail", tone: "neutral" },
  reserved: { title: "Zarezerwowano, płatność później", tone: "info" },
  refund_issued: { title: "Zwrot zlecony przez centrum", tone: "info" },
  reservation_confirmed: {
    title: "Klient potwierdził rezerwację",
    tone: "info",
  },
  payment_disputed: {
    title: "Bank klienta otworzył spór o płatność",
    tone: "danger",
  },
  dispute_closed: { title: "Spór zakończony", tone: "neutral" },
};

// A reservation is held this long until it is confirmed from its e-mail.
const CONFIRM_WINDOW_MS = 31 * 60 * 1000;

export function visitEventRows(
  events: VisitEventLike[],
  { timeZone, currencyCode }: { timeZone: string; currencyCode: string },
): VisitEventRow[] {
  const at = (instant: unknown, pattern: string) =>
    typeof instant === "string"
      ? formatInTimeZone(new Date(instant), timeZone, pattern, {
          locale: undefined,
        })
      : null;
  const day = (instant: unknown) => {
    const value = at(instant, "yyyy-MM-dd'T'HH:mm");
    if (!value) return null;
    const weekday = new Intl.DateTimeFormat("pl-PL", {
      weekday: "short",
      timeZone,
    }).format(new Date(instant as string));
    const [date, time] = value.split("T") as [string, string];
    return `${weekday} ${date.split("-").reverse().join(".")}, ${time}`;
  };
  const money = (minor: unknown) =>
    typeof minor === "number"
      ? new Intl.NumberFormat("pl-PL", {
          style: "currency",
          currency: currencyCode,
          maximumFractionDigits: minor % 100 === 0 ? 0 : 2,
        }).format(minor / 100)
      : null;

  return events.map((event) => {
    const known = KINDS[event.kind];
    const d = event.details;
    let title = known?.title ?? event.kind;
    let detail: string | null = null;
    switch (event.kind) {
      case "created": {
        const start = day(d.starts_at);
        const end = at(d.ends_at, "HH:mm");
        detail = start ? `${start}${end ? `–${end}` : ""}` : null;
        // Booked in a portal: reserved, paid online from the e-mailed link.
        if (event.actor === "centre") {
          title = "Centrum zarezerwowało wizytę";
          const due = day(d.payment_due_at);
          detail =
            detail && due ? `${detail} · płatność online do ${due}` : detail;
        }
        break;
      }
      case "reserved": {
        const due = day(d.payment_due_at);
        // Since 22.10 held only until confirmed from the e-mail (30 min).
        const toConfirm =
          typeof d.payment_due_at === "string" &&
          Date.parse(d.payment_due_at) - Date.parse(event.occurredAt) <=
            CONFIRM_WINDOW_MS;
        detail = due
          ? toConfirm
            ? `Do potwierdzenia z e-maila do ${due}`
            : `Opłata do ${due}`
          : null;
        break;
      }
      case "reservation_confirmed": {
        const due = day(d.payment_due_at);
        detail = due ? `Opłata do ${due}` : null;
        break;
      }
      case "payment_disputed":
      case "dispute_closed":
        detail = money(d.amount_minor)
          ? `Kwota: ${money(d.amount_minor)}`
          : null;
        if (event.kind === "dispute_closed" && d.status === "won") {
          title = "Spór wygrany: płatność zostaje";
        } else if (event.kind === "dispute_closed" && d.status === "lost") {
          title = "Spór przegrany: pieniądze wróciły do klienta";
        }
        break;
      case "rescheduled": {
        const from = day(d.from_starts_at);
        const to = day(d.to_starts_at);
        detail = from && to ? `z ${from} na ${to}` : null;
        break;
      }
      case "refund_issued":
        detail = money(d.refund_minor);
        break;
      case "cancelled":
        if (event.actor === "system") {
          title = "Anulowano – brak płatności";
          break;
        }
        detail =
          typeof d.refund_due_minor === "number"
            ? d.refund_due_minor > 0
              ? `Do zwrotu: ${money(d.refund_due_minor)}`
              : "Bez zwrotu"
            : null;
        break;
      case "payment_started":
      case "payment_succeeded":
        detail = money(d.amount_minor);
        break;
      case "refund_recorded":
        detail = d.refunded_minor
          ? `Zwrócono łącznie: ${money(d.refunded_minor)}`
          : null;
        break;
      case "email_sent":
        title = `Wysłano e-mail: ${EMAILS[String(d.email)] ?? String(d.email)}`;
        break;
    }
    // The centre's reason (R12), after what happened.
    if (
      typeof d.reason === "string" &&
      d.reason !== "unpaid" &&
      ["cancelled", "rescheduled", "refund_issued"].includes(event.kind)
    ) {
      detail = detail ? `${detail} · ${d.reason}` : d.reason;
    }
    return {
      id: event.id,
      when: at(event.occurredAt, "dd.MM.yyyy, HH:mm") ?? "",
      title,
      detail,
      actor: event.actorName
        ? `${ACTORS[event.actor]} · ${event.actorName}`
        : ACTORS[event.actor],
      tone:
        event.kind === "created" && event.actor === "centre"
          ? "info"
          : event.kind === "dispute_closed"
            ? d.status === "won"
              ? "success"
              : d.status === "lost"
                ? "danger"
                : "neutral"
            : (known?.tone ?? "neutral"),
      restored: d.restored === true,
    };
  });
}
