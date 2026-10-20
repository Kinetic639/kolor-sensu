"use client";

import { Cookie } from "lucide-react";
import { PageLink as Link } from "./page-link";
import { useEffect, useRef, useState } from "react";
import { cn } from "../lib/utils";
import { PrimaryButton, SecondaryButton } from "./actions";

// The cookie notice: a small card in the lower corner, not a wall over the
// page. It only renders on the client and only until the visitor chooses,
// so it never shifts the layout or blocks the first paint. The choice is
// kept in localStorage; the app reads it (onChoice) before loading any
// analytics. While it shows, the page keeps what the keyboard focuses
// clear of it (scroll-padding-bottom: WCAG 2.4.11, focus not obscured).

export type CookieChoice = "all" | "necessary";

/** Where the choice is kept, and the event that tells the page it changed. */
export const COOKIE_CONSENT_KEY = "ks-cookie-consent";
export const COOKIE_CONSENT_EVENT = "ks-cookie-consent";

/** The visitor's stored choice, if any (null where storage is blocked). */
export function readCookieChoice(
  key = COOKIE_CONSENT_KEY,
): CookieChoice | null {
  try {
    const value = window.localStorage.getItem(key);
    return value === "all" || value === "necessary" ? value : null;
  } catch {
    return null;
  }
}

export interface CookieConsentProps {
  policyHref?: string;
  storageKey?: string;
  /** Show it even if a choice is stored (Storybook). */
  forceOpen?: boolean;
  onChoice?: (choice: CookieChoice) => void;
  className?: string;
}

export function CookieConsent({
  policyHref = "/cookies",
  storageKey = COOKIE_CONSENT_KEY,
  forceOpen = false,
  onChoice,
  className,
}: CookieConsentProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    if (forceOpen || !readCookieChoice(storageKey)) setOpen(true);
  }, [forceOpen, storageKey]);

  // A focused element is scrolled above the notice, never under it.
  useEffect(() => {
    const notice = ref.current;
    if (!open || !notice) return;
    const root = document.documentElement;
    const keepClear = () => {
      root.style.scrollPaddingBottom = `${notice.offsetHeight + 24}px`;
    };
    keepClear();
    const observer =
      typeof ResizeObserver === "function"
        ? new ResizeObserver(keepClear)
        : null;
    observer?.observe(notice);
    return () => {
      observer?.disconnect();
      root.style.removeProperty("scroll-padding-bottom");
      if (root.getAttribute("style") === "") root.removeAttribute("style");
    };
  }, [open]);

  if (!open) return null;

  const choose = (choice: CookieChoice) => {
    try {
      window.localStorage.setItem(storageKey, choice);
    } catch {
      // Private mode: the choice holds for this visit only.
    }
    onChoice?.(choice);
    // What waits for consent (the map on Kontakt) hears it at once.
    window.dispatchEvent(
      new CustomEvent<CookieChoice>(COOKIE_CONSENT_EVENT, { detail: choice }),
    );
    setOpen(false);
  };

  return (
    <section
      ref={ref}
      aria-label="Pliki cookies"
      className={cn(
        "rounded-card-lg border-border/70 bg-surface shadow-card-hover fixed inset-x-3 bottom-3 z-50 grid gap-4 border p-5 sm:right-auto sm:bottom-5 sm:left-5 sm:max-w-sm",
        className,
      )}
    >
      <div className="flex gap-3">
        <Cookie
          className="text-primary mt-0.5 size-5 shrink-0"
          strokeWidth={1.5}
          aria-hidden="true"
        />
        <div className="grid gap-1.5">
          <h2 className="text-title text-ink">Szanujemy Twoją prywatność</h2>
          <p className="text-small text-text-muted">
            Używamy niezbędnych plików cookies, a za Twoją zgodą także
            analitycznych, by lepiej rozumieć, jak korzystasz ze strony, oraz
            mapy Google na stronie Kontakt.{" "}
            <Link
              href={policyHref}
              className="text-ink underline underline-offset-4 hover:no-underline"
            >
              Polityka cookies
            </Link>
          </p>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <PrimaryButton size="sm" onClick={() => choose("all")}>
          Akceptuję wszystkie
        </PrimaryButton>
        <SecondaryButton size="sm" onClick={() => choose("necessary")}>
          Tylko niezbędne
        </SecondaryButton>
      </div>
    </section>
  );
}
