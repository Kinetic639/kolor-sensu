"use client";

import { useOptimistic, useTransition } from "react";
import { Switch } from "../switch";
import { toast } from "../toast";
import type { OfferStateAction } from "./types";

// An offer's switch, on or off: it moves at once, saves, and says so in a
// toast; refused, it goes back. The page renders again with what was
// saved. A specialist's page names the service, a service's page the
// specialist.

export function OfferToggle({
  offer,
  subject,
  label,
  action,
}: {
  offer: { id: string; active: boolean };
  /** Whose or which the offer is (the service, or the specialist). */
  subject: string;
  /** What it switches (`Oferta aktywna`); with the subject, its name. */
  label: string;
  action: OfferStateAction;
}) {
  const [pending, startTransition] = useTransition();
  const [checked, setChecked] = useOptimistic(offer.active);

  return (
    <Switch
      aria-label={`${label}: ${subject}`}
      checked={checked}
      disabled={pending}
      onCheckedChange={(next) =>
        startTransition(async () => {
          setChecked(next);
          const result = await action({ offerId: offer.id, active: next });
          if (result.ok) {
            toast.success(next ? "Włączono ofertę" : "Wyłączono ofertę", {
              description: subject,
            });
          } else {
            toast.error("Nie udało się zapisać oferty", {
              description: result.message,
            });
          }
        })
      }
      size="sm"
    />
  );
}
