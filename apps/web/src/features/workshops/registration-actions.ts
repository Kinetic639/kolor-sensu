"use server";

import {
  acceptWorkshopTransfer,
  cancelWorkshopRegistration,
  transferWorkshopSeat,
  WorkshopError,
  workshopRegistrationId,
} from "@repo/supabase/workshops";
import type { Route } from "next";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { createSecretClient } from "@/lib/supabase/secret";
import { sendWorkshopEmail, sendWorkshopTransferInvite } from "./email/send";
import { refundRegistration } from "./refunds";

// On a registration's own page (its e-mailed link; docs/product/
// workshops-plan.md, PR 5): giving the seat (or the waitlist place) up,
// refunded by the rules (in full until seven days before or after a new
// date or leader; later once the waitlist takes the seat), and passing it
// on to someone else, who takes it by accepting the rules from their own
// link. The rules are the database's; the money goes back here.

const TOKEN = /^[A-Za-z0-9_-]{20,100}$/;

function tokenOf(formData: FormData) {
  const token = String(formData.get("token") ?? "");
  if (!TOKEN.test(token)) redirect("/warsztaty" as Route);
  return token;
}

const page = (token: string, query: string) =>
  `/warsztaty/zapis/${token}?${query}` as Route;

/** "Rezygnuję": the seat goes, the money back by the rules, an e-mail. */
export async function cancelMySeatAction(formData: FormData) {
  const token = tokenOf(formData);
  const db = createSecretClient();
  let cancelled;
  try {
    cancelled = await cancelWorkshopRegistration(db, token);
  } catch (error) {
    if (error instanceof WorkshopError)
      redirect(
        page(
          token,
          `zmiana=${error.code === "too_late" ? "za-pozno" : "niedostepna"}`,
        ),
      );
    throw error;
  }
  let refundFailed = false;
  if (cancelled.refundMinor > 0) {
    try {
      const id = await workshopRegistrationId(db, cancelled.reference);
      if (id)
        await refundRegistration(
          db,
          { id, reference: cancelled.reference },
          cancelled.refundMinor,
          "cancelled",
        );
    } catch (error) {
      // Stays owed: the scheduled job gives it back.
      console.error(`[workshops] refund ${cancelled.reference} failed:`, error);
      refundFailed = true;
    }
  }
  after(() => sendWorkshopEmail(cancelled.reference, "cancelled"));
  redirect(
    page(token, refundFailed ? "zmiana=zwrot-pozniej" : "zmiana=anulowany"),
  );
}

export type TransferState =
  { status: "idle" } | { status: "invalid"; message: string };

const TRANSFER_PROBLEMS: Record<string, string> = {
  already_registered: "Ta osoba jest już zapisana na ten warsztat.",
  invalid_details: "Sprawdź imię, e-mail i telefon.",
  not_transferable: "Tego miejsca nie można już przekazać.",
  too_late: "Warsztat już się zaczął.",
};

/** "Przekaż miejsce": the seat offered to someone else, by e-mail. */
export async function transferMySeatAction(
  _previous: TransferState,
  formData: FormData,
): Promise<TransferState> {
  const token = tokenOf(formData);
  const person = {
    firstName: String(formData.get("firstName") ?? "").trim(),
    lastName: String(formData.get("lastName") ?? "").trim(),
    email: String(formData.get("email") ?? "").trim(),
    phone: String(formData.get("phone") ?? "").trim(),
  };
  if (
    !person.firstName ||
    !person.lastName ||
    !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(person.email)
  )
    return { status: "invalid", message: TRANSFER_PROBLEMS.invalid_details! };
  let invite: string;
  try {
    invite = await transferWorkshopSeat(createSecretClient(), token, person);
  } catch (error) {
    if (error instanceof WorkshopError)
      return {
        status: "invalid",
        message:
          TRANSFER_PROBLEMS[error.code] ??
          "Nie udało się przekazać miejsca. Spróbuj ponownie.",
      };
    throw error;
  }
  after(() => sendWorkshopTransferInvite(invite));
  redirect(page(token, "zmiana=przekazany"));
}

export type AcceptState =
  { status: "idle" } | { status: "invalid"; message: string };

const ACCEPT_PROBLEMS: Record<string, string> = {
  consent_required:
    "Zaznacz akceptację regulaminu i zasad przetwarzania danych.",
  already_registered: "Ten adres e-mail jest już zapisany na ten warsztat.",
  not_transferable: "Tego miejsca nie można już przejąć.",
  not_found: "To zaproszenie jest już nieaktualne.",
  too_late: "Warsztat już się zaczął.",
};

/**
 * "Przyjmuję miejsce": the new person accepts the rules; the seat is
 * theirs, its page by the same link, its e-mail to them.
 */
export async function acceptSeatAction(
  _previous: AcceptState,
  formData: FormData,
): Promise<AcceptState> {
  const token = tokenOf(formData);
  let accepted;
  try {
    accepted = await acceptWorkshopTransfer(createSecretClient(), token, {
      terms: formData.get("terms") === "on",
      privacy: formData.get("privacy") === "on",
    });
  } catch (error) {
    if (error instanceof WorkshopError)
      return {
        status: "invalid",
        message:
          ACCEPT_PROBLEMS[error.code] ??
          "Nie udało się przyjąć miejsca. Spróbuj ponownie.",
      };
    throw error;
  }
  const kind = accepted.status === "confirmed" ? "confirmation" : "reserved";
  after(() => sendWorkshopEmail(accepted.reference, kind));
  redirect(page(token, "zmiana=przyjete"));
}
