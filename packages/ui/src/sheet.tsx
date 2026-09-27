"use client";

import * as DialogPrimitive from "@radix-ui/react-dialog";
import { cva, type VariantProps } from "class-variance-authority";
import { X } from "lucide-react";
import type { ComponentProps } from "react";
import { cn } from "./lib/utils";

export const Sheet = DialogPrimitive.Root;
export const SheetTrigger = DialogPrimitive.Trigger;
export const SheetClose = DialogPrimitive.Close;

const sheetVariants = cva(
  "fixed z-50 overflow-y-auto bg-[var(--surface)] p-6 text-[var(--text)] shadow-[var(--shadow-overlay)] outline-none",
  {
    variants: {
      side: {
        top: "inset-x-0 top-0 max-h-[92vh] rounded-b-[var(--radius-panel)] border-b border-[var(--border)]",
        bottom:
          "inset-x-0 bottom-0 max-h-[92vh] rounded-t-[var(--radius-panel)] border-t border-[var(--border)]",
        left: "inset-y-0 left-0 h-full w-3/4 border-r border-[var(--border)] sm:max-w-sm",
        right:
          "inset-y-0 right-0 h-full w-full border-l border-[var(--border)] sm:max-w-md",
      },
    },
    defaultVariants: {
      side: "right",
    },
  },
);

export interface SheetContentProps
  extends
    ComponentProps<typeof DialogPrimitive.Content>,
    VariantProps<typeof sheetVariants> {
  /** Classes for the dimmed overlay behind the sheet. */
  overlayClassName?: string;
}

export function SheetContent({
  side,
  className,
  overlayClassName,
  children,
  ...props
}: SheetContentProps) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay
        className={cn(
          "fixed inset-0 z-50 bg-[color-mix(in_srgb,var(--text)_42%,transparent)] backdrop-blur-[2px]",
          overlayClassName,
        )}
      />
      <DialogPrimitive.Content
        className={cn(sheetVariants({ side }), className)}
        {...props}
      >
        {children}
        <DialogPrimitive.Close className="absolute top-4 right-4 rounded-[var(--radius-control)] p-1 text-[var(--text-muted)] hover:text-[var(--text)] focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:outline-none">
          <X className="size-4" aria-hidden="true" />
          <span className="sr-only">Zamknij</span>
        </DialogPrimitive.Close>
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}

export function SheetHeader({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("grid gap-1.5", className)} {...props} />;
}

export function SheetTitle({
  className,
  ...props
}: ComponentProps<typeof DialogPrimitive.Title>) {
  return (
    <DialogPrimitive.Title
      className={cn(
        "font-heading text-2xl leading-tight font-semibold text-[var(--text)]",
        className,
      )}
      {...props}
    />
  );
}

export function SheetDescription({
  className,
  ...props
}: ComponentProps<typeof DialogPrimitive.Description>) {
  return (
    <DialogPrimitive.Description
      className={cn(
        "text-sm leading-relaxed text-[var(--text-muted)]",
        className,
      )}
      {...props}
    />
  );
}
