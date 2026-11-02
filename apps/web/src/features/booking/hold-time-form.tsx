"use client";

import { PrimaryButton } from "@repo/ui/public-site/actions";
import Link from "next/link";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
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

// Card 8 (Klient · 2): the held visit is found by a cookie, so without
// cookies a time would be held for nobody. Read in the browser; the
// server's HTML assumes they work.
const noChanges = () => () => {};
const cookiesWork = () => navigator.cookieEnabled;
const assumeCookies = () => true;

export function HoldTimeForm({
  fields,
  turnstileSiteKey,
  autoContinue = false,
}: {
  /** The wizard's choices, sent with the hold. */
  fields: Record<string, string>;
  turnstileSiteKey: string;
  autoContinue?: boolean;
}) {
  const [check, setCheck] = useState<Check>("checking");
  const cookies = useSyncExternalStore(noChanges, cookiesWork, assumeCookies);
  const form = useRef<HTMLFormElement>(null);
  const sent = useRef(false);
  useEffect(() => {
    if (
      autoContinue &&
      cookies &&
      check === "verified" &&
      !sent.current &&
      form.current
    ) {
      sent.current = true;
      form.current.requestSubmit();
    }
  }, [autoContinue, cookies, check]);

  if (!cookies) {
    return (
      <p className="text-small text-ink grid gap-2" role="alert">
        <span>
          Rezerwacja online potrzebuje niezbędnych plików cookies, a ta
          przeglądarka ich nie zapisuje. Włącz je i odśwież stronę albo umów się
          z nami telefonicznie lub mailowo.
        </span>
        <Link className="font-semibold underline" href="/kontakt">
          Kontakt z centrum
        </Link>
      </p>
    );
  }

  return (
    <form ref={form} action={holdTimeAction} className="grid gap-3">
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
        {autoContinue && check !== "failed"
          ? "Przygotowujemy wizytę i przechodzimy do Twoich danych…"
          : STATUS[check]}
      </p>
      {!autoContinue ? <Submit ready={check === "verified"} /> : null}
    </form>
  );
}
