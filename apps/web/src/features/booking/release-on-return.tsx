"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { releaseOnReturnAction } from "./actions";
import { RESUME_COOKIE } from "./wizard-memory-cookie";

// Back in the wizard from the details or payment step (Klient · 2, card
// 5), by "Wstecz" in the browser or a link: the time held goes back at
// once and the free times are read again, with a word on it. The step the
// visitor was on comes from the resume cookie, read while rendering, before
// the wizard's own effect writes it anew. Back twice: nothing is held, so
// nothing happens.

const HELD_STEPS = /^\/umow-wizyte\/(?:dane|platnosc)(?:$|\?)/;

/** Whether the cookies say the visitor came from a step with a time held. */
export function cameFromHeldStep(cookies: string) {
  const entry = cookies
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${RESUME_COOKIE}=`));
  if (!entry) return false;
  try {
    return HELD_STEPS.test(
      decodeURIComponent(entry.slice(RESUME_COOKIE.length + 1)),
    );
  } catch {
    return false;
  }
}

export function ReleaseOnReturn() {
  const router = useRouter();
  const [fromHeld] = useState(
    () => typeof document !== "undefined" && cameFromHeldStep(document.cookie),
  );
  const [released, setReleased] = useState<string | null>(null);

  // Once per visit to the page (an effect run twice asks once).
  const asked = useRef(false);

  useEffect(() => {
    if (!fromHeld || asked.current) return;
    asked.current = true;
    releaseOnReturnAction()
      .then((label) => {
        if (!label) return;
        setReleased(label);
        router.refresh();
      })
      .catch(() => {});
  }, [fromHeld, router]);

  return released ? (
    <p
      className="rounded-card-sm bg-primary-soft text-small text-ink p-4"
      role="status"
    >
      Po powrocie do wyboru terminu zwolniliśmy termin {released}. Możesz wybrać
      go ponownie albo inny.
    </p>
  ) : null;
}
