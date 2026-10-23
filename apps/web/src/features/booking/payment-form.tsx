"use client";

import {
  CheckoutElementsProvider,
  PaymentElement,
  useCheckoutElements,
} from "@stripe/react-stripe-js/checkout";
import { loadStripe } from "@stripe/stripe-js";
import { PrimaryButton } from "@repo/ui/public-site/actions";
import { useState, type FormEvent } from "react";

// Step 6: Stripe's Payment Element inside our own step (card, BLIK,
// Przelewy24, wallets, as set in the Stripe Dashboard). Stripe.js comes
// from js.stripe.com and only on this page. The amount comes from the
// session the server created, never from here.

const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? "",
  { locale: "pl" },
);

// The public site's look (packages/design-system public-theme.css), as far
// as Stripe's Appearance API goes: it takes values, not CSS variables.
const appearance = {
  theme: "stripe" as const,
  variables: {
    colorPrimary: "#527b57",
    colorText: "#16302f",
    colorBackground: "#fdfdfb",
    colorDanger: "#9c5754",
    fontFamily: "system-ui, sans-serif",
    borderRadius: "12px",
  },
};

function PayButton({ label }: { label: string }) {
  const checkout = useCheckoutElements();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function pay(event: FormEvent) {
    event.preventDefault();
    if (checkout.type !== "success") return;
    setPending(true);
    setError(null);
    // On success Stripe goes to the return page; we only see errors.
    const result = await checkout.checkout.confirm();
    if (result.type === "error") setError(result.error.message);
    setPending(false);
  }

  if (checkout.type === "error") {
    return (
      <p className="text-small text-pink-strong" role="alert">
        Nie udało się wczytać płatności. Odśwież stronę albo zadzwoń do nas.
      </p>
    );
  }

  return (
    <form className="grid gap-5" onSubmit={pay}>
      <PaymentElement options={{ layout: "accordion" }} />
      {error ? (
        <p className="text-small text-pink-strong" role="alert">
          {error}
        </p>
      ) : null}
      <PrimaryButton
        arrow
        className="justify-self-start"
        disabled={pending || checkout.type !== "success"}
        type="submit"
      >
        {pending ? "Przetwarzanie…" : label}
      </PrimaryButton>
    </form>
  );
}

export function PaymentForm({
  clientSecret,
  payLabel,
}: {
  clientSecret: string;
  /** "Zapłać 200 zł" */
  payLabel: string;
}) {
  return (
    <CheckoutElementsProvider
      options={{ clientSecret, elementsOptions: { appearance } }}
      stripe={stripePromise}
    >
      <PayButton label={payLabel} />
    </CheckoutElementsProvider>
  );
}
