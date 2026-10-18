"use client";

import { PrimaryButton } from "@repo/ui/public-site/actions";
import { useState } from "react";
import { useFormStatus } from "react-dom";
import { holdTimeAction } from "./actions";
import { TurnstileWidget } from "./turnstile-widget";

// The wizard's last action: hold the chosen time. "Przejdź dalej" waits for
// the bot check (the hold blocks the time for a while, so a bot must not
// reach it) and says why it waits; a failed or expired check closes it again.

type Check = "checking" | "verified" | "failed";

const STATUS: Record<Check, string> = {
  checking: "Sprawdzamy, czy rezerwuje człowiek. To potrwa chwilę.",
  verified: "Gotowe. Możesz przejść dalej.",
  failed:
    "Nie udało się potwierdzić, że rezerwuje człowiek. Odśwież stronę albo zadzwoń do nas.",
};

function Submit({ ready }: { ready: boolean }) {
  // Pending: sent once, not twice.
  const { pending } = useFormStatus();
  return (
    <PrimaryButton
      aria-describedby="hold-time-status"
      arrow
      className="w-full"
      disabled={!ready || pending}
      type="submit"
    >
      Przejdź dalej
    </PrimaryButton>
  );
}

export function HoldTimeForm({
  fields,
  turnstileSiteKey,
}: {
  /** The wizard's choices, sent with the hold. */
  fields: Record<string, string>;
  turnstileSiteKey: string;
}) {
  const [check, setCheck] = useState<Check>("checking");

  return (
    <form action={holdTimeAction} className="grid gap-3">
      {Object.entries(fields).map(([key, value]) => (
        <input key={key} name={key} type="hidden" value={value} />
      ))}
      <TurnstileWidget
        onError={() => setCheck("failed")}
        onExpire={() => setCheck("checking")}
        onVerify={() => setCheck("verified")}
        siteKey={turnstileSiteKey}
      />
      <p
        aria-live="polite"
        className={
          check === "failed"
            ? "text-small text-ink"
            : "text-small text-text-muted"
        }
        id="hold-time-status"
        role={check === "failed" ? "alert" : undefined}
      >
        {STATUS[check]}
      </p>
      <Submit ready={check === "verified"} />
    </form>
  );
}
