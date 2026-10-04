"use client";

import { Button } from "@repo/ui/button";
import { Input } from "@repo/ui/input";
import { Label } from "@repo/ui/label";
import { Switch } from "@repo/ui/switch";
import { Textarea } from "@repo/ui/textarea";
import type { ReactNode } from "react";
import type { Path, UseFormRegisterReturn } from "react-hook-form";

// Ustawienia's fields, in the portal's compact language: a label, the
// field, under it its hint or (in its place) what is wrong.

/**
 * A field's registration with its saved value: `register` alone sets it
 * only once the page runs in the browser, so until then (the server's
 * HTML) the fields would look empty.
 */
export function withValue<T extends Record<string, unknown>>(
  register: (name: Path<T>) => UseFormRegisterReturn,
  defaults: T,
) {
  return (name: Path<T>) => ({
    ...register(name),
    defaultValue: defaults[name] as string | number,
  });
}

export function Field({
  id,
  label,
  error,
  hint,
  registration,
  multiline = false,
  className,
  ...inputProps
}: {
  id: string;
  label: ReactNode;
  error?: string;
  hint?: ReactNode;
  /** `withValue(register, defaults)`: the value in the server's HTML too. */
  registration: UseFormRegisterReturn & { defaultValue?: string | number };
  multiline?: boolean;
  className?: string;
  type?: string;
  inputMode?: "email" | "tel" | "url" | "numeric";
  placeholder?: string;
  min?: number;
  max?: number;
}) {
  const note = error ?? hint;
  const shared = {
    "aria-describedby": note ? `${id}-note` : undefined,
    "aria-invalid": error ? true : undefined,
    id,
    ...registration,
  };
  return (
    <div className={`grid content-start gap-1.5 ${className ?? ""}`}>
      <Label htmlFor={id}>{label}</Label>
      {multiline ? (
        <Textarea rows={3} {...shared} />
      ) : (
        <Input {...inputProps} {...shared} />
      )}
      {note ? (
        <p
          className={
            error
              ? "text-[0.75rem] text-[var(--danger)]"
              : "text-[0.75rem] text-[var(--text-muted)]"
          }
          id={`${id}-note`}
        >
          {note}
        </p>
      ) : null}
    </div>
  );
}

/** A switch on its own row: what it does, under it what that means. */
export function SwitchRow({
  label,
  description,
  checked,
  disabled,
  onCheckedChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  disabled?: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <label className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-0.5 border-b border-[color-mix(in_srgb,var(--border)_60%,transparent)] px-3.5 py-2.5">
      <span className="text-[0.8125rem] font-semibold text-[var(--text)]">
        {label}
      </span>
      <Switch
        aria-label={label}
        checked={checked}
        className="row-span-2"
        disabled={disabled}
        onCheckedChange={onCheckedChange}
        size="sm"
      />
      <span className="text-[0.75rem] text-[var(--text-muted)]">
        {description}
      </span>
    </label>
  );
}

/** A form's save, at its end on the right. */
export function SaveRow({
  dirty,
  pending,
  children = "Zapisz",
}: {
  dirty: boolean;
  pending: boolean;
  children?: ReactNode;
}) {
  return (
    <div className="flex items-center justify-end gap-3 sm:col-span-full">
      {dirty ? (
        <span className="text-[0.75rem] text-[var(--text-muted)]">
          Niezapisane zmiany
        </span>
      ) : null}
      <Button
        className="h-7 px-2.5 text-[0.8125rem]"
        disabled={!dirty}
        loading={pending}
        size="sm"
        type="submit"
      >
        {children}
      </Button>
    </div>
  );
}
