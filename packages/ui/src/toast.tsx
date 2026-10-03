"use client";

import { CircleAlert, CircleCheck, Info, TriangleAlert, X } from "lucide-react";
import type { CSSProperties, ReactNode } from "react";
import {
  toast as toastify,
  type Id,
  type ToastContentProps,
} from "react-toastify";
import { cn } from "./lib/utils";

// The portals' toasts (react-toastify underneath, shown by <AppToaster />):
// a short card in the style of the notifications panel. What happened,
// in a line; a line of detail under it; an action ("Otwórz") and a close
// button; a thin bar showing how long it stays, stopped while the pointer
// is on it. An error is an alert, everything else a status.

export type ToastTone = "success" | "error" | "warning" | "info";

export interface ToastOptions {
  /** The line under the title. */
  description?: ReactNode;
  /** Small context icons after the title (as in the notifications). */
  meta?: ReactNode;
  /** The icon in its tone's square (default: the tone's own). */
  icon?: ReactNode;
  /** A button: what it says and does; it closes the toast. */
  action?: { label: string; onClick: () => void };
  /** How long it stays, in ms (default 6 s; errors 10 s). */
  duration?: number;
  /** One toast per id: showing it again replaces it. */
  id?: Id;
}

const TONES: Record<
  ToastTone,
  { icon: ReactNode; square: string; bar: string }
> = {
  success: {
    icon: <CircleCheck aria-hidden="true" />,
    square: "bg-[var(--success-soft)] text-[var(--success)]",
    bar: "bg-[var(--success)]",
  },
  error: {
    icon: <CircleAlert aria-hidden="true" />,
    square: "bg-[var(--danger-soft)] text-[var(--danger)]",
    bar: "bg-[var(--danger)]",
  },
  warning: {
    icon: <TriangleAlert aria-hidden="true" />,
    square: "bg-[var(--warning-soft)] text-[var(--warning)]",
    bar: "bg-[var(--warning)]",
  },
  info: {
    icon: <Info aria-hidden="true" />,
    square: "bg-[var(--info-soft)] text-[var(--info)]",
    bar: "bg-[var(--info)]",
  },
};

interface CardData extends ToastOptions {
  tone: ToastTone;
  title: ReactNode;
  duration: number;
}

function ToastCard({
  closeToast,
  isPaused,
  data,
}: ToastContentProps<CardData>) {
  const tone = TONES[data.tone];
  return (
    <div className="grid w-full grid-cols-[20px_minmax(0,1fr)_auto] gap-x-2 gap-y-px">
      <span
        className={cn(
          "row-span-2 mt-px grid size-5 place-items-center rounded-[5px] [&_svg]:size-3",
          tone.square,
        )}
      >
        {data.icon ?? tone.icon}
      </span>
      <span className="flex h-[18px] min-w-0 items-center gap-1.5">
        <span className="truncate text-[0.78125rem] font-semibold text-[var(--text)]">
          {data.title}
        </span>
        {data.meta}
      </span>
      <span className="row-span-2 flex items-center gap-0.5 self-center">
        {data.action ? (
          <button
            className="inline-flex h-6 items-center rounded-[5px] border border-[var(--border)] bg-[var(--surface)] px-2 text-[0.75rem] font-medium text-[var(--text)] hover:bg-[var(--surface-muted)] focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:outline-none"
            onClick={() => {
              data.action!.onClick();
              closeToast();
            }}
            type="button"
          >
            {data.action.label}
          </button>
        ) : null}
        <button
          aria-label="Zamknij powiadomienie"
          className="inline-grid size-6 place-items-center rounded-[5px] text-[var(--text-muted)] hover:bg-[var(--surface-muted)] hover:text-[var(--text)] focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:outline-none"
          onClick={() => closeToast()}
          type="button"
        >
          <X aria-hidden="true" className="size-3.5" />
        </button>
      </span>
      {data.description ? (
        <span className="truncate text-[0.75rem] text-[var(--text-muted)]">
          {data.description}
        </span>
      ) : (
        <span aria-hidden="true" />
      )}
      {/* How long it stays; stopped while the pointer is on it. */}
      <span className="col-span-3 mt-1.5 block h-0.5 overflow-hidden rounded-full bg-[var(--surface-muted)]">
        <span
          className={cn(
            "block h-full origin-left animate-[ks-toast-time_var(--ks-toast-time)_linear_forwards] motion-reduce:opacity-0",
            tone.bar,
          )}
          onAnimationEnd={() => closeToast()}
          style={
            {
              "--ks-toast-time": `${data.duration}ms`,
              animationPlayState: isPaused ? "paused" : "running",
            } as CSSProperties
          }
        />
      </span>
    </div>
  );
}

function show(tone: ToastTone, title: ReactNode, options: ToastOptions = {}) {
  const duration = options.duration ?? (tone === "error" ? 10_000 : 6_000);
  return toastify<CardData>(ToastCard, {
    data: { ...options, tone, title, duration },
    toastId: options.id,
    role: tone === "error" ? "alert" : "status",
    // The card's own bar closes it (it stops while hovered).
    autoClose: false,
    customProgressBar: true,
    closeButton: false,
    icon: false,
  });
}

type Show = (title: ReactNode, options?: ToastOptions) => Id;

export const toast: Show & {
  success: Show;
  error: Show;
  warning: Show;
  info: Show;
  dismiss: (id?: Id) => void;
} = Object.assign(
  (title: ReactNode, options?: ToastOptions) => show("info", title, options),
  {
    success: (title: ReactNode, options?: ToastOptions) =>
      show("success", title, options),
    error: (title: ReactNode, options?: ToastOptions) =>
      show("error", title, options),
    warning: (title: ReactNode, options?: ToastOptions) =>
      show("warning", title, options),
    info: (title: ReactNode, options?: ToastOptions) =>
      show("info", title, options),
    dismiss: (id?: Id) => {
      toastify.dismiss(id);
    },
  },
);
