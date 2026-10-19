"use client";

import { BookingField, ConsentCheckbox } from "@repo/ui/booking/fields";
import { PrimaryButton } from "@repo/ui/public-site/actions";
import Link from "next/link";
import { useActionState, useEffect, useRef, useState } from "react";
import { TurnstileWidget } from "@/features/booking/turnstile-widget";
import { sendContactMessageAction } from "./actions";
import { TRAP_FIELD, type ContactResult } from "./contact-shared";

// Kontakt → the form: name, e-mail, an optional phone and the message, with
// who handles the data and why (a link to the privacy policy), a request
// not to write about health, and where to get help at once. Turnstile
// checks it is a person (its script comes only once the form is near or in
// use, so it does not weigh on the page's first load); a hidden field
// catches simple bots. Errors show at
// their fields, read out by screen readers; what was typed stays. Once
// sent, the form gives way to a thank-you.

export interface ContactFormProps {
  heading: string;
  turnstileSiteKey: string;
  /** Who handles the data (Ustawienia → Firma), else the centre's name. */
  controller: string;
  /** Shown when sending fails: another way to reach the centre. */
  reach: string;
}

const FAILURE: Partial<Record<ContactResult["status"], string>> = {
  unverified:
    "Nie udało się potwierdzić, że wiadomość wysyła człowiek. Odśwież stronę i spróbuj jeszcze raz.",
  limited:
    "Wysłano już kilka wiadomości w ostatniej godzinie. Spróbuj później albo zadzwoń.",
  failed: "Nie udało się wysłać wiadomości.",
};

export function ContactForm({
  heading,
  turnstileSiteKey,
  controller,
  reach,
}: ContactFormProps) {
  const [result, send, pending] = useActionState(sendContactMessageAction, {
    status: "idle",
  } as ContactResult);
  const [verified, setVerified] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const [armed, setArmed] = useState(false);

  useEffect(() => {
    const form = formRef.current;
    if (!form || armed) return;
    if (typeof IntersectionObserver !== "function") {
      setArmed(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) setArmed(true);
      },
      { rootMargin: "300px 0px" },
    );
    observer.observe(form);
    return () => observer.disconnect();
  }, [armed]);

  if (result.status === "sent") {
    return (
      <section aria-labelledby="contact-form-heading" className="grid gap-3">
        <h2 className="font-display text-h3 text-ink" id="contact-form-heading">
          {heading}
        </h2>
        <p className="text-body text-ink" role="status">
          Dziękujemy, wiadomość wysłana. Kopię wysłaliśmy na Twój adres e-mail.
          Odpowiemy najszybciej, jak to możliwe.
        </p>
      </section>
    );
  }

  const values = "values" in result ? result.values : undefined;
  const errors = result.status === "invalid" ? result.errors : {};
  const failure = FAILURE[result.status];

  return (
    <section aria-labelledby="contact-form-heading" className="grid gap-4">
      <h2 className="font-display text-h3 text-ink" id="contact-form-heading">
        {heading}
      </h2>
      <form
        action={send}
        className="grid gap-4"
        noValidate
        onFocus={() => setArmed(true)}
        ref={formRef}
      >
        <BookingField
          autoComplete="name"
          defaultValue={values?.name}
          error={errors.name}
          label="Imię"
          name="name"
          required
        />
        <BookingField
          autoComplete="email"
          defaultValue={values?.email}
          error={errors.email}
          label="E-mail"
          name="email"
          required
          type="email"
        />
        <BookingField
          autoComplete="tel"
          defaultValue={values?.phone}
          error={errors.phone}
          hint="Opcjonalnie, jeśli wolisz, żebyśmy oddzwonili."
          label="Telefon"
          name="phone"
          type="tel"
        />
        <BookingField
          defaultValue={values?.message}
          error={errors.message}
          hint="Prosimy, nie opisuj tu swojego zdrowia ani trudnej sytuacji: porozmawiamy o tym na spotkaniu."
          label="Wiadomość"
          multiline
          name="message"
          required
        />
        {/* For bots only: people never see or fill it. */}
        <div aria-hidden="true" className="hidden">
          <label>
            Strona internetowa
            <input autoComplete="off" name={TRAP_FIELD} tabIndex={-1} />
          </label>
        </div>
        <ConsentCheckbox
          defaultChecked={false}
          error={errors.consent}
          linkHref="/polityka-prywatnosci"
          linkLabel="polityce prywatności"
          name="consent"
          text={`Rozumiem, że ${controller} użyje moich danych tylko po to, by odpowiedzieć na wiadomość. Więcej w`}
        />
        <p className="text-small text-text-muted">
          W nagłej sytuacji nie czekaj na odpowiedź: zadzwoń pod 112 albo zobacz{" "}
          <Link
            className="text-ink underline underline-offset-4"
            href="/pomoc-w-kryzysie"
          >
            Pomoc w kryzysie
          </Link>
          .
        </p>
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
            {failure} {reach}
          </p>
        ) : null}
        <div>
          <PrimaryButton disabled={pending || !verified} type="submit">
            {pending ? "Wysyłanie…" : "Wyślij wiadomość"}
          </PrimaryButton>
        </div>
      </form>
    </section>
  );
}
