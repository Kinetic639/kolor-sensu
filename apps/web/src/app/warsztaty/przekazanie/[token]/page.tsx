import { getWorkshopTransfer } from "@repo/supabase/workshops";
import { SecondaryButton, SoftCard } from "@repo/ui/public-site";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AcceptSeatForm } from "@/features/workshops/registration-forms";
import {
  workshopDateLabel,
  workshopHref,
  workshopTimeLabel,
} from "@/features/workshops/workshop-view";
import { getBookingWindow } from "@/lib/public-data";
import { createSecretClient } from "@/lib/supabase/secret";

export const metadata: Metadata = {
  title: "Przekazane miejsce na warsztacie",
  robots: { index: false },
};

export const dynamic = "force-dynamic";

// The invitation's page, by the link its e-mail carries (Warsztat · 8,
// card 4): who passes the seat on, the workshop, and accepting the rules
// and the privacy notice, which makes the seat this person's. Until then
// it stays with the one who passes it on.

export default async function TransferPage({
  params,
}: PageProps<"/warsztaty/przekazanie/[token]">) {
  const { token } = await params;
  if (!/^[A-Za-z0-9_-]{20,100}$/.test(token)) notFound();
  const [invite, window] = await Promise.all([
    getWorkshopTransfer(createSecretClient(), token).catch(() => null),
    getBookingWindow(),
  ]);
  if (!invite) notFound();
  const timeZone = window?.timeZone ?? "Europe/Warsaw";
  const when = `${workshopDateLabel(invite.startsAt, timeZone)}, ${workshopTimeLabel(invite.startsAt, invite.endsAt, timeZone)}`;

  return (
    <div className="max-w-page px-gutter pb-section-sm mx-auto grid gap-6 pt-8 lg:pt-12">
      <p className="text-eyebrow text-primary-strong uppercase">
        Zapis {invite.reference}
      </p>
      <h1 className="font-display text-display text-ink">
        {invite.open
          ? "Ktoś przekazuje Ci miejsce"
          : "To zaproszenie jest nieaktualne"}
      </h1>
      <SoftCard className="grid max-w-2xl gap-2 p-6" tone="cream">
        <p className="text-body text-ink">
          <strong>{invite.workshopTitle}</strong>
        </p>
        <p className="text-body text-ink">{when}</p>
        <p className="text-body text-ink">
          {invite.modality === "online" ? "Online" : "Stacjonarnie"}
        </p>
      </SoftCard>
      {invite.open ? (
        <div className="grid max-w-2xl gap-4">
          <p className="text-body text-text-muted">
            {invite.fromName ?? "Uczestnik warsztatu"} przekazuje swoje miejsce
            osobie: {invite.firstName} {invite.lastName} ({invite.email}). Żeby
            je przyjąć, zaakceptuj regulamin i zasady przetwarzania danych. Do
            tego czasu miejsce zostaje przy osobie, która je przekazuje.
          </p>
          <AcceptSeatForm token={token} />
        </div>
      ) : (
        <p className="text-body text-text-muted max-w-2xl">
          Miejsca nie da się już przejąć: zapis został anulowany albo warsztat
          już się zaczął.
        </p>
      )}
      <div>
        <SecondaryButton asChild>
          <Link href={workshopHref(invite.workshopSlug)}>O warsztacie</Link>
        </SecondaryButton>
      </div>
    </div>
  );
}
