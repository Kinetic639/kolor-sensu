"use client";

import { Check, MapPin, Monitor, UserCheck } from "lucide-react";
import { Badge } from "./badge";
import { Card } from "./card";
import { cn } from "./lib/utils";
import { StatusBadge } from "./portal-content";
import { Switch } from "./switch";

export interface SpecialistStatusSummaryProps {
  active: boolean;
  accountActive: boolean;
  acceptingNewClients: boolean;
  publicationLabel: string;
  publicationTone?: "neutral" | "success" | "warning" | "danger" | "info";
  className?: string;
}

export function SpecialistStatusSummary({
  active,
  accountActive,
  acceptingNewClients,
  publicationLabel,
  publicationTone = "neutral",
  className,
}: SpecialistStatusSummaryProps) {
  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      <StatusBadge tone={active && accountActive ? "success" : "danger"}>
        {active && accountActive ? "Aktywny" : "Nieaktywny"}
      </StatusBadge>
      <StatusBadge tone={acceptingNewClients ? "info" : "neutral"}>
        {acceptingNewClients
          ? "Przyjmuje nowych klientów"
          : "Nie przyjmuje nowych klientów"}
      </StatusBadge>
      <StatusBadge tone={publicationTone}>{publicationLabel}</StatusBadge>
    </div>
  );
}

export interface ProfileReviewDiffField {
  id: string;
  label: string;
  currentValue: string;
  proposedValue: string;
  changed: boolean;
  multiline?: boolean;
}

export function ProfileReviewDiff({
  fields,
  className,
}: {
  fields: ProfileReviewDiffField[];
  className?: string;
}) {
  const changedFields = fields.filter((field) => field.changed);

  if (changedFields.length === 0) {
    return (
      <div
        className={cn(
          "rounded-[var(--radius-control)] bg-[var(--success-soft)] p-4 text-sm text-[var(--success)]",
          className,
        )}
      >
        <Check className="mr-2 inline size-4" aria-hidden="true" />
        Szkic nie zmienia treści opublikowanego profilu.
      </div>
    );
  }

  return (
    <div className={cn("space-y-3", className)}>
      {changedFields.map((field) => (
        <Card className="p-0" key={field.id}>
          <div className="border-b border-[var(--border)] px-4 py-3">
            <p className="text-sm font-semibold text-[var(--text)]">
              {field.label}
            </p>
          </div>
          <div className="grid md:grid-cols-2">
            <div className="border-b border-[var(--border)] p-4 md:border-r md:border-b-0">
              <p className="text-xs font-bold tracking-wide text-[var(--text-muted)] uppercase">
                Obecnie
              </p>
              <p
                className={cn(
                  "mt-2 text-sm text-[var(--text-muted)]",
                  field.multiline && "whitespace-pre-wrap",
                )}
              >
                {field.currentValue}
              </p>
            </div>
            <div className="bg-[var(--primary-soft)] p-4">
              <p className="text-xs font-bold tracking-wide text-[var(--primary)] uppercase">
                Propozycja
              </p>
              <p
                className={cn(
                  "mt-2 text-sm font-medium text-[var(--text)]",
                  field.multiline && "whitespace-pre-wrap",
                )}
              >
                {field.proposedValue}
              </p>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}

export interface SpecialistOfferRowProps {
  serviceName: string;
  priceLabel: string;
  durationLabel: string;
  supportsInPerson: boolean;
  supportsOnline: boolean;
  active: boolean;
  acceptingNewClients: boolean;
  pending?: boolean;
  onActiveChange?: (active: boolean) => void;
  onAcceptingNewClientsChange?: (accepting: boolean) => void;
}

export function SpecialistOfferRow({
  serviceName,
  priceLabel,
  durationLabel,
  supportsInPerson,
  supportsOnline,
  active,
  acceptingNewClients,
  pending = false,
  onActiveChange,
  onAcceptingNewClientsChange,
}: SpecialistOfferRowProps) {
  return (
    <li className="grid gap-4 border-b border-[var(--border)] py-4 last:border-b-0 lg:grid-cols-[minmax(0,1fr)_auto_auto] lg:items-center">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-semibold text-[var(--text)]">{serviceName}</p>
          <Badge variant={active ? "success" : "neutral"}>
            {active ? "Aktywna" : "Nieaktywna"}
          </Badge>
        </div>
        <p className="mt-1 text-sm text-[var(--text-muted)]">
          {priceLabel} · {durationLabel}
        </p>
        <div className="mt-2 flex flex-wrap gap-2 text-xs text-[var(--text-muted)]">
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
      <label className="flex min-h-11 items-center justify-between gap-3 text-sm lg:justify-start">
        <span className="inline-flex items-center gap-1.5 text-[var(--text-muted)]">
          <UserCheck className="size-4" aria-hidden="true" /> Nowi klienci
        </span>
        <Switch
          checked={acceptingNewClients}
          disabled={pending}
          aria-label={`Przyjmowanie nowych klientów dla ${serviceName}`}
          onCheckedChange={onAcceptingNewClientsChange}
        />
      </label>
      <label className="flex min-h-11 items-center justify-between gap-3 text-sm lg:justify-start">
        <span className="text-[var(--text-muted)]">Oferta aktywna</span>
        <Switch
          checked={active}
          disabled={pending}
          aria-label={`Aktywność oferty ${serviceName}`}
          onCheckedChange={onActiveChange}
        />
      </label>
    </li>
  );
}
