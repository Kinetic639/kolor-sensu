"use client";

import { BookingField, ConsentCheckbox } from "@repo/ui/booking";
import { PrimaryButton } from "@repo/ui/public-site";
import { useActionState } from "react";
import { saveDetailsAction, type DetailsFormState } from "./actions";
import { HONEYPOT_FIELD, type DetailsFormValues } from "./details-form-data";

// Step 5: the client's details and consents. A plain form posted to the
// server (it works before JavaScript loads); errors come back per field.

export function DetailsForm({ saved }: { saved: DetailsFormValues | null }) {
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
          Dane zapisane. Płatność online pojawi się tu w kolejnym etapie
          rezerwacji.
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

      <PrimaryButton
        arrow
        className="justify-self-start"
        disabled={pending}
        type="submit"
      >
        {state.status === "saved" ? "Zapisz zmiany" : "Zapisz dane"}
      </PrimaryButton>
    </form>
  );
}
