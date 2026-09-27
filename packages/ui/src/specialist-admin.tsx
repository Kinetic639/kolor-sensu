"use client";

import { Check, MapPin, Monitor, Pencil, UserCheck } from "lucide-react";
import { Badge } from "./badge";
import { Button } from "./button";
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
  /** Photo fields: the image replaces the text value when present. */
  currentImageUrl?: string | null;
  proposedImageUrl?: string | null;
}

function DiffValue({
  field,
  side,
}: {
  field: ProfileReviewDiffField;
  side: "current" | "proposed";
}) {
  const imageUrl =
    side === "current" ? field.currentImageUrl : field.proposedImageUrl;
  const text = side === "current" ? field.currentValue : field.proposedValue;

  if (imageUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- short-lived signed URLs
      <img
        alt={`${field.label} – ${side === "current" ? "obecnie" : "propozycja"}`}
        className="mt-2 h-40 w-auto rounded-[var(--radius-control)] object-cover"
        src={imageUrl}
      />
    );
  }
  return (
    <p
      className={cn(
        "mt-2 text-sm",
        side === "current"
          ? "text-[var(--text-muted)]"
          : "font-medium text-[var(--text)]",
        field.multiline && "whitespace-pre-wrap",
      )}
    >
      {text}
    </p>
  );
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
              <DiffValue field={field} side="current" />
            </div>
            <div className="bg-[var(--primary-soft)] p-4">
              <p className="text-xs font-bold tracking-wide text-[var(--primary)] uppercase">
                Propozycja
              </p>
              <DiffValue field={field} side="proposed" />
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}

export interface SpecialistOfferRowProps {
  serviceName: string;
  description?: string | null;
  priceLabel: string;
  durationLabel: string;
  supportsInPerson: boolean;
  supportsOnline: boolean;
  active: boolean;
  acceptingNewClients: boolean;
  pending?: boolean;
  onActiveChange?: (active: boolean) => void;
  onAcceptingNewClientsChange?: (accepting: boolean) => void;
  /** Adds an "Edytuj" button (the specialist edits price, time and form). */
  onEdit?: () => void;
}

export function SpecialistOfferRow({
  serviceName,
  description,
  priceLabel,
  durationLabel,
  supportsInPerson,
  supportsOnline,
  active,
  acceptingNewClients,
  pending = false,
  onActiveChange,
  onAcceptingNewClientsChange,
  onEdit,
}: SpecialistOfferRowProps) {
  return (
    <li className="grid gap-4 border-b border-[var(--border)] py-4 last:border-b-0 lg:grid-flow-col lg:grid-cols-[minmax(0,1fr)] lg:items-center">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-semibold text-[var(--text)]">{serviceName}</p>
          <Badge variant={active ? "success" : "neutral"}>
            {active ? "Aktywna" : "Nieaktywna"}
          </Badge>
        </div>
        {description ? (
          <p className="mt-0.5 text-sm text-[var(--text-muted)]">
            {description}
          </p>
        ) : null}
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
      {onActiveChange ? (
        <label className="flex min-h-11 items-center justify-between gap-3 text-sm lg:justify-start">
          <span className="text-[var(--text-muted)]">Oferta aktywna</span>
          <Switch
            checked={active}
            disabled={pending}
            aria-label={`Aktywność oferty ${serviceName}`}
            onCheckedChange={onActiveChange}
          />
        </label>
      ) : null}
      {onEdit ? (
        <Button
          aria-label={`Edytuj: ${serviceName}`}
          disabled={pending}
          onClick={onEdit}
          size="sm"
          variant="secondary"
        >
          <Pencil className="size-4" aria-hidden="true" />
          Edytuj
        </Button>
      ) : null}
    </li>
  );
}
