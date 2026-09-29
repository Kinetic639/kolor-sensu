import {
  useId,
  type InputHTMLAttributes,
  type TextareaHTMLAttributes,
} from "react";
import { cn } from "../lib/utils";
import { PageLink as Link } from "../public-site/page-link";

// Form fields of the booking wizard (the "Dane" step), in the public
// site's style: a visible label, the error and hint tied to the field for
// screen readers, native validation kept.

const control =
  "text-body text-ink bg-surface border-border-strong rounded-card-sm placeholder:text-text-muted/70 focus-visible:outline-ring w-full border px-4 py-3 focus-visible:outline-2 focus-visible:outline-offset-1 aria-invalid:border-pink-strong";

type FieldProps = {
  label: string;
  name: string;
  error?: string;
  hint?: string;
} & (
  | ({ multiline?: false } & InputHTMLAttributes<HTMLInputElement>)
  | ({ multiline: true } & TextareaHTMLAttributes<HTMLTextAreaElement>)
);

export function BookingField({
  label,
  error,
  hint,
  className,
  multiline,
  ...rest
}: FieldProps) {
  const id = useId();
  const errorId = `${id}-error`;
  const hintId = `${id}-hint`;
  const describedBy =
    [error ? errorId : null, hint ? hintId : null].filter(Boolean).join(" ") ||
    undefined;
  const shared = {
    id,
    "aria-invalid": error ? true : undefined,
    "aria-describedby": describedBy,
    className: cn(control, className),
  };

  return (
    <div className="grid gap-1.5">
      <label className="text-small text-ink font-semibold" htmlFor={id}>
        {label}
      </label>
      {multiline ? (
        <textarea
          rows={4}
          {...(rest as TextareaHTMLAttributes<HTMLTextAreaElement>)}
          {...shared}
        />
      ) : (
        <input
          {...(rest as InputHTMLAttributes<HTMLInputElement>)}
          {...shared}
        />
      )}
      {error ? (
        <p className="text-small text-pink-strong" id={errorId}>
          {error}
        </p>
      ) : null}
      {hint ? (
        <p className="text-small text-text-muted" id={hintId}>
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export interface ConsentCheckboxProps {
  name: string;
  /** Before the link: "Akceptuję". */
  text: string;
  linkLabel: string;
  linkHref: string;
  defaultChecked?: boolean;
  error?: string;
}

export function ConsentCheckbox({
  name,
  text,
  linkLabel,
  linkHref,
  defaultChecked,
  error,
}: ConsentCheckboxProps) {
  const id = useId();
  const errorId = `${id}-error`;
  return (
    <div className="grid gap-1">
      <div className="flex items-start gap-3">
        <input
          aria-describedby={error ? errorId : undefined}
          aria-invalid={error ? true : undefined}
          className="accent-primary mt-1 size-5 shrink-0"
          defaultChecked={defaultChecked}
          id={id}
          name={name}
          required
          type="checkbox"
        />
        <label className="text-small text-ink" htmlFor={id}>
          {text}{" "}
          <Link
            className="text-primary-strong font-semibold underline underline-offset-4"
            href={linkHref}
            target="_blank"
          >
            {linkLabel}
          </Link>
        </label>
      </div>
      {error ? (
        <p className="text-small text-pink-strong pl-8" id={errorId}>
          {error}
        </p>
      ) : null}
    </div>
  );
}
