"use client";

import {
  NEWSLETTER_CONSENT_LINK_LABEL,
  newsletterConsentLead,
  type NewsletterSource,
} from "@repo/contracts/newsletter";
import { BookingField, ConsentCheckbox } from "@repo/ui/booking/fields";
import { cn } from "@repo/ui/lib/utils";
import { PrimaryButton } from "@repo/ui/public-site/actions";
import { useActionState, useId, useState } from "react";
import { TurnstileWidget } from "@/features/booking/turnstile-widget";
import { subscribeToNewsletterAction } from "./actions";
import {
  NEWSLETTER_TRAP_FIELD,
  type NewsletterResult,
} from "./newsletter-shared";

// Signing up for the newsletter: the address and a separate consent, not
// ticked, naming who handles the data, with the privacy policy. Turnstile
// checks it is a person (its script comes only once the form is in use);
// a hidden field catches simple bots. Errors show at their fields; once
// sent, the form gives way to "check your inbox" (the same answer for
// every address). Two looks: in the home page's band and in the footer.

export interface NewsletterSignupProps {
  source: NewsletterSource;
  turnstileSiteKey: string;
  /** Who handles the data (Ustawienia → Firma), else the centre's name. */
  controller: string;
  /** The footer's look: a heading of its own, tighter. */
  compact?: boolean;
  className?: string;
}

const FAILURE: Partial<Record<NewsletterResult["status"], string>> = {
  unverified:
    "Nie udało się potwierdzić, że zapisuje się człowiek. Odśwież stronę i spróbuj jeszcze raz.",
  limited:
    "Z tego urządzenia zapisano już kilka adresów w ostatniej godzinie. Spróbuj później.",
  failed:
    "Nie udało się zapisać adresu. Spróbuj za kilka minut albo napisz do nas.",
};

export function NewsletterSignup({
  source,
  turnstileSiteKey,
  controller,
  compact = false,
  className,
}: NewsletterSignupProps) {
  const [result, send, pending] = useActionState(subscribeToNewsletterAction, {
    status: "idle",
  } as NewsletterResult);
  const [verified, setVerified] = useState(false);
  const [armed, setArmed] = useState(false);
  const headingId = useId();

  const heading = compact ? (
    <h2 className="text-eyebrow text-text-muted uppercase" id={headingId}>
      Newsletter
    </h2>
  ) : null;

  if (result.status === "sent") {
    return (
      <div className={cn("grid gap-2", className)}>
        {heading}
        <p className="text-body text-ink" role="status">
          Sprawdź skrzynkę. Jeśli tego adresu nie było jeszcze na liście,
          wysłaliśmy na niego link do potwierdzenia zapisu. Bez kliknięcia w
          link nic więcej nie wyślemy.
        </p>
      </div>
    );
  }

  const email = "email" in result ? result.email : undefined;
  const errors = result.status === "invalid" ? result.errors : {};
  const failure = FAILURE[result.status];

  return (
    <div className={cn("grid gap-3", className)}>
      {heading}
      {compact ? (
        <p className="text-small text-text-muted">
          Artykuły, warsztaty i nowości z centrum, mniej więcej raz w miesiącu.
        </p>
      ) : null}
      <form
        action={send}
        aria-labelledby={compact ? headingId : undefined}
        aria-label={compact ? undefined : "Zapis na newsletter"}
        className="grid gap-4"
        noValidate
        onFocus={() => setArmed(true)}
      >
        <input name="source" type="hidden" value={source} />
        <BookingField
          autoComplete="email"
          defaultValue={email}
          error={errors.email}
          label="Adres e-mail"
          name="email"
          required
          type="email"
        />
        {/* For bots only: people never see or fill it. */}
        <div aria-hidden="true" className="hidden">
          <label>
            Strona internetowa
            <input
              autoComplete="off"
              name={NEWSLETTER_TRAP_FIELD}
              tabIndex={-1}
            />
          </label>
        </div>
        <ConsentCheckbox
          defaultChecked={false}
          error={errors.consent}
          linkHref="/polityka-prywatnosci"
          linkLabel={NEWSLETTER_CONSENT_LINK_LABEL}
          name="consent"
          text={newsletterConsentLead(controller)}
        />
        {armed ? (
          <TurnstileWidget
            onError={() => setVerified(false)}
            onExpire={() => setVerified(false)}
            onVerify={() => setVerified(true)}
            siteKey={turnstileSiteKey}
          />
        ) : null}
        {failure ? (
          <p className="text-body text-ink" role="alert">
            {failure}
          </p>
        ) : null}
        <div>
          <PrimaryButton disabled={pending || !verified} type="submit">
            {pending ? "Zapisywanie…" : "Zapisz się"}
          </PrimaryButton>
        </div>
      </form>
    </div>
  );
}
