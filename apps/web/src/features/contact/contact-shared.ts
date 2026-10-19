// The contact form's fields and results, shared by the form (in the
// browser) and its Server Action, with nothing heavy behind them (the
// checks with zod stay on the server, send-contact-message.ts).

export const CONTACT_FIELDS = [
  "name",
  "email",
  "phone",
  "message",
  "consent",
] as const;

export type ContactField = (typeof CONTACT_FIELDS)[number];

export type ContactValues = Record<Exclude<ContactField, "consent">, string>;

export type ContactResult =
  | { status: "idle" }
  | { status: "sent" }
  | {
      status: "invalid";
      errors: Partial<Record<ContactField, string>>;
      values: ContactValues;
    }
  | { status: "unverified"; values: ContactValues }
  | { status: "limited"; values: ContactValues }
  | { status: "failed"; values: ContactValues };

/** The hidden field a person never fills in. */
export const TRAP_FIELD = "website";
