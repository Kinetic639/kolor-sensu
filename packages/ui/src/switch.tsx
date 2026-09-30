"use client";

import * as SwitchPrimitive from "@radix-ui/react-switch";
import type { ComponentProps } from "react";
import { cn } from "./lib/utils";

export function Switch({
  className,
  size = "md",
  ...props
}: ComponentProps<typeof SwitchPrimitive.Root> & {
  /** `sm`: a compact switch for dense toolbars. */
  size?: "md" | "sm";
}) {
  const small = size === "sm";
  return (
    <SwitchPrimitive.Root
      className={cn(
        "peer inline-flex shrink-0 cursor-pointer items-center rounded-full border border-[var(--border)] bg-[var(--surface-muted)] transition-colors outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:border-[var(--primary)] data-[state=checked]:bg-[var(--primary)]",
        small ? "h-4 w-7" : "h-6 w-11",
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        className={cn(
          "pointer-events-none block rounded-full bg-[var(--surface)] shadow-sm transition-transform data-[state=unchecked]:translate-x-0",
          small
            ? "size-3 data-[state=checked]:translate-x-3"
            : "size-5 data-[state=checked]:translate-x-5",
        )}
      />
    </SwitchPrimitive.Root>
  );
}
