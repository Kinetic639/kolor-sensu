"use client";

import {
  Slide,
  ToastContainer,
  type ToastContainerProps,
} from "react-toastify";

// Where the portals' toasts appear (see ./toast): at the top, in the
// middle, the newest first, at most four at once. Each toast is our own
// card; the library only places and animates it.

export type AppToasterProps = Partial<ToastContainerProps>;

export function AppToaster(props: AppToasterProps) {
  return (
    <ToastContainer
      closeButton={false}
      closeOnClick={false}
      draggable="touch"
      hideProgressBar
      icon={false}
      limit={4}
      newestOnTop
      position="top-center"
      style={{ width: "min(400px, calc(100vw - 2rem))" }}
      toastClassName={() =>
        "relative mb-2 flex w-full overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--surface)] p-2.5 pr-2 font-sans text-[var(--text)] shadow-[var(--shadow-overlay)]"
      }
      transition={Slide}
      {...props}
    />
  );
}
