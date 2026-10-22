"use client";

import {
  NEWSLETTER_CONSENT_LINK_LABEL,
  newsletterConsentLead,
} from "@repo/contracts/newsletter";
import { BookingField, ConsentCheckbox } from "@repo/ui/booking/fields";
import { PrimaryButton, SecondaryButton } from "@repo/ui/public-site/actions";
import { useActionState } from "react";
import { saveDetailsAction, type DetailsFormState } from "./actions";
import {
  HONEYPOT_FIELD,
  INTENT_FIELD,
  PAY_LATER,
  type DetailsFormValues,
} from "./details-form-data";

// Step 5: the client's details and consents. A plain form posted to the
// server (it works before JavaScript loads); errors come back per field.
// Then "Zapłać teraz", or, when the visit is far enough ahead, "Zarezerwuj,
// zapłacę później" (R11): paid from the e-mailed link by `payLater`. While
// the newsletter is on, a separate, unticked "send me the newsletter" (its
// own consent; a link to confirm it follows by e-mail).

export function DetailsForm({
  saved,
  payLater,
  free = false,
  newsletterController = null,
}: {
  saved: DetailsFormValues | null;
  /** A discount code covers the whole price: nothing to pay. */
  free?: boolean;
  /** "8 października 2030, godz. 11:00", or null: pay now only. */
  payLater: string | null;
  /** Who handles the newsletter's data; none: the newsletter is off. */
  newsletterController?: string | null;
}) {
  const [state, action, pending] = useActionState<DetailsFormState, FormData>(
    saveDetailsAction,
    saved ? { status: "saved" } : { status: "idle" },
  );
  const values =
    state.status === "invalid" ? state.values : (saved ?? undefined);
  const errors = state.status === "invalid" ? state.errors : {};

  return (
    <form action={action} className="grid gap-5" noValidate>
      {state.status === "saved" ? (
        <p
          className="rounded-card-sm bg-primary-soft text-small text-ink p-4"
          role="status"
        >
          Twoje dane są zapisane. Możesz je poprawić albo przejść dalej.
        </p>
      ) : null}
      {state.status === "invalid" && state.message ? (
        <p
          className="rounded-card-sm bg-pink-soft text-small text-ink p-4"
          role="alert"
        >
          {state.message}
        </p>
      ) : null}

      <div className="grid gap-5 sm:grid-cols-2">
        <BookingField
          autoComplete="name"
          defaultValue={values?.name}
          error={errors.name}
          label="Imię i nazwisko"
          name="name"
          required
        />
        <BookingField
          autoComplete="tel"
          defaultValue={values?.phone}
          error={errors.phone}
          inputMode="tel"
          label="Telefon"
          name="phone"
          required
          type="tel"
        />
      </div>
      <BookingField
        autoComplete="email"
        defaultValue={values?.email}
        error={errors.email}
        hint="Wyślemy na niego potwierdzenie i link do zarządzania wizytą."
        label="E-mail"
        name="email"
        required
        type="email"
      />
      <BookingField
        defaultValue={values?.notes}
        error={errors.notes}
        hint="Nie podawaj tu informacji o zdrowiu; porozmawiacie o nich na spotkaniu."
        label="Uwagi (opcjonalnie)"
        maxLength={1000}
        multiline
        name="notes"
      />

      {/* Only bots fill this in: hidden from people and screen readers. */}
      <div aria-hidden="true" className="absolute -left-[9999px]">
        <label>
          Strona internetowa
          <input autoComplete="off" name={HONEYPOT_FIELD} tabIndex={-1} />
        </label>
      </div>

      <fieldset className="grid gap-3">
        <legend className="sr-only">Zgody</legend>
        <ConsentCheckbox
          defaultChecked={values?.acceptTerms}
          error={errors.acceptTerms}
          linkHref="/regulamin"
          linkLabel="regulamin rezerwacji"
          name="acceptTerms"
          text="Akceptuję"
        />
        <ConsentCheckbox
          defaultChecked={values?.acceptPrivacy}
          error={errors.acceptPrivacy}
          linkHref="/polityka-prywatnosci"
          linkLabel="polityką prywatności"
          name="acceptPrivacy"
          text="Zapoznałem(-am) się z"
        />
      </fieldset>

      {newsletterController ? (
        <fieldset className="grid gap-2">
          <legend className="text-small text-ink mb-1 font-medium">
            Newsletter (dobrowolnie)
          </legend>
          <ConsentCheckbox
            defaultChecked={values?.newsletter}
            linkHref="/polityka-prywatnosci"
            linkLabel={NEWSLETTER_CONSENT_LINK_LABEL}
            name="newsletter"
            text={newsletterConsentLead(newsletterController)}
          />
          <p className="text-small text-text-muted">
            Wyślemy osobny e-mail z linkiem do potwierdzenia zapisu. Rezerwacja
            nie zależy od tej zgody.
          </p>
        </fieldset>
      ) : null}

      <div className="grid gap-3">
        <div className="flex flex-wrap gap-3">
          <PrimaryButton arrow disabled={pending} type="submit">
            {free ? "Potwierdź wizytę" : "Zapłać teraz"}
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
            ? "Kod rabatowy pokrywa całą cenę: potwierdzimy wizytę bez płatności."
            : payLater
              ? `Płacisz online. Jeśli wybierzesz płatność później, wyślemy Ci link e-mailem; opłać wizytę do ${payLater}, inaczej rezerwacja zostanie anulowana.`
              : "Do wizyty zostało niewiele czasu, więc płatność jest potrzebna od razu."}
        </p>
      </div>
    </form>
  );
}
