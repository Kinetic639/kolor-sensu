import { Input } from "@repo/ui/input";
import { Label } from "@repo/ui/label";
import { cn } from "@repo/ui/lib/utils";
import { Textarea } from "@repo/ui/textarea";

// A labelled text field for the CMS's list-like forms, which keep their
// draft in state (the hero, the story, the thoughts): marked invalid when
// the draft's check flags it, with an optional hint under it.

export function TextField({
  id,
  label,
  value,
  onChange,
  maxLength,
  multiline = false,
  rows = 2,
  invalid = false,
  hint,
  className,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  maxLength: number;
  multiline?: boolean;
  rows?: number;
  invalid?: boolean;
  hint?: string;
  className?: string;
}) {
  const hintId = hint ? `${id}-hint` : undefined;
  const shared = {
    id,
    maxLength,
    value,
    "aria-invalid": invalid ? true : undefined,
    "aria-describedby": hintId,
  } as const;
  return (
    <div className={cn("grid content-start gap-1.5", className)}>
      <Label htmlFor={id}>{label}</Label>
      {multiline ? (
        <Textarea
          {...shared}
          onChange={(event) => onChange(event.target.value)}
          rows={rows}
        />
      ) : (
        <Input {...shared} onChange={(event) => onChange(event.target.value)} />
      )}
      {hint ? (
        <p className="text-[0.75rem] text-[var(--text-muted)]" id={hintId}>
          {hint}
        </p>
      ) : null}
    </div>
  );
}
