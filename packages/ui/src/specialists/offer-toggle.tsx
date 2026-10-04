"use client";

import { useOptimistic, useTransition } from "react";
import { Switch } from "../switch";
import { toast } from "../toast";
import type { OfferStateAction, SpecialistOffer } from "./types";

// One switch of an offer (on or off, new clients or not): it moves at
// once, saves, and says so in a toast; refused, it goes back. The page
// renders again with what was saved.

const MESSAGES = {
  active: (on: boolean) => (on ? "Włączono ofertę" : "Wyłączono ofertę"),
  acceptingNewClients: (on: boolean) =>
    on
      ? "Oferta przyjmuje nowych klientów"
      : "Oferta nie przyjmuje nowych klientów",
};

export function OfferToggle({
  offer,
  field,
  label,
  action,
}: {
  offer: SpecialistOffer;
  field: "active" | "acceptingNewClients";
  /** What it switches (`Oferta aktywna`); with the service, its name. */
  label: string;
  action: OfferStateAction;
}) {
  const [pending, startTransition] = useTransition();
  const [checked, setChecked] = useOptimistic(offer[field]);

  return (
    <Switch
      aria-label={`${label}: ${offer.serviceName}`}
      checked={checked}
      disabled={pending}
      onCheckedChange={(next) =>
        startTransition(async () => {
          setChecked(next);
          const result = await action({
            offerId: offer.id,
            active: offer.active,
            acceptingNewClients: offer.acceptingNewClients,
            [field]: next,
          });
          if (result.ok) {
            toast.success(MESSAGES[field](next), {
              description: offer.serviceName,
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
