"use client";

import { BookingField, ConsentCheckbox } from "@repo/ui/booking/fields";
import { PrimaryButton, SecondaryButton } from "@repo/ui/public-site/actions";
import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import {
  acceptSeatAction,
  cancelMySeatAction,
  transferMySeatAction,
  type AcceptState,
  type TransferState,
} from "./registration-actions";

// A registration's page: giving the seat up (after a second, explicit
// press, with what happens to the money said first) and passing it on;
// and the invitation's page, where the new person accepts the rules.

function ConfirmCancel() {
  const { pending } = useFormStatus();
  return (
    <PrimaryButton disabled={pending} type="submit">
      {pending ? "Anulujemy…" : "Tak, rezygnuję"}
    </PrimaryButton>
  );
}

export function CancelSeatForm({
  token,
  consequence,
  label,
}: {
  token: string;
  /** What happens to the money, said before the press. */
  consequence: string;
  /** "Zrezygnuj z warsztatu" or "Wypisz się z listy rezerwowej". */
  label: string;
}) {
  const [asking, setAsking] = useState(false);
  if (!asking)
    return (
      <div>
        <SecondaryButton onClick={() => setAsking(true)} type="button">
          {label}
        </SecondaryButton>
      </div>
    );
  return (
    <form
      action={cancelMySeatAction}
      className="rounded-card-sm bg-pink-soft grid gap-3 p-4"
    >
      <input name="token" type="hidden" value={token} />
      <p className="text-small text-ink" role="alert">
        {consequence}
      </p>
      <div className="flex flex-wrap gap-3">
        <ConfirmCancel />
        <SecondaryButton onClick={() => setAsking(false)} type="button">
          Zostaję
        </SecondaryButton>
      </div>
    </form>
  );
}

export function TransferSeatForm({ token }: { token: string }) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState<TransferState, FormData>(
    transferMySeatAction,
    { status: "idle" },
  );
  if (!open)
    return (
      <div>
        <SecondaryButton onClick={() => setOpen(true)} type="button">
          Przekaż miejsce innej osobie
        </SecondaryButton>
      </div>
    );
  return (
    <form action={action} className="grid gap-4" noValidate>
      <input name="token" type="hidden" value={token} />
      <p className="text-small text-text-muted">
        Wyślemy tej osobie zaproszenie. Miejsce przejdzie na nią (bez zwrotu),
        gdy zaakceptuje regulamin; od tego czasu to ona dostanie potwierdzenie i
        przypomnienia.
      </p>
      {state.status === "invalid" ? (
        <p
          className="rounded-card-sm bg-pink-soft text-small text-ink p-3"
          role="alert"
        >
          {state.message}
        </p>
      ) : null}
      <div className="grid gap-4 sm:grid-cols-2">
        <BookingField
          autoComplete="off"
          label="Imię"
          name="firstName"
          required
        />
        <BookingField
          autoComplete="off"
          label="Nazwisko"
          name="lastName"
          required
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <BookingField
          autoComplete="off"
          inputMode="tel"
          label="Telefon"
          name="phone"
          required
          type="tel"
        />
        <BookingField
          autoComplete="off"
          label="E-mail"
          name="email"
          required
          type="email"
        />
      </div>
      <div className="flex flex-wrap gap-3">
        <PrimaryButton disabled={pending} type="submit">
          Przekaż miejsce
        </PrimaryButton>
        <SecondaryButton onClick={() => setOpen(false)} type="button">
          Anuluj
        </SecondaryButton>
      </div>
    </form>
  );
}

function AcceptButton() {
  const { pending } = useFormStatus();
  return (
    <PrimaryButton disabled={pending} type="submit">
      {pending ? "Przyjmujemy…" : "Przyjmuję miejsce"}
    </PrimaryButton>
  );
}

/** "Przyjmuję miejsce", with the rules and the privacy notice accepted. */
export function AcceptSeatForm({ token }: { token: string }) {
  const [state, action] = useActionState<AcceptState, FormData>(
    acceptSeatAction,
    { status: "idle" },
  );
  return (
    <form action={action} className="grid gap-4" noValidate>
      <input name="token" type="hidden" value={token} />
      {state.status === "invalid" ? (
        <p
          className="rounded-card-sm bg-pink-soft text-small text-ink p-3"
          role="alert"
        >
          {state.message}
        </p>
      ) : null}
      <fieldset className="grid gap-3">
        <legend className="sr-only">Zgody</legend>
        <ConsentCheckbox
          linkHref="/regulamin"
          linkLabel="regulamin (także zasady warsztatów)"
          name="terms"
          text="Akceptuję"
        />
        <ConsentCheckbox
          linkHref="/polityka-prywatnosci"
          linkLabel="polityką prywatności"
          name="privacy"
          text="Zapoznałem(-am) się z"
        />
      </fieldset>
      <div>
        <AcceptButton />
      </div>
    </form>
  );
}
