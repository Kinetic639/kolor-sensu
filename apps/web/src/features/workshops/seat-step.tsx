import { formatMinor } from "@repo/contracts/discount-codes";
import {
  getWorkshopRegistration,
  type WorkshopRegistration,
} from "@repo/supabase/workshops";
import { SoftCard } from "@repo/ui/public-site";
import { ShieldCheck } from "lucide-react";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { localTime } from "@/features/booking/visit-label";
import { getBookingWindow } from "@/lib/public-data";
import { createSecretClient } from "@/lib/supabase/secret";
import { readSeatToken } from "./seat-cookie";
import { seatNoticeHref } from "./signup-paths";
import { workshopDateLabel, workshopTimeLabel } from "./workshop-view";

// The sign-up's steps around a seat (server only): the guest's held seat
// by their cookie, and the step's frame with the seat's summary beside it
// (the workshop, when, where, the price after a code, the hold's end).

export interface HeldSeat {
  token: string;
  registration: WorkshopRegistration;
  timeZone: string;
}

/** The guest's seat, by their cookie; null when there is none. */
export async function readHeldSeat(): Promise<HeldSeat | null> {
  const token = await readSeatToken();
  if (!token) return null;
  const registration = await getWorkshopRegistration(
    createSecretClient(),
    token,
  ).catch(() => null);
  if (!registration) return null;
  const timeZone = (await getBookingWindow())?.timeZone ?? "Europe/Warsaw";
  return { token, registration, timeZone };
}

/** The seat held for this workshop, still in time; else back to its page. */
export async function requireHeldSeat(slug: string): Promise<HeldSeat> {
  const seat = await readHeldSeat();
  const live =
    seat?.registration.workshopSlug === slug &&
    (seat.registration.status === "held" ||
      seat.registration.status === "offered");
  if (!seat || !live) redirect(seatNoticeHref(slug, "wygaslo"));
  return seat;
}

export function seatPrice(registration: WorkshopRegistration) {
  const price = formatMinor(registration.priceMinor);
  if (!registration.discount) return price;
  return `${price} (zamiast ${formatMinor(registration.discount.listPriceMinor)}, kod ${registration.discount.code})`;
}

function SeatSummary({ seat }: { seat: HeldSeat }) {
  const { registration, timeZone } = seat;
  const place =
    registration.modality === "online"
      ? "Online"
      : [registration.locationName, registration.locationAddress]
          .filter(Boolean)
          .join(", ");
  const until =
    registration.status === "held"
      ? registration.holdExpiresAt
      : registration.offerExpiresAt;
  return (
    <div className="grid content-start gap-4">
      <SoftCard className="grid gap-2 p-5" tone="cream">
        <p className="text-eyebrow text-primary-strong uppercase">Warsztat</p>
        <p className="font-display text-h3 text-ink">
          {registration.workshopTitle}
        </p>
        <p className="text-small text-ink">
          {workshopDateLabel(registration.startsAt, timeZone)},{" "}
          {workshopTimeLabel(
            registration.startsAt,
            registration.endsAt,
            timeZone,
          )}
        </p>
        {place ? <p className="text-small text-text-muted">{place}</p> : null}
        <p className="text-body text-ink font-semibold">
          {registration.priceMinor === 0 && !registration.discount
            ? "Bezpłatnie"
            : seatPrice(registration)}
        </p>
      </SoftCard>
      {until ? (
        <p
          className="rounded-card-sm bg-primary-soft text-small text-ink flex gap-3 p-4"
          role="status"
        >
          <ShieldCheck
            aria-hidden="true"
            className="text-primary-strong size-5 shrink-0"
          />
          <span>
            <strong className="block font-semibold">
              Twoje miejsce jest tymczasowo zarezerwowane
            </strong>
            Dokończ zapis do {localTime(until, timeZone)}, a miejsce będzie
            Twoje.
          </span>
        </p>
      ) : null}
    </div>
  );
}

/** A step's frame: its one H1 and lead, the step, the seat beside it. */
export function SeatStep({
  seat,
  title,
  lead,
  children,
}: {
  seat: HeldSeat;
  title: string;
  lead: string;
  children: ReactNode;
}) {
  return (
    <div className="max-w-page px-gutter pb-section-sm mx-auto grid gap-8 pt-8 lg:grid-cols-[minmax(0,1fr)_22rem] lg:pt-12">
      <div className="grid content-start gap-6">
        <div className="grid gap-3">
          <h1 className="font-display text-display text-ink">{title}</h1>
          <p className="text-body text-text-muted max-w-2xl">{lead}</p>
        </div>
        {children}
      </div>
      <SeatSummary seat={seat} />
    </div>
  );
}
