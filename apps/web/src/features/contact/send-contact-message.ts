import { contactMessageInputSchema } from "@repo/contracts";
import { ContactRateLimitedError } from "@repo/supabase/contact";
import {
  centreNotice,
  clientCopy,
  type CentreContact,
  type ContactEmail,
} from "./contact-email";
import {
  TRAP_FIELD,
  type ContactField,
  type ContactResult,
  type ContactValues,
} from "./contact-shared";

export { TRAP_FIELD, type ContactResult } from "./contact-shared";

// What happens when a visitor sends the contact form (kept apart from Next
// so it can be tested): a filled hidden field means a bot (it is told
// "sent" and nothing is kept); Turnstile must pass; the fields are checked;
// the message is saved first (so it is never lost), the database refusing
// a fourth within the hour; then the centre is told and the visitor gets a
// copy. A failed e-mail is logged, the message stays saved and the visitor
// is told it was sent (the centre sees it in the database).

export interface ContactDeps {
  verify: (token: string) => Promise<boolean>;
  senderKey: string;
  save: (message: {
    name: string;
    email: string;
    phone: string;
    message: string;
    senderKey: string;
  }) => Promise<string>;
  markNotified: (id: string) => Promise<void>;
  send: (email: ContactEmail, idempotencyKey: string) => Promise<void>;
  centre: CentreContact;
}

export async function sendContactMessage(
  form: FormData,
  deps: ContactDeps,
): Promise<ContactResult> {
  const text = (name: string) => String(form.get(name) ?? "");
  const values: ContactValues = {
    name: text("name"),
    email: text("email"),
    phone: text("phone"),
    message: text("message"),
  };
  if (text(TRAP_FIELD).trim()) return { status: "sent" };

  const parsed = contactMessageInputSchema.safeParse({
    ...values,
    consent: form.get("consent") === "on",
  });
  if (!parsed.success) {
    const errors: Partial<Record<ContactField, string>> = {};
    for (const issue of parsed.error.issues) {
      const field = issue.path[0] as ContactField;
      errors[field] ??= issue.message;
    }
    return { status: "invalid", errors, values };
  }

  if (!(await deps.verify(text("cf-turnstile-response")))) {
    return { status: "unverified", values };
  }

  const { consent: _consent, ...message } = parsed.data;
  let id: string;
  try {
    id = await deps.save({ ...message, senderKey: deps.senderKey });
  } catch (error) {
    if (error instanceof ContactRateLimitedError) {
      return { status: "limited", values };
    }
    console.error("[contact] saving the message failed:", error);
    return { status: "failed", values };
  }

  if (deps.centre.email) {
    try {
      await deps.send(
        centreNotice(message, { ...deps.centre, email: deps.centre.email }),
        `contact-notice-${id}`,
      );
      await deps.markNotified(id);
    } catch (error) {
      console.error("[contact] telling the centre failed:", error);
    }
  } else {
    console.error("[contact] no centre e-mail in Ustawienia: message", id);
  }
  try {
    await deps.send(clientCopy(message, deps.centre), `contact-copy-${id}`);
  } catch (error) {
    console.error("[contact] the visitor's copy failed:", error);
  }
  return { status: "sent" };
}
