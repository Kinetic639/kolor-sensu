"use client";

import { formatMinor } from "@repo/contracts/discount-codes";
import { BookingField } from "@repo/ui/booking/fields";
import { PrimaryButton, SecondaryButton } from "@repo/ui/public-site/actions";
import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import type { DetailsFormState } from "@/features/booking/actions";
import {
  INTENT_FIELD,
  PAY_LATER,
  type DetailsFormValues,
} from "@/features/booking/details-form-data";
import { TurnstileWidget } from "@/features/booking/turnstile-widget";
import {
  applySeatCodeAction,
  holdSeatAction,
  joinWaitlistAction,
  removeSeatCodeAction,
  saveSeatDetailsAction,
  type SeatCodeState,
} from "./actions";
import { ParticipantFields } from "./participant-fields";

// The workshop sign-up's forms (docs/product/workshops-plan.md, PR 4):
// "Zapisz się" after the bot check, the participant's details with pay now
// or later, the discount code, and the waitlist. Plain forms posted to the
// server (they work before JavaScript loads, the bot check aside).

type Check = "checking" | "verified" | "failed";

const CHECK_STATUS: Record<Check, string> = {
  checking: "Sprawdzamy, czy zapisuje się człowiek. To potrwa chwilę.",
  verified: "Gotowe. Możesz się zapisać.",
  failed:
    "Nie udało się potwierdzić, że zapisuje się człowiek. Odśwież stronę albo zadzwoń do nas.",
};

function HoldButton({ ready, label }: { ready: boolean; label: string }) {
  const { pending } = useFormStatus();
  return (
    <PrimaryButton
      aria-describedby="signup-status"
      arrow
      disabled={!ready || pending}
      type="submit"
    >
      {label}
    </PrimaryButton>
  );
}

/** "Zapisz się": holds a seat for a while, once the bot check passes. */
export function SignupForm({
  slug,
  turnstileSiteKey,
  label,
}: {
  slug: string;
  turnstileSiteKey: string;
  label: string;
}) {
  const [check, setCheck] = useState<Check>("checking");
  return (
    <form action={holdSeatAction} className="grid gap-3">
      <input name="slug" type="hidden" value={slug} />
      <TurnstileWidget
        onError={() => setCheck("failed")}
        onExpire={() => setCheck("checking")}
        onVerify={() => setCheck("verified")}
        siteKey={turnstileSiteKey}
      />
      <p
        aria-live="polite"
        className="text-small text-text-muted"
        id="signup-status"
        role={check === "failed" ? "alert" : undefined}
      >
        {CHECK_STATUS[check]}
      </p>
      <div>
        <HoldButton label={label} ready={check === "verified"} />
      </div>
    </form>
  );
}

function FormMessage({ state }: { state: DetailsFormState }) {
  if (state.status === "saved")
    return (
      <p
        className="rounded-card-sm bg-primary-soft text-small text-ink p-4"
        role="status"
      >
        Twoje dane są zapisane. Możesz je poprawić albo przejść dalej.
      </p>
    );
  if (state.status === "invalid" && state.message)
    return (
      <p
        className="rounded-card-sm bg-pink-soft text-small text-ink p-4"
        role="alert"
      >
        {state.message}
      </p>
    );
  return null;
}

/** The details step: pay now, pay later (when far enough ahead), or confirm a free seat. */
export function SeatDetailsForm({
  slug,
  saved,
  payLater,
  free,
  newsletterController = null,
}: {
  slug: string;
  saved: DetailsFormValues | null;
  /** Who handles the newsletter's data; none: the newsletter is off. */
  newsletterController?: string | null;
  /** "5 listopada 2030, godz. 17:00", or null: pay now only. */
  payLater: string | null;
  free: boolean;
}) {
  const [state, action, pending] = useActionState<DetailsFormState, FormData>(
    saveSeatDetailsAction,
    saved ? { status: "saved" } : { status: "idle" },
  );
  const values =
    state.status === "invalid" ? state.values : (saved ?? undefined);
  const errors = state.status === "invalid" ? state.errors : {};

  return (
    <form action={action} className="grid gap-5" noValidate>
      <input name="slug" type="hidden" value={slug} />
      <FormMessage state={state} />
      <ParticipantFields
        errors={errors}
        newsletterController={newsletterController}
        values={values}
      />
      <div className="grid gap-3">
        <div className="flex flex-wrap gap-3">
          <PrimaryButton arrow disabled={pending} type="submit">
            {free ? "Potwierdź zapis" : "Zapłać teraz"}
          </PrimaryButton>
          {payLater && !free ? (
            <SecondaryButton
              disabled={pending}
              name={INTENT_FIELD}
              type="submit"
              value={PAY_LATER}
            >
              Zarezerwuj, zapłacę później
            </SecondaryButton>
          ) : null}
        </div>
        <p className="text-small text-text-muted">
          {free
            ? "Udział jest bezpłatny: potwierdzimy zapis bez płatności."
            : payLater
              ? `Płacisz online. Jeśli wybierzesz płatność później, wyślemy Ci link e-mailem; opłać miejsce do ${payLater}, inaczej się zwolni.`
              : "Do warsztatu zostało mniej niż tydzień, więc płatność jest potrzebna od razu."}
        </p>
      </div>
    </form>
  );
}

/** "Masz kod rabatowy?": applied at once, beside the details form. */
export function SeatCodeForm({
  slug,
  applied,
}: {
  slug: string;
  applied: { code: string; discountMinor: number } | null;
}) {
  const [state, action, pending] = useActionState<SeatCodeState, FormData>(
    applySeatCodeAction,
    { status: "idle" },
  );

  if (applied) {
    return (
      <form
        action={removeSeatCodeAction}
        className="rounded-card-sm bg-primary-soft flex flex-wrap items-center justify-between gap-3 p-4"
      >
        <input name="slug" type="hidden" value={slug} />
        <p className="text-small text-ink" role="status">
          Kod <strong>{applied.code}</strong>: rabat{" "}
          {formatMinor(applied.discountMinor)}.
        </p>
        <SecondaryButton size="sm" type="submit">
          Usuń kod
        </SecondaryButton>
      </form>
    );
  }

  return (
    <form action={action} className="grid gap-3" noValidate>
      <input name="slug" type="hidden" value={slug} />
      <div className="grid items-end gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
        <BookingField
          autoCapitalize="characters"
          autoComplete="off"
          defaultValue={state.status === "refused" ? state.code : undefined}
          error={state.status === "refused" ? state.message : undefined}
          label="Kod rabatowy (opcjonalnie)"
          maxLength={32}
          name="kod"
        />
        <SecondaryButton disabled={pending} type="submit">
          Zastosuj
        </SecondaryButton>
      </div>
    </form>
  );
}

/** A full workshop's waitlist: the details, then an e-mail with the place. */
export function WaitlistForm({ slug }: { slug: string }) {
  const [state, action, pending] = useActionState<DetailsFormState, FormData>(
    joinWaitlistAction,
    { status: "idle" },
  );
  const values = state.status === "invalid" ? state.values : undefined;
  const errors = state.status === "invalid" ? state.errors : {};
  return (
    <form action={action} className="grid gap-5" noValidate>
      <input name="slug" type="hidden" value={slug} />
      <FormMessage state={state} />
      <ParticipantFields errors={errors} values={values} />
      <div>
        <PrimaryButton arrow disabled={pending} type="submit">
          Zapisz się na listę rezerwową
        </PrimaryButton>
      </div>
      <p className="text-small text-text-muted">
        Gdy zwolni się miejsce, napiszemy do Ciebie. Będziesz mieć 24 godziny na
        zapłatę; potem miejsce dostanie kolejna osoba z listy.
      </p>
    </form>
  );
}
