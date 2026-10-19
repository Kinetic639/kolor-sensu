"use server";

import {
  markContactMessageNotified,
  submitContactMessage,
} from "@repo/supabase/contact";
import { headers } from "next/headers";
import {
  clientIp,
  turnstileKeys,
  verifyTurnstile,
  visitorKey,
} from "@/features/booking/guards";
import { emailSender, sendEmail } from "@/lib/email";
import { getSiteFrame } from "@/lib/site-frame";
import { createSecretClient } from "@/lib/supabase/secret";
import { sendContactMessage, type ContactResult } from "./send-contact-message";

// The contact form's Server Action (useActionState): the visitor's message,
// with the database, Turnstile and Resend behind it (send-contact-message.ts).

export async function sendContactMessageAction(
  _previous: ContactResult,
  form: FormData,
): Promise<ContactResult> {
  const ip = clientIp(await headers());
  const client = createSecretClient();
  const { contact } = await getSiteFrame();
  const from = emailSender();
  return sendContactMessage(form, {
    verify: (token) => verifyTurnstile(token, ip, turnstileKeys().secretKey),
    senderKey: visitorKey(ip, process.env.SUPABASE_SECRET_KEY ?? ""),
    save: (message) => submitContactMessage(client, message),
    markNotified: (id) => markContactMessageNotified(client, id),
    send: async (email, idempotencyKey) => {
      await sendEmail({ ...email, from }, idempotencyKey);
    },
    centre: { email: contact?.email, phoneLabel: contact?.phoneLabel },
  });
}
