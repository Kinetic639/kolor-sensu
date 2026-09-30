"use client";

import { Check, Copy } from "lucide-react";
import { useState, type ReactNode } from "react";
import { cn } from "./lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./tooltip";

// Small icon buttons with a tooltip (a panel's toolbar, a phone number's
// "call" and "copy"): the name is the tooltip and the accessible name.

const CLASSES = {
  base: "inline-flex size-8 shrink-0 items-center justify-center rounded-[var(--radius-control)] text-[var(--text-muted)] transition-colors hover:bg-[var(--surface-muted)] hover:text-[var(--text)] focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:outline-none disabled:pointer-events-none disabled:opacity-40 [&_svg]:size-4",
  destructive:
    "hover:bg-[var(--danger-soft)] hover:text-[var(--danger)] focus-visible:text-[var(--danger)]",
};

function WithTooltip({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>{children}</TooltipTrigger>
        <TooltipContent>{label}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

/** An icon link (`tel:`, `mailto:`, a page). */
export function IconLink({
  label,
  href,
  icon,
}: {
  label: string;
  href: string;
  icon: ReactNode;
}) {
  return (
    <WithTooltip label={label}>
      <a aria-label={label} className={CLASSES.base} href={href}>
        {icon}
      </a>
    </WithTooltip>
  );
}

/** An icon button doing something (e.g. opening a confirmation). */
export function IconButton({
  label,
  icon,
  onClick,
  destructive = false,
  disabled = false,
}: {
  label: string;
  icon: ReactNode;
  onClick: () => void;
  destructive?: boolean;
  disabled?: boolean;
}) {
  return (
    <WithTooltip label={label}>
      <button
        aria-label={label}
        className={cn(CLASSES.base, destructive && CLASSES.destructive)}
        disabled={disabled}
        onClick={onClick}
        type="button"
      >
        {icon}
      </button>
    </WithTooltip>
  );
}

/** Copies a value (a number, an e-mail, a reference); says so for a while. */
export function CopyButton({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <IconButton
      icon={copied ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
      label={copied ? "Skopiowano" : label}
      onClick={() => {
        void navigator.clipboard?.writeText(value).then(() => {
          setCopied(true);
          window.setTimeout(() => setCopied(false), 1500);
        });
      }}
    />
  );
}
