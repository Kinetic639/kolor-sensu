"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { useRef, type ReactNode } from "react";
import { IconButton } from "../icon-action";
import { useSummaryOpen } from "./schedule-controls";

// The week's summary, as a drawer over the calendar (as the notifications
// are): opened with the "Podsumowanie" button in the toolbar, closed with
// its own button, Escape or a click beside it. Its content comes rendered
// from the server; whether it is open lives in the address.

export function SummaryDrawer({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string | null;
  children: ReactNode;
}) {
  const [open, setOpen] = useSummaryOpen();
  const drawer = useRef<HTMLDivElement>(null);
  return (
    <Dialog.Root onOpenChange={setOpen} open={open}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-[color-mix(in_srgb,var(--text)_28%,transparent)] backdrop-blur-[2px] data-[state=closed]:animate-[ks-fade-out_160ms_ease-in_forwards] data-[state=open]:animate-[ks-fade-in_200ms_ease-out] motion-reduce:animate-none" />
        <Dialog.Content
          aria-describedby={undefined}
          className="fixed inset-y-0 right-0 z-50 flex w-full max-w-[400px] flex-col border-l border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-overlay)] outline-none data-[state=closed]:animate-[ks-drawer-out_180ms_ease-in_forwards] data-[state=open]:animate-[ks-drawer-in_240ms_cubic-bezier(0.2,0.8,0.2,1)] motion-reduce:animate-none"
          // The drawer itself takes the focus, not its first button (whose
          // tooltip would show unasked).
          onOpenAutoFocus={(event) => {
            event.preventDefault();
            drawer.current?.focus();
          }}
          ref={drawer}
        >
          <header className="flex h-11 shrink-0 items-center gap-1.5 border-b border-[var(--border)] pr-1.5 pl-3">
            <Dialog.Title className="truncate text-[0.9375rem] font-semibold text-[var(--text)]">
              {title}
            </Dialog.Title>
            {subtitle ? (
              <span className="truncate text-[0.8125rem] text-[var(--text-muted)]">
                {subtitle}
              </span>
            ) : null}
            <span className="ml-auto">
              <IconButton
                icon={<X aria-hidden="true" />}
                label="Zamknij podsumowanie"
                onClick={() => setOpen(false)}
              />
            </span>
          </header>
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
            {children}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
