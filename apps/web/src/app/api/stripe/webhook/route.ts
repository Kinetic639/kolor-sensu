import { claimStripeEvent, releaseStripeEvent } from "@repo/supabase";
import { eventFitsKey, handleStripeEvent } from "@/features/booking/payment";
import { paymentDeps } from "@/features/booking/payment-server";
import { webhookWorkshopDeps } from "@/features/workshops/payment-server";
import { stripeServer } from "@/lib/stripe";
import { createSecretClient } from "@/lib/supabase/secret";

// Stripe's webhook (docs/product/booking-plan.md, R6): the raw body, its
// signature checked with STRIPE_WEBHOOK_SECRET, each event handled once.
// An event of the other mode (a test one on live keys, or the reverse) is
// answered and ignored.
// A workshop seat's sessions are settled as workshops' (features/workshops).
// A failure gives the event back and answers 500, so Stripe retries.

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const signature = request.headers.get("stripe-signature");
  if (!secret || !signature) {
    return new Response("Missing signature", { status: 400 });
  }

  const body = await request.text();
  let event;
  try {
    event = stripeServer().webhooks.constructEvent(body, signature, secret);
  } catch {
    return new Response("Invalid signature", { status: 400 });
  }

  if (!eventFitsKey(event.livemode, process.env.STRIPE_SECRET_KEY)) {
    console.warn(`[stripe] ${event.type} ${event.id}: another mode, ignored`);
    return new Response("Ignored: another mode", { status: 200 });
  }

  const db = createSecretClient();
  if (!(await claimStripeEvent(db, event.id, event.type))) {
    return new Response("Already handled", { status: 200 });
  }
  try {
    await handleStripeEvent(event, {
      ...paymentDeps(),
      workshop: webhookWorkshopDeps(),
    });
  } catch (error) {
    console.error(`[stripe] ${event.type} ${event.id} failed:`, error);
    await releaseStripeEvent(db, event.id).catch(() => undefined);
    return new Response("Handling failed", { status: 500 });
  }
  return new Response("OK", { status: 200 });
}
