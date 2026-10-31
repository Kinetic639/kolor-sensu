"use client";

import { Send } from "lucide-react";
import { useTransition } from "react";
import { toast } from "../toast";
import { IconButton } from "../icon-action";

// "Wyślij link do płatności" in a visit's side panel (R11): a reservation
// not paid yet, whose client lost the e-mail, gets it again; for a
// confirmed visit, "Wyślij link do wizyty" sends its confirmation again,
// with a new link (Klient · 6, card 7). The portal's action asks the site,
// which sends it; the database allows it once every few minutes.

export type ResendPaymentLinkResult =
  | { ok: true; emailed: "sent" | "skipped" | "failed" }
  | { ok: false; message: string };

export function ResendPaymentLinkButton({
  visitId,
  action,
  confirmed = false,
}: {
  visitId: string;
  action: (visitId: string) => Promise<ResendPaymentLinkResult>;
  /** A confirmed visit: its confirmation, with the visit's link. */
  confirmed?: boolean;
}) {
  const [pending, startTransition] = useTransition();
  return (
    <IconButton
      disabled={pending}
      icon={<Send aria-hidden="true" />}
      label={confirmed ? "Wyślij link do wizyty" : "Wyślij link do płatności"}
      onClick={() =>
        startTransition(async () => {
          const result = await action(visitId);
          if (!result.ok) {
            toast.error(result.message);
          } else if (result.emailed === "sent") {
            toast.success(
              confirmed
                ? "Wysłaliśmy klientowi potwierdzenie z linkiem do wizyty."
                : "Wysłaliśmy klientowi link do płatności.",
            );
          } else {
            toast.error("Nie udało się wysłać e-maila. Spróbuj za chwilę.");
          }
        })
      }
    />
  );
}
