"use client";

import { PrimaryButton } from "@repo/ui/public-site/actions";
import { useActionState } from "react";
import {
  cancelVisitAction,
  rescheduleVisitAction,
  type ChangeFormState,
} from "./visit-actions";

// Confirming a change of a visit: a plain form posted to the server (it
// works before JavaScript loads); a refusal comes back as a message.

export function ChangeVisitForm({
  change,
  token,
  termin,
  label,
}: {
  change: "cancel" | "reschedule";
  token: string;
  /** The chosen local time, when moving. */
  termin?: string;
  label: string;
}) {
  const [state, action, pending] = useActionState<ChangeFormState, FormData>(
    change === "cancel" ? cancelVisitAction : rescheduleVisitAction,
    { status: "idle" },
  );
  return (
    <form action={action} className="grid gap-4">
      <input name="token" type="hidden" value={token} />
      {termin ? <input name="termin" type="hidden" value={termin} /> : null}
      {state.status === "error" ? (
        <p
          className="rounded-card-sm bg-pink-soft text-small text-ink p-4"
          role="alert"
        >
          {state.message}
        </p>
      ) : null}
      <PrimaryButton
        className="justify-self-start"
        disabled={pending}
        type="submit"
      >
        {pending ? "Zapisywanie…" : label}
      </PrimaryButton>
    </form>
  );
}
