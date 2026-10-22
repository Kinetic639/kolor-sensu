import { stopNewsletterSubscription } from "@repo/supabase/newsletter";
import type { WebhookEventPayload } from "resend";
import { handleResendEvent } from "@/features/newsletter/webhook";
import { resend } from "@/lib/email";
import { createSecretClient } from "@/lib/supabase/secret";

// Resend's webhook (Resend → Webhooks, events contact.updated,
// contact.deleted, email.bounced, email.complained): the raw body, its
// signature checked with RESEND_WEBHOOK_SECRET; unsubscribes, bounces and
// complaints stop the address on the list (features/newsletter/webhook.ts).
// Handling an event twice changes nothing; a failure answers 500, so
// Resend retries.

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const secret = process.env.RESEND_WEBHOOK_SECRET;
  const id =
    request.headers.get("svix-id") ?? request.headers.get("webhook-id");
  const timestamp =
    request.headers.get("svix-timestamp") ??
    request.headers.get("webhook-timestamp");
  const signature =
    request.headers.get("svix-signature") ??
    request.headers.get("webhook-signature");
  if (!secret || !id || !timestamp || !signature) {
    return new Response("Missing signature", { status: 400 });
  }

  const payload = await request.text();
  let event: WebhookEventPayload;
  try {
    event = resend().webhooks.verify({
      payload,
      headers: { id, timestamp, signature },
      webhookSecret: secret,
    });
  } catch {
    return new Response("Invalid signature", { status: 400 });
  }

  const client = createSecretClient();
  try {
    await handleResendEvent(event, {
      stop: (email, reason) =>
        stopNewsletterSubscription(client, email, reason),
    });
  } catch (error) {
    console.error(`[resend] ${event.type} failed:`, error);
    return new Response("Handling failed", { status: 500 });
  }
  return new Response("OK", { status: 200 });
}
