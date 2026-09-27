"use client";

import {
  Award,
  BookOpen,
  CircleAlert,
  CircleCheck,
  Clock3,
  Crop,
  FilePen,
  Globe,
  GraduationCap,
  ImagePlus,
  Plus,
  Sparkles,
  Trash2,
  UserRound,
  X,
  type LucideIcon,
} from "lucide-react";
import { useRef, useState, type KeyboardEvent } from "react";
import { Badge } from "./badge";
import { Button } from "./button";
import { Input } from "./input";
import { Label } from "./label";
import { cn } from "./lib/utils";

const fieldErrorClass = "text-sm text-[var(--danger)]";

export interface TagListFieldProps {
  id: string;
  label: string;
  values: string[];
  onChange: (values: string[]) => void;
  description?: string;
  placeholder?: string;
  maxItems?: number;
  maxLength?: number;
  required?: boolean;
  error?: string;
  className?: string;
}

/** A list of short text values (languages, specializations…) edited as tags. */
export function TagListField({
  id,
  label,
  values,
  onChange,
  description,
  placeholder = "Wpisz i naciśnij Enter",
  maxItems,
  maxLength = 160,
  required = false,
  error,
  className,
}: TagListFieldProps) {
  const [draft, setDraft] = useState("");
  const full = maxItems !== undefined && values.length >= maxItems;
  const descriptionId = description ? `${id}-description` : undefined;
  const errorId = error ? `${id}-error` : undefined;

  function add() {
    const value = draft.trim();
    if (!value || full) return;
    const exists = values.some(
      (item) => item.toLocaleLowerCase("pl") === value.toLocaleLowerCase("pl"),
    );
    if (!exists) onChange([...values, value]);
    setDraft("");
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key !== "Enter") return;
    event.preventDefault();
    add();
  }

  return (
    <div className={cn("space-y-2", className)}>
      <Label htmlFor={id}>
        {label}
        {required ? (
          <span aria-hidden="true" className="text-[var(--danger)]">
            {" "}
            *
          </span>
        ) : null}
      </Label>
      {description ? (
        <p className="text-xs text-[var(--text-muted)]" id={descriptionId}>
          {description}
        </p>
      ) : null}
      {values.length > 0 ? (
        <ul aria-label={label} className="flex flex-wrap gap-2">
          {values.map((value) => (
            <li
              className="inline-flex max-w-full items-center gap-1 rounded-full border border-[var(--border)] bg-[var(--surface-muted)] py-1 pr-1 pl-3 text-xs font-medium text-[var(--text)]"
              key={value}
            >
              <span className="truncate">{value}</span>
              <button
                aria-label={`Usuń: ${value}`}
                className="inline-flex size-6 shrink-0 items-center justify-center rounded-full text-[var(--text-muted)] hover:bg-[var(--surface)] hover:text-[var(--danger)] focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:outline-none"
                onClick={() =>
                  onChange(values.filter((item) => item !== value))
                }
                type="button"
              >
                <X className="size-3.5" aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <ul aria-label={label} className="sr-only" />
      )}
      <div className="flex gap-2">
        <Input
          aria-describedby={
            [descriptionId, errorId].filter(Boolean).join(" ") || undefined
          }
          aria-invalid={error ? true : undefined}
          disabled={full}
          id={id}
          maxLength={maxLength}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={onKeyDown}
          placeholder={full ? "Osiągnięto limit" : placeholder}
          value={draft}
        />
        <Button
          aria-label={`Dodaj: ${label}`}
          disabled={full}
          onClick={add}
          variant="secondary"
        >
          <Plus className="size-4" aria-hidden="true" />
          Dodaj
        </Button>
      </div>
      {error ? (
        <p className={fieldErrorClass} id={errorId} role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export interface ProfilePhotoFieldProps {
  id: string;
  label: string;
  description?: string;
  hint?: string;
  imageUrl: string | null;
  alt?: string;
  shape?: "square" | "portrait";
  pending?: boolean;
  error?: string | null;
  accept?: string;
  onSelect: (file: File) => void;
  onRemove: () => void;
  /** Adds "Dopasuj kadr" for an existing photo (see ImageCropDialog). */
  onAdjust?: () => void;
  className?: string;
}

/** A photo slot: preview plus "change" and "remove" actions. */
export function ProfilePhotoField({
  id,
  label,
  description,
  hint,
  imageUrl,
  alt = "",
  shape = "square",
  pending = false,
  error,
  accept = "image/jpeg,image/png,image/webp",
  onSelect,
  onRemove,
  onAdjust,
  className,
}: ProfilePhotoFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div
      className={cn(
        "rounded-[var(--radius-control)] border border-[var(--border)] p-4",
        className,
      )}
    >
      <p className="text-sm font-semibold text-[var(--text)]">{label}</p>
      {description ? (
        <p className="text-xs text-[var(--text-muted)]">{description}</p>
      ) : null}
      <div className="mt-4 flex items-center gap-4">
        <div
          className={cn(
            "flex shrink-0 items-center justify-center overflow-hidden bg-[var(--surface-muted)] text-[var(--text-subtle)]",
            shape === "square"
              ? "size-24 rounded-full"
              : "aspect-[3/4] w-24 rounded-[var(--radius-control)]",
          )}
        >
          {imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- signed or local object URLs
            <img alt={alt} className="size-full object-cover" src={imageUrl} />
          ) : (
            <UserRound className="size-10" aria-hidden="true" />
          )}
        </div>
        <div className="min-w-0 space-y-2">
          <input
            accept={accept}
            aria-label={`${label}: wybierz plik`}
            className="sr-only"
            disabled={pending}
            id={id}
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) onSelect(file);
              event.target.value = "";
            }}
            ref={inputRef}
            tabIndex={-1}
            type="file"
          />
          <div className="flex flex-wrap gap-2">
            <Button
              aria-label={`${imageUrl ? "Zmień zdjęcie" : "Dodaj zdjęcie"}: ${label}`}
              loading={pending}
              onClick={() => inputRef.current?.click()}
              size="sm"
              variant="secondary"
            >
              {pending ? null : (
                <ImagePlus className="size-4" aria-hidden="true" />
              )}
              {imageUrl ? "Zmień zdjęcie" : "Dodaj zdjęcie"}
            </Button>
            {imageUrl && onAdjust ? (
              <Button
                aria-label={`Dopasuj kadr: ${label}`}
                disabled={pending}
                onClick={onAdjust}
                size="sm"
                variant="outline"
              >
                <Crop className="size-4" aria-hidden="true" />
                Dopasuj kadr
              </Button>
            ) : null}
            {imageUrl ? (
              <Button
                aria-label={`Usuń: ${label}`}
                className="text-[var(--danger)]"
                disabled={pending}
                onClick={onRemove}
                size="sm"
                variant="outline"
              >
                <Trash2 className="size-4" aria-hidden="true" />
                Usuń
              </Button>
            ) : null}
          </div>
          {hint ? (
            <p className="text-xs text-[var(--text-muted)]">{hint}</p>
          ) : null}
        </div>
      </div>
      {error ? (
        <p className={cn(fieldErrorClass, "mt-3")} role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export type ProfileStatus =
  "draft" | "pending_review" | "rejected" | "published";

const statusCopy: Record<
  ProfileStatus,
  { title: string; description: string; icon: LucideIcon; className: string }
> = {
  draft: {
    title: "Masz niewysłane zmiany",
    description:
      "Zmiany są zapisane jako szkic. Wyślij je do akceptacji, aby pojawiły się na stronie.",
    icon: FilePen,
    className: "border-[var(--border-strong)] bg-[var(--surface-muted)]",
  },
  pending_review: {
    title: "Zmiany oczekują na akceptację",
    description:
      "Zespół centrum zweryfikuje je i opublikuje. Do tego czasu nie można ich edytować.",
    icon: Clock3,
    className: "border-[var(--warning)] bg-[var(--warning-soft)]",
  },
  rejected: {
    title: "Zmiany zostały odrzucone",
    description:
      "Popraw profil według komentarza i wyślij go ponownie do akceptacji.",
    icon: CircleAlert,
    className: "border-[var(--danger)] bg-[var(--danger-soft)]",
  },
  published: {
    title: "Profil jest opublikowany",
    description: "Klienci widzą go na stronie Kolor Sensu.",
    icon: CircleCheck,
    className: "border-[var(--success)] bg-[var(--success-soft)]",
  },
};

export interface ProfileStatusBannerProps {
  status: ProfileStatus;
  reviewComment?: string | null;
  className?: string;
}

export function ProfileStatusBanner({
  status,
  reviewComment,
  className,
}: ProfileStatusBannerProps) {
  const copy = statusCopy[status];
  const Icon = copy.icon;

  return (
    <div
      className={cn(
        "flex gap-3 rounded-[var(--radius-surface)] border p-4",
        copy.className,
        className,
      )}
      role="status"
    >
      <Icon
        className="mt-0.5 size-5 shrink-0 text-[var(--text)]"
        aria-hidden="true"
      />
      <div className="min-w-0 space-y-1">
        <p className="text-sm font-semibold text-[var(--text)]">{copy.title}</p>
        <p className="text-sm text-[var(--text-muted)]">{copy.description}</p>
        {status === "rejected" && reviewComment ? (
          <p className="mt-2 rounded-[var(--radius-control)] bg-[var(--surface)] p-3 text-sm whitespace-pre-wrap text-[var(--text)]">
            <span className="font-semibold">Komentarz: </span>
            {reviewComment}
          </p>
        ) : null}
      </div>
    </div>
  );
}

const sectionIcons: Record<string, LucideIcon> = {
  Specjalizacje: Sparkles,
  "Nurty pracy": BookOpen,
  Wykształcenie: GraduationCap,
  Certyfikaty: Award,
  Języki: Globe,
};

export interface SpecialistProfilePreviewProps {
  displayName: string;
  professionalTitle: string | null;
  photoUrl: string | null;
  shortBio: string;
  modalities: string[];
  sections: Array<{ label: string; items: string[] }>;
  className?: string;
}

/** How the profile will look to clients, rendered next to the form. */
export function SpecialistProfilePreview({
  displayName,
  professionalTitle,
  photoUrl,
  shortBio,
  modalities,
  sections,
  className,
}: SpecialistProfilePreviewProps) {
  const filled = sections.filter((section) => section.items.length > 0);

  return (
    <article
      className={cn(
        "rounded-[var(--radius-surface)] border border-[var(--border)] bg-[var(--surface)] p-5",
        className,
      )}
    >
      <div className="flex items-start gap-4">
        <div className="flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[var(--surface-muted)] text-[var(--text-subtle)]">
          {photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- signed or local object URLs
            <img alt="" className="size-full object-cover" src={photoUrl} />
          ) : (
            <UserRound className="size-9" aria-hidden="true" />
          )}
        </div>
        <div className="min-w-0">
          <h3 className="font-heading text-xl leading-tight font-semibold text-[var(--text)]">
            {displayName.trim() || "Imię i nazwisko"}
          </h3>
          {professionalTitle ? (
            <p className="mt-0.5 text-sm text-[var(--text-muted)]">
              {professionalTitle}
            </p>
          ) : null}
          {modalities.length > 0 ? (
            <ul className="mt-2 flex flex-wrap gap-1.5">
              {modalities.map((modality) => (
                <li key={modality}>
                  <Badge variant="success">{modality}</Badge>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </div>
      <p className="mt-4 text-sm leading-relaxed whitespace-pre-wrap text-[var(--text)]">
        {shortBio.trim() || (
          <span className="text-[var(--text-muted)]">
            Tu pojawi się krótki opis.
          </span>
        )}
      </p>
      {filled.length > 0 ? (
        <dl className="mt-4 divide-y divide-[var(--border)] border-t border-[var(--border)]">
          {filled.map((section) => {
            const Icon = sectionIcons[section.label] ?? Sparkles;
            return (
              <div
                className="grid grid-cols-[1.25rem_7.5rem_1fr] gap-2 py-3 text-sm"
                key={section.label}
              >
                <Icon
                  className="mt-0.5 size-4 text-[var(--primary)]"
                  aria-hidden="true"
                />
                <dt className="font-medium text-[var(--text-muted)]">
                  {section.label}
                </dt>
                <dd className="min-w-0 text-[var(--text)]">
                  <ul>
                    {section.items.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </dd>
              </div>
            );
          })}
        </dl>
      ) : null}
    </article>
  );
}
