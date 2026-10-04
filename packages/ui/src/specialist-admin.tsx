"use client";

import { Check, MapPin, Monitor, Pencil } from "lucide-react";
import { Badge } from "./badge";
import { Button } from "./button";
import { cn } from "./lib/utils";
import { StatusBadge } from "./portal-content";
import { Switch } from "./switch";

export interface SpecialistStatusSummaryProps {
  active: boolean;
  accountActive: boolean;
  publicationLabel: string;
  publicationTone?: "neutral" | "success" | "warning" | "danger" | "info";
  className?: string;
}

export function SpecialistStatusSummary({
  active,
  accountActive,
  publicationLabel,
  publicationTone = "neutral",
  className,
}: SpecialistStatusSummaryProps) {
  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      <StatusBadge tone={active && accountActive ? "success" : "danger"}>
        {active && accountActive ? "Aktywny" : "Nieaktywny"}
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
        className="h-24 w-auto rounded-[6px] object-cover"
        src={imageUrl}
      />
    );
  }
  return (
    <p
      className={cn(
        "text-[0.8125rem] leading-relaxed",
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

const SIDE_LABEL =
  "text-[0.6875rem] font-semibold tracking-wide uppercase sm:hidden";

/**
 * A draft against the published profile, as a compact table: a row a
 * changed field, what is there now beside what is proposed (on a phone,
 * one under the other, each named).
 */
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
      <p
        className={cn(
          "flex items-center gap-2 rounded-[8px] bg-[var(--success-soft)] px-3 py-2.5 text-[0.8125rem] text-[var(--success)]",
          className,
        )}
      >
        <Check className="size-4 shrink-0" aria-hidden="true" />
        Szkic nie zmienia treści opublikowanego profilu.
      </p>
    );
  }

  return (
    <div
      className={cn(
        "overflow-hidden rounded-[8px] border border-[var(--border)]",
        className,
      )}
    >
      <div
        aria-hidden="true"
        className="hidden h-8 grid-cols-[9rem_minmax(0,1fr)_minmax(0,1fr)] items-center border-b border-[var(--border)] bg-[var(--surface-subtle)] text-[0.75rem] font-medium text-[var(--text-muted)] sm:grid"
      >
        <span className="px-3">Pole</span>
        <span className="px-3">Obecnie</span>
        <span className="px-3 text-[var(--primary)]">Propozycja</span>
      </div>
      <ul>
        {changedFields.map((field) => (
          <li
            className="grid border-b border-[var(--border)] last:border-b-0 sm:grid-cols-[9rem_minmax(0,1fr)_minmax(0,1fr)]"
            key={field.id}
          >
            <span className="px-3 pt-2.5 text-[0.8125rem] font-semibold text-[var(--text)] sm:py-2.5">
              {field.label}
            </span>
            <div className="grid gap-1 px-3 py-2.5">
              <span className={cn(SIDE_LABEL, "text-[var(--text-muted)]")}>
                Obecnie
              </span>
              <DiffValue field={field} side="current" />
            </div>
            <div className="grid gap-1 bg-[var(--primary-soft)] px-3 py-2.5">
              <span className={cn(SIDE_LABEL, "text-[var(--primary)]")}>
                Propozycja
              </span>
              <DiffValue field={field} side="proposed" />
            </div>
          </li>
        ))}
      </ul>
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
  pending?: boolean;
  onActiveChange?: (active: boolean) => void;
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
  pending = false,
  onActiveChange,
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
