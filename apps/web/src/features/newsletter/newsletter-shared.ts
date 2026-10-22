// The newsletter form's results, shared by the form (in the browser) and
// its Server Action, with nothing heavy behind them (the checks with zod
// stay on the server, subscribe.ts).

export type NewsletterField = "email" | "consent";

export type NewsletterResult =
  | { status: "idle" }
  /** Whatever the address was (new, waiting, subscribed): one answer. */
  | { status: "sent" }
  | {
      status: "invalid";
      errors: Partial<Record<NewsletterField, string>>;
      email: string;
    }
  | { status: "unverified"; email: string }
  | { status: "limited"; email: string }
  | { status: "failed"; email: string };

/** The hidden field a person never fills in. */
export const NEWSLETTER_TRAP_FIELD = "website";

export type NewsletterConfirmResult =
  | { status: "idle" }
  | { status: "confirmed" }
  | { status: "already" }
  | { status: "unknown" }
  | { status: "failed" };
