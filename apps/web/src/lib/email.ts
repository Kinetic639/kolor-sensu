import { Resend } from "resend";

// Sending e-mail through Resend (server only). EMAIL_FROM is the sender:
// `onboarding@resend.dev` until kolorsensu.pl is verified in Resend, which
// then only delivers to the Resend account's own address.

let client: Resend | null = null;

function resend() {
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error("RESEND_API_KEY is not configured");
  client ??= new Resend(key);
  return client;
}

/** `Kolor Sensu <rezerwacje@kolorsensu.pl>`, from EMAIL_FROM. */
export function emailSender() {
  const from = process.env.EMAIL_FROM?.trim();
  if (!from) throw new Error("EMAIL_FROM is not configured");
  return from.includes("<") ? from : `Kolor Sensu <${from}>`;
}

export interface EmailMessage {
  from: string;
  to: string;
  subject: string;
  html: string;
  text: string;
  attachments?: { filename: string; contentType: string; content: string }[];
}

/** Sends one e-mail; the key makes a retried send a no-op. Throws on failure. */
export async function sendEmail(message: EmailMessage, idempotencyKey: string) {
  const { data, error } = await resend().emails.send(message, {
    idempotencyKey,
  });
  if (error || !data) {
    throw new Error(
      `Resend: ${error?.name ?? "no data"}: ${error?.message ?? ""}`,
    );
  }
  return { id: data.id };
}
