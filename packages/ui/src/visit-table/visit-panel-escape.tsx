"use client";

import type { Route } from "next";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

/** Escape closes the side panel (unless a dialog or menu is open). */
export function ClosePanelOnEscape({ href }: { href: string }) {
  const router = useRouter();
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || event.defaultPrevented) return;
      if (
        document.querySelector(
          "[role='dialog'], [role='alertdialog'], [role='menu']",
        )
      ) {
        return;
      }
      router.push(href as Route, { scroll: false });
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [href, router]);
  return null;
}
