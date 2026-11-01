import {
  NEWSLETTER_CONSENT_LINK_LABEL,
  newsletterConsentLead,
} from "@repo/contracts/newsletter";
import { BookingField, ConsentCheckbox } from "@repo/ui/booking/fields";
import {
  HONEYPOT_FIELD,
  type DetailsFormErrors,
  type DetailsFormValues,
} from "@/features/booking/details-form-data";

// The participant's details and consents, as the visit booking asks for
// them (the same server reading, features/booking/details-form-data): the
// sign-up's details step and the waitlist share them. While the newsletter
// is on, the sign-up also offers it: apart, unticked, never required
// (Warsztat · 3, card 8).

export function ParticipantFields({
  values,
  errors,
  newsletterController = null,
}: {
  values?: DetailsFormValues;
  errors: DetailsFormErrors;
  /** Who handles the newsletter's data; none: no newsletter here. */
  newsletterController?: string | null;
}) {
  return (
    <>
      <div className="grid gap-5 sm:grid-cols-2">
        <BookingField
          autoComplete="given-name"
          defaultValue={values?.firstName}
          error={errors.firstName}
          label="Imię"
          name="firstName"
          required
        />
        <BookingField
          autoComplete="family-name"
          defaultValue={values?.lastName}
          error={errors.lastName}
          label="Nazwisko"
          name="lastName"
          required
        />
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
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
        <BookingField
          autoComplete="email"
          defaultValue={values?.email}
          error={errors.email}
          hint="Wyślemy na niego potwierdzenie i link do Twojego zapisu."
          label="E-mail"
          name="email"
          required
          type="email"
        />
      </div>
      <BookingField
        defaultValue={values?.notes}
        error={errors.notes}
        hint="Np. o czym warto wiedzieć prowadzącym. Nie podawaj tu informacji o zdrowiu."
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
          linkLabel="regulamin (także zasady warsztatów)"
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
            Wyślemy osobny e-mail z linkiem do potwierdzenia zapisu. Zapis na
            warsztat nie zależy od tej zgody.
          </p>
        </fieldset>
      ) : null}
    </>
  );
}
