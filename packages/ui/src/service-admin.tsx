import { MapPin, Monitor } from "lucide-react";
import { Badge } from "./badge";
import { StatusBadge } from "./portal-content";

export function ServiceStatusBadges({
  active,
  publiclyVisible,
  bookingEnabled,
}: {
  active: boolean;
  publiclyVisible: boolean;
  bookingEnabled: boolean;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      <StatusBadge tone={active ? "success" : "danger"}>
        {active ? "Aktywna" : "Nieaktywna"}
      </StatusBadge>
      <StatusBadge tone={publiclyVisible ? "info" : "neutral"}>
        {publiclyVisible ? "Publiczna" : "Prywatna"}
      </StatusBadge>
      <StatusBadge tone={bookingEnabled ? "success" : "neutral"}>
        {bookingEnabled ? "Booking włączony" : "Booking wyłączony"}
      </StatusBadge>
    </div>
  );
}

export function SpecialistOfferSummary({
  specialistName,
  professionalTitle,
  priceLabel,
  durationLabel,
  supportsInPerson,
  supportsOnline,
  active,
}: {
  specialistName: string;
  professionalTitle: string | null;
  priceLabel: string;
  durationLabel: string;
  supportsInPerson: boolean;
  supportsOnline: boolean;
  active: boolean;
}) {
  return (
    <li className="grid gap-3 border-b border-[var(--border)] py-4 last:border-0 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-semibold text-[var(--text)]">{specialistName}</p>
          <Badge variant={active ? "success" : "neutral"}>
            {active ? "Aktywna oferta" : "Nieaktywna oferta"}
          </Badge>
        </div>
        {professionalTitle ? (
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            {professionalTitle}
          </p>
        ) : null}
        <div className="mt-2 flex flex-wrap gap-3 text-xs text-[var(--text-muted)]">
          {supportsInPerson ? (
            <span className="inline-flex items-center gap-1">
              <MapPin className="size-3.5" aria-hidden="true" /> Stacjonarnie
            </span>
          ) : null}
          {supportsOnline ? (
            <span className="inline-flex items-center gap-1">
              <Monitor className="size-3.5" aria-hidden="true" /> Online
            </span>
          ) : null}
        </div>
      </div>
      <p className="text-sm font-semibold text-[var(--text)]">
        {priceLabel} · {durationLabel}
      </p>
    </li>
  );
}
