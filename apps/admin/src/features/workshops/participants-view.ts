import type { WorkshopParticipant } from "@repo/supabase/workshops-admin";

// A workshop's participants in the portal (docs/product/workshops-plan.md,
// PR 6), apart from how they look: who is in (and how they paid), who
// waits, who left; each one's state in words; and the list as a CSV file.
// Pure, so it is tested without a database.

export type ParticipantGroup = "zapisani" | "lista" | "anulowani";

const STATE = {
  confirmed: { label: "Potwierdzony", tone: "success" },
  awaiting_payment: { label: "Czeka na wpłatę", tone: "warning" },
  held: { label: "W trakcie zapisu", tone: "neutral" },
  offered: { label: "Oferta z listy", tone: "info" },
  waitlisted: { label: "Lista rezerwowa", tone: "neutral" },
  cancelled: { label: "Anulowany", tone: "neutral" },
  expired: { label: "Wygasł", tone: "neutral" },
} as const;

export function participantState(participant: WorkshopParticipant) {
  return STATE[participant.status];
}

export function groupOf(participant: WorkshopParticipant): ParticipantGroup {
  if (participant.status === "waitlisted" || participant.status === "offered")
    return "lista";
  if (participant.status === "cancelled" || participant.status === "expired")
    return "anulowani";
  return "zapisani";
}

/** The participants in three groups, the waitlist in its order. */
export function participantGroups(
  participants: readonly WorkshopParticipant[],
) {
  const groups: Record<ParticipantGroup, WorkshopParticipant[]> = {
    zapisani: [],
    lista: [],
    anulowani: [],
  };
  for (const participant of participants)
    groups[groupOf(participant)].push(participant);
  groups.lista.sort((a, b) =>
    (a.waitlistedAt ?? a.createdAt).localeCompare(
      b.waitlistedAt ?? b.createdAt,
    ),
  );
  return groups;
}

/** How they paid: through the site, outside it, or not yet. */
export function paymentLabel(
  participant: WorkshopParticipant,
  money: (minor: number) => string,
) {
  if (participant.paidOutside) return "Poza stroną";
  if (participant.refundedMinor > 0)
    return `${money(participant.paidMinor)}, zwrot ${money(participant.refundedMinor)}`;
  if (participant.refundDueMinor > participant.refundedMinor)
    return `${money(participant.paidMinor)}, zwrot w toku`;
  if (participant.paidMinor > 0) return money(participant.paidMinor);
  return participant.priceMinor === 0 ? "Bezpłatnie" : "—";
}

/** What the admin may give back: paid through the site, not yet refunded. */
export function refundable(participant: WorkshopParticipant) {
  return participant.paidOutside
    ? 0
    : participant.paidMinor - participant.refundedMinor;
}

/**
 * "Usuń dane" on request (the database checks it too): not yet removed,
 * the seat over (the workshop ended, or the seat cancelled or lapsed), no
 * refund still owed.
 */
export function canForget(
  participant: WorkshopParticipant,
  { ended }: { ended: boolean },
) {
  if (participant.forgottenAt) return false;
  if (participant.refundDueMinor > participant.refundedMinor) return false;
  return ended || groupOf(participant) === "anulowani";
}

/**
 * "Wyślij link ponownie" (Warsztat · 6, card 8; the database checks it
 * too): someone with an e-mail, signed up, reserved or on the waitlist,
 * before the workshop ends.
 */
export function canResendLink(
  participant: WorkshopParticipant,
  { ended }: { ended: boolean },
) {
  return (
    !ended &&
    participant.email !== null &&
    ["confirmed", "awaiting_payment", "waitlisted", "offered"].includes(
      participant.status,
    )
  );
}

function csvCell(value: string) {
  return /[";\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

/** The list for a spreadsheet: one row each, semicolons (as Excel in Polish reads). */
export function participantsCsv(participants: readonly WorkshopParticipant[]) {
  const header = [
    "Numer",
    "Imię i nazwisko",
    "E-mail",
    "Telefon",
    "Stan",
    "Wpłata (zł)",
    "Obecność",
    "Uwagi",
  ];
  const rows = participants.map((one) => [
    one.reference,
    one.name ?? "",
    one.email ?? "",
    one.phone ?? "",
    participantState(one).label,
    one.paidOutside
      ? "poza stroną"
      : (one.paidMinor / 100).toFixed(2).replace(".", ","),
    one.attended === null ? "" : one.attended ? "tak" : "nie",
    one.notes ?? "",
  ]);
  return [header, ...rows]
    .map((row) => row.map(csvCell).join(";"))
    .join("\r\n");
}
