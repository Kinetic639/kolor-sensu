import {
  bookingDetailsSchema,
  type BookingDetails,
} from "@repo/contracts/booking";

// The details form as the server reads it: text fields, ticked checkboxes,
// and a hidden field only bots fill in. "Chcę dostawać newsletter" is apart
// from the booking's consents: the visit never depends on it.

export interface DetailsFormValues {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  notes: string;
  acceptTerms: boolean;
  acceptPrivacy: boolean;
  /** Asked for a visit within 14 days of booking (Klient · 3, card 15). */
  acceptEarlyStart?: boolean;
  /** Asked for a service for minors (card 16). */
  confirmGuardian?: boolean;
  /** Also sign up for the newsletter (shown only while it is on). */
  newsletter?: boolean;
}

export type DetailsFormErrors = Partial<
  Record<keyof DetailsFormValues, string>
>;

export type DetailsFormResult =
  | { ok: true; details: BookingDetails; newsletter: boolean }
  | { ok: false; bot: true }
  | { ok: false; errors: DetailsFormErrors; values: DetailsFormValues };

/** The hidden field's name; people never see it. */
export const HONEYPOT_FIELD = "website";

/** Which button saved the details: pay now (none), or reserve to pay later. */
export const INTENT_FIELD = "zamiar";
export const PAY_LATER = "pozniej";

/** The reference of the visit the page showed (card 7: two tabs). */
export const VISIT_FIELD = "rezerwacja";

/** What the held visit asks of the client, besides the two consents. */
export interface DetailsNeeds {
  earlyStart: boolean;
  guardian: boolean;
}

export const EARLY_START_REQUIRED =
  "Zaznacz, że chcesz wizyty przed upływem 14 dni od rezerwacji, albo wybierz późniejszy termin.";
export const GUARDIAN_REQUIRED =
  "Tę usługę rezerwuje rodzic lub opiekun prawny: potwierdź to, aby zarezerwować wizytę.";

export function readDetailsForm(
  form: FormData,
  needs: DetailsNeeds = { earlyStart: false, guardian: false },
): DetailsFormResult {
  if (String(form.get(HONEYPOT_FIELD) ?? "").trim()) {
    return { ok: false, bot: true };
  }
  const values: DetailsFormValues = {
    firstName: String(form.get("firstName") ?? ""),
    lastName: String(form.get("lastName") ?? ""),
    email: String(form.get("email") ?? ""),
    phone: String(form.get("phone") ?? ""),
    notes: String(form.get("notes") ?? ""),
    acceptTerms: form.get("acceptTerms") === "on",
    acceptPrivacy: form.get("acceptPrivacy") === "on",
    acceptEarlyStart: needs.earlyStart && form.get("acceptEarlyStart") === "on",
    confirmGuardian: needs.guardian && form.get("confirmGuardian") === "on",
    newsletter: form.get("newsletter") === "on",
  };
  const { newsletter, ...booking } = values;
  const parsed = bookingDetailsSchema.safeParse(booking);

  const errors: DetailsFormErrors = {};
  for (const issue of parsed.success ? [] : parsed.error.issues) {
    const field = issue.path[0] as keyof DetailsFormValues;
    errors[field] ??= issue.message;
  }
  if (needs.earlyStart && !values.acceptEarlyStart) {
    errors.acceptEarlyStart = EARLY_START_REQUIRED;
  }
  if (needs.guardian && !values.confirmGuardian) {
    errors.confirmGuardian = GUARDIAN_REQUIRED;
  }
  if (parsed.success && Object.keys(errors).length === 0) {
    return { ok: true, details: parsed.data, newsletter: newsletter === true };
  }
  return { ok: false, errors, values };
}
