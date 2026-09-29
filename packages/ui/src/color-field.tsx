"use client";

import {
  COLOR_PALETTE,
  hexColorSchema,
  isReadableOnLight,
  type PaletteColor,
} from "@repo/contracts/colors";
import { Check, Sparkles } from "lucide-react";
import { useEffect, useId, useState, type CSSProperties } from "react";
import { Input } from "./input";
import { cn } from "./lib/utils";

export { resourceColors } from "./resource-colors";

// Colours that tell rooms and specialists apart (schedules, lists): a dot,
// a ready palette, and a field with the palette, the system colour picker
// and a code typed by hand. `null` is the automatic colour, by position.

const SWATCH_SIZES = { sm: "size-2.5", md: "size-4", lg: "size-7" } as const;

/** A coloured dot; with a label it stands for the colour on its own. */
export function ColorSwatch({
  color,
  label,
  size = "md",
  className,
}: {
  /** Any CSS colour, e.g. `#2f5fa7` or `var(--resource-1)`. */
  color: string;
  label?: string;
  size?: keyof typeof SWATCH_SIZES;
  className?: string;
}) {
  return (
    <span
      aria-hidden={label ? undefined : true}
      aria-label={label}
      className={cn(
        "inline-block shrink-0 rounded-full ring-1 ring-[color-mix(in_srgb,var(--text)_12%,transparent)]",
        SWATCH_SIZES[size],
        className,
      )}
      role={label ? "img" : undefined}
      style={{ backgroundColor: color }}
    />
  );
}

/** Every automatic colour at once: a choice made for you. */
const AUTOMATIC_BACKGROUND =
  "conic-gradient(var(--resource-1), var(--resource-2), var(--resource-3), var(--resource-4), var(--resource-5), var(--resource-6), var(--resource-1))";

function SwatchRadio({
  name,
  color,
  label,
  checked,
  onSelect,
  children,
}: {
  name: string;
  /** A CSS background: a colour, or a gradient. */
  color: string;
  label: string;
  checked: boolean;
  onSelect: () => void;
  children?: React.ReactNode;
}) {
  return (
    <label
      className="group relative inline-flex cursor-pointer items-center"
      title={label}
    >
      <input
        checked={checked}
        className="peer sr-only"
        name={name}
        onChange={onSelect}
        type="radio"
      />
      <span className="sr-only">{label}</span>
      <span
        aria-hidden="true"
        className={cn(
          "flex size-9 items-center justify-center rounded-full ring-1 ring-[color-mix(in_srgb,var(--text)_12%,transparent)] transition-shadow",
          "peer-focus-visible:ring-2 peer-focus-visible:ring-[var(--ring)] peer-focus-visible:ring-offset-2",
          checked &&
            "ring-2 ring-[var(--text)] ring-offset-2 ring-offset-[var(--surface)]",
        )}
        style={{ background: color } as CSSProperties}
      >
        {children ?? (checked ? <Check className="size-4 text-white" /> : null)}
      </span>
    </label>
  );
}

/** The ready colours as a group of choices (one of them, or none). */
export function ColorPalette({
  label,
  value,
  onChange,
  colors = COLOR_PALETTE,
  className,
}: {
  label: string;
  value: string | null;
  onChange: (value: string) => void;
  colors?: PaletteColor[];
  className?: string;
}) {
  const name = useId();
  return (
    <fieldset className={cn("grid gap-2", className)}>
      <legend className="mb-2 text-sm font-semibold text-[var(--text)]">
        {label}
      </legend>
      <div className="flex flex-wrap gap-2">
        {colors.map((color) => (
          <SwatchRadio
            checked={value === color.value}
            color={color.value}
            key={color.value}
            label={color.label}
            name={name}
            onSelect={() => onChange(color.value)}
          />
        ))}
      </div>
    </fieldset>
  );
}

export interface ColorFieldProps {
  label: string;
  /** `#rrggbb`, or null for the automatic colour. */
  value: string | null;
  onChange: (value: string | null) => void;
  /** The colour "automatic" gives now (e.g. `var(--resource-2)`), shown as a hint. */
  automaticColor?: string;
  description?: string;
  disabled?: boolean;
  className?: string;
}

/**
 * A colour: automatic, one of the palette, or any other (the system
 * picker or a code typed by hand). Warns when it is hard to see on white.
 */
export function ColorField({
  label,
  value,
  onChange,
  automaticColor,
  description,
  disabled,
  className,
}: ColorFieldProps) {
  const name = useId();
  const codeId = useId();
  const errorId = useId();
  const [code, setCode] = useState(value ?? "");
  const [codeError, setCodeError] = useState<string | null>(null);

  // A colour chosen elsewhere (palette, picker, automatic) shows as code.
  useEffect(() => {
    setCode(value ?? "");
    setCodeError(null);
  }, [value]);

  const custom =
    value !== null && !COLOR_PALETTE.some((color) => color.value === value);
  const lowContrast = value !== null && !isReadableOnLight(value);

  // A full code is taken while typing; a short one (#abc) on leaving the
  // field, so the field does not jump mid-way.
  function typed(text: string) {
    setCode(text);
    if (/^#?[0-9a-f]{6}$/i.test(text.trim())) {
      setCodeError(null);
      onChange(hexColorSchema.parse(text));
    }
  }

  function left() {
    if (!code) return setCodeError(null);
    const parsed = hexColorSchema.safeParse(code);
    if (!parsed.success) return setCodeError("Podaj kolor w formacie #RRGGBB.");
    setCodeError(null);
    if (parsed.data !== value) onChange(parsed.data);
  }

  return (
    <fieldset className={cn("grid gap-4", className)} disabled={disabled}>
      <legend className="mb-1 text-sm font-semibold text-[var(--text)]">
        {label}
      </legend>
      {description ? (
        <p className="-mt-2 text-xs text-[var(--text-muted)]">{description}</p>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        <SwatchRadio
          checked={value === null}
          color={AUTOMATIC_BACKGROUND}
          label="Automatycznie"
          name={name}
          onSelect={() => onChange(null)}
        >
          <Sparkles className="size-4 text-white drop-shadow-[0_1px_1px_rgb(0_0_0/0.45)]" />
        </SwatchRadio>
        <span aria-hidden="true" className="mx-1 h-6 w-px bg-[var(--border)]" />
        {COLOR_PALETTE.map((color) => (
          <SwatchRadio
            checked={value === color.value}
            color={color.value}
            key={color.value}
            label={color.label}
            name={name}
            onSelect={() => onChange(color.value)}
          />
        ))}
      </div>

      {value === null && automaticColor ? (
        <p className="-mt-1 flex items-center gap-1.5 text-xs text-[var(--text-muted)]">
          Teraz przypisany automatycznie:
          <ColorSwatch color={automaticColor} size="sm" />
        </p>
      ) : null}

      <div className="grid gap-1.5">
        <p className="text-xs font-medium text-[var(--text-muted)]">
          Własny kolor{custom ? " (wybrany)" : ""}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <input
            aria-label="Wybierz dowolny kolor"
            className="size-10 cursor-pointer rounded-[var(--radius-control)] border border-[var(--border)] bg-[var(--surface)] p-1"
            onChange={(event) => onChange(event.target.value.toLowerCase())}
            type="color"
            value={value ?? COLOR_PALETTE[0]!.value}
          />
          <label className="sr-only" htmlFor={codeId}>
            Kod koloru
          </label>
          <Input
            aria-describedby={codeError ? errorId : undefined}
            aria-invalid={codeError ? true : undefined}
            autoComplete="off"
            className="w-32 font-mono uppercase"
            id={codeId}
            maxLength={7}
            onBlur={left}
            onChange={(event) => typed(event.target.value)}
            placeholder="#RRGGBB"
            spellCheck={false}
            value={code}
          />
          {value ? <ColorSwatch color={value} size="lg" /> : null}
        </div>
        {codeError ? (
          <p className="text-xs text-[var(--danger)]" id={errorId}>
            {codeError}
          </p>
        ) : null}
        {lowContrast ? (
          <p
            className="text-xs font-medium text-[var(--warning-foreground)]"
            role="alert"
          >
            Ten kolor może być słabo widoczny na jasnym tle. Wybierz ciemniejszy
            odcień albo kolor z palety.
          </p>
        ) : null}
      </div>
    </fieldset>
  );
}
