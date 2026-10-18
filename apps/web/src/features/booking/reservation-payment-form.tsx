"use client";

import { ConsentCheckbox } from "@repo/ui/booking";
import { PrimaryButton } from "@repo/ui/public-site/actions";
import { useActionState } from "react";
import {
  payReservationAction,
  type ReservationPaymentState,
} from "./reservation-payment";

// Before paying a reservation from its link: the consents, when the centre
// booked it (the client gives them here), then on to Stripe. A plain form
// posted to the server.

export function ReservationPaymentForm({
  token,
  needsConsents,
  label,
}: {
  token: string;
  needsConsents: boolean;
  /** "Przejdź do płatności (200 zł)" */
  label: string;
}) {
  const [state, action, pending] = useActionState<
    ReservationPaymentState,
    FormData
  >(payReservationAction, { status: "idle" });
  const errors = state.status === "invalid" ? state.errors : {};

  return (
    <form action={action} className="grid gap-5" noValidate>
      <input name="token" type="hidden" value={token} />
      {needsConsents ? (
        <fieldset className="grid gap-3">
          <legend className="sr-only">Zgody</legend>
          <ConsentCheckbox
            error={errors.acceptTerms}
            linkHref="/regulamin"
            linkLabel="regulamin rezerwacji"
            name="acceptTerms"
            text="Akceptuję"
          />
          <ConsentCheckbox
            error={errors.acceptPrivacy}
            linkHref="/polityka-prywatnosci"
            linkLabel="polityką prywatności"
            name="acceptPrivacy"
            text="Zapoznałem(-am) się z"
          />
        </fieldset>
      ) : null}
      <PrimaryButton
        arrow
        className="justify-self-start"
        disabled={pending}
        type="submit"
      >
        {label}
      </PrimaryButton>
    </form>
  );
}
