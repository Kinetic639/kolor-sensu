import Stripe from "stripe";

// The Stripe client for the server (payments, the webhook). The secret key
// never has the NEXT_PUBLIC_ prefix, so it cannot reach the browser. Pinned
// to the account's API version (docs/product/booking-plan.md, R6).

let client: Stripe | null = null;

export function stripeServer() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY is not configured");
  client ??= new Stripe(key, { apiVersion: "2026-08-26.dahlia" });
  return client;
}
