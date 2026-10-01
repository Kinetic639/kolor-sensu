import {
  bookingDetailsSchema,
  type BookingDetails,
} from "@repo/contracts/booking";

// The details form as the server reads it: text fields, ticked checkboxes,
// and a hidden field only bots fill in.

export interface DetailsFormValues {
  name: string;
  email: string;
  phone: string;
  notes: string;
  acceptTerms: boolean;
  acceptPrivacy: boolean;
}

export type DetailsFormErrors = Partial<
  Record<keyof DetailsFormValues, string>
>;

export type DetailsFormResult =
  | { ok: true; details: BookingDetails }
  | { ok: false; bot: true }
  | { ok: false; errors: DetailsFormErrors; values: DetailsFormValues };

/** The hidden field's name; people never see it. */
export const HONEYPOT_FIELD = "website";

/** Which button saved the details: pay now (none), or reserve to pay later. */
export const INTENT_FIELD = "zamiar";
export const PAY_LATER = "pozniej";

export function readDetailsForm(form: FormData): DetailsFormResult {
  if (String(form.get(HONEYPOT_FIELD) ?? "").trim()) {
    return { ok: false, bot: true };
  }
  const values: DetailsFormValues = {
    name: String(form.get("name") ?? ""),
    email: String(form.get("email") ?? ""),
    phone: String(form.get("phone") ?? ""),
    notes: String(form.get("notes") ?? ""),
    acceptTerms: form.get("acceptTerms") === "on",
    acceptPrivacy: form.get("acceptPrivacy") === "on",
  };
  const parsed = bookingDetailsSchema.safeParse(values);
  if (parsed.success) return { ok: true, details: parsed.data };

  const errors: DetailsFormErrors = {};
  for (const issue of parsed.error.issues) {
    const field = issue.path[0] as keyof DetailsFormValues;
    errors[field] ??= issue.message;
  }
  return { ok: false, errors, values };
}
