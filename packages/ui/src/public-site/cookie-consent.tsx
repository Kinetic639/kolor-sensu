"use client";

import { Cookie } from "lucide-react";
import { PageLink as Link } from "./page-link";
import { useEffect, useId, useRef, useState } from "react";
import { cn } from "../lib/utils";
import { SecondaryButton } from "./actions";

// The cookie notice: a small card in the lower right corner, not a wall over the
// page. It only renders on the client and only until the visitor chooses,
// so it never shifts the layout or blocks the first paint.
//
// What it asks (Prawo komunikacji elektronicznej art. 399, ePrivacy 5(3);
// consent as RODO art. 4(11) and 7 define it): consent per category of what
// is not necessary. Today one: the map on Kontakt (Google sets its own
// cookies). Accepting, refusing and choosing per category are equal buttons
// on the first screen. The choice is kept with the date and the version of
// the categories, so it can be shown; it lapses after a year, or when the
// version changes, and the visitor is asked again. "Ustawienia plików
// cookies" in the footer opens it again, to change or withdraw consent;
// pages listening (the map) follow at once. While it shows, the page keeps
// what the keyboard focuses clear of it (scroll-padding-bottom: WCAG
// 2.4.11) and leaves room under itself, so the footer's last links (help
// in a crisis) scroll above it.

/** The non-necessary uses the visitor can allow, one switch each. */
export const COOKIE_CATEGORIES = [
  {
    key: "external",
    label: "Mapy, filmy i treści zewnętrzne",
    description:
      "Mapa Google na stronie Kontakt i filmy z YouTube lub Vimeo na stronach e-booków. Ich dostawcy zapisują przy tym własne pliki cookies.",
  },
] as const;

export type CookieCategory = (typeof COOKIE_CATEGORIES)[number]["key"];

/** Raised when the categories or what they mean change: all asked again. */
export const COOKIE_CONSENT_VERSION = 2;
/** How long a choice holds before the visitor is asked again. */
export const COOKIE_CONSENT_MAX_AGE_DAYS = 365;

/** Where the choice is kept, and the event that tells the page it changed. */
export const COOKIE_CONSENT_KEY = "ks-cookie-consent";
export const COOKIE_CONSENT_EVENT = "ks-cookie-consent";
/** The event that opens the notice again (the footer's settings link). */
export const COOKIE_SETTINGS_EVENT = "ks-cookie-settings";

export interface CookieConsentRecord {
  version: number;
  /** When it was given (ISO), so it can be shown and lapse. */
  givenAt: string;
  categories: Record<CookieCategory, boolean>;
}

/** "all": every category allowed; "necessary": none. */
export type CookieChoice = "all" | "necessary";

const DAY = 24 * 60 * 60 * 1000;

/**
 * The visitor's stored consent, if it still holds: none where storage is
 * blocked, an older format or version, or older than a year.
 */
export function readCookieConsent(
  key = COOKIE_CONSENT_KEY,
  now = Date.now(),
): CookieConsentRecord | null {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    const record = JSON.parse(raw) as Partial<CookieConsentRecord>;
    const given = Date.parse(record.givenAt ?? "");
    if (
      record.version !== COOKIE_CONSENT_VERSION ||
      !Number.isFinite(given) ||
      now - given > COOKIE_CONSENT_MAX_AGE_DAYS * DAY ||
      typeof record.categories !== "object" ||
      record.categories === null
    ) {
      return null;
    }
    return {
      version: record.version,
      givenAt: record.givenAt!,
      categories: Object.fromEntries(
        COOKIE_CATEGORIES.map(({ key: category }) => [
          category,
          record.categories![category] === true,
        ]),
      ) as Record<CookieCategory, boolean>,
    };
  } catch {
    return null;
  }
}

/** Whether the visitor allowed a category (no stored consent: no). */
export function cookieConsentAllows(
  category: CookieCategory,
  key = COOKIE_CONSENT_KEY,
): boolean {
  return readCookieConsent(key)?.categories[category] ?? false;
}

/** The stored choice as "all" or "necessary" (null: not chosen, or lapsed). */
export function readCookieChoice(
  key = COOKIE_CONSENT_KEY,
): CookieChoice | null {
  const record = readCookieConsent(key);
  if (!record) return null;
  return Object.values(record.categories).every(Boolean) ? "all" : "necessary";
}

/** Opens the notice again, to change or withdraw consent. */
export function openCookieSettings() {
  window.dispatchEvent(new Event(COOKIE_SETTINGS_EVENT));
}

export interface CookieConsentProps {
  policyHref?: string;
  storageKey?: string;
  /** Show it even if a choice is stored (Storybook). */
  forceOpen?: boolean;
  onChoice?: (choice: CookieChoice) => void;
  className?: string;
}

const allCategories = (allowed: boolean) =>
  Object.fromEntries(
    COOKIE_CATEGORIES.map(({ key }) => [key, allowed]),
  ) as Record<CookieCategory, boolean>;

export function CookieConsent({
  policyHref = "/cookies",
  storageKey = COOKIE_CONSENT_KEY,
  forceOpen = false,
  onChoice,
  className,
}: CookieConsentProps) {
  const id = useId();
  const [open, setOpen] = useState(false);
  // Opened again from the footer: the visitor has a choice to go back to.
  const [reopened, setReopened] = useState(false);
  const [customising, setCustomising] = useState(false);
  const [categories, setCategories] = useState(() => allCategories(false));
  const ref = useRef<HTMLElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (forceOpen || !readCookieConsent(storageKey)) setOpen(true);
  }, [forceOpen, storageKey]);

  // The footer's "Ustawienia plików cookies": the choices as they stand.
  useEffect(() => {
    const reopen = () => {
      const record = readCookieConsent(storageKey);
      setCategories(record?.categories ?? allCategories(false));
      setCustomising(true);
      setReopened(record !== null);
      setOpen(true);
      // After it renders, so a keyboard or screen reader user lands in it.
      requestAnimationFrame(() => heading.current?.focus());
    };
    window.addEventListener(COOKIE_SETTINGS_EVENT, reopen);
    return () => window.removeEventListener(COOKIE_SETTINGS_EVENT, reopen);
  }, [storageKey]);

  // A focused element is scrolled above the notice, never under it; the
  // room under the page lets even the footer's last links scroll above it.
  useEffect(() => {
    const notice = ref.current;
    if (!open || !notice) return;
    const root = document.documentElement;
    const body = document.body;
    const keepClear = () => {
      const room = `${notice.offsetHeight + 24}px`;
      root.style.scrollPaddingBottom = room;
      body.style.paddingBottom = room;
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
      body.style.removeProperty("padding-bottom");
      if (body.getAttribute("style") === "") body.removeAttribute("style");
    };
  }, [open]);

  if (!open) return null;

  const close = () => {
    setOpen(false);
    setCustomising(false);
    setReopened(false);
  };

  const save = (chosen: Record<CookieCategory, boolean>) => {
    const record: CookieConsentRecord = {
      version: COOKIE_CONSENT_VERSION,
      givenAt: new Date().toISOString(),
      categories: chosen,
    };
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(record));
    } catch {
      // Private mode: the choice holds for this visit only.
    }
    const choice: CookieChoice = Object.values(chosen).every(Boolean)
      ? "all"
      : "necessary";
    onChoice?.(choice);
    // What waits for consent (the map on Kontakt) hears it at once, and
    // what was shown with it goes when it is withdrawn.
    window.dispatchEvent(
      new CustomEvent<CookieChoice>(COOKIE_CONSENT_EVENT, { detail: choice }),
    );
    close();
  };

  return (
    <section
      ref={ref}
      aria-label="Pliki cookies"
      className={cn(
        "rounded-card-lg border-border/70 bg-surface shadow-card-hover fixed inset-x-3 bottom-3 z-50 grid max-h-[calc(100dvh-1.5rem)] gap-4 overflow-y-auto border p-5 sm:right-5 sm:bottom-5 sm:left-auto sm:max-w-sm",
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
          <h2
            className="text-title text-ink focus:outline-none"
            id={`${id}-title`}
            ref={heading}
            tabIndex={-1}
          >
            Szanujemy Twoją prywatność
          </h2>
          <p className="text-small text-text-muted">
            Używamy plików niezbędnych do działania strony, na przykład przy
            rezerwacji i w ochronie formularzy. Za Twoją zgodą pokażemy też mapę
            Google na stronie Kontakt i filmy z YouTube lub Vimeo na stronach
            e-booków, które zapisują pliki swoich dostawców. Wybór zmienisz w
            każdej chwili w stopce, w „Ustawieniach plików cookies”.{" "}
            <Link
              href={policyHref}
              className="text-ink underline underline-offset-4 hover:no-underline"
            >
              Polityka cookies
            </Link>
          </p>
        </div>
      </div>

      {customising ? (
        <fieldset className="grid gap-3">
          <legend className="text-small text-ink mb-1 font-semibold">
            Twój wybór
          </legend>
          <label className="text-small flex items-start gap-3">
            <input
              checked
              className="accent-primary mt-1 size-4"
              disabled
              type="checkbox"
            />
            <span>
              <span className="text-ink font-semibold">Niezbędne</span>
              <span className="text-text-muted block">
                Rezerwacja, ochrona formularzy, zapamiętanie tego wyboru. Zawsze
                włączone.
              </span>
            </span>
          </label>
          {COOKIE_CATEGORIES.map((category) => (
            <label
              className="text-small flex items-start gap-3"
              key={category.key}
            >
              <input
                checked={categories[category.key]}
                className="accent-primary mt-1 size-4"
                onChange={(event) =>
                  setCategories((current) => ({
                    ...current,
                    [category.key]: event.target.checked,
                  }))
                }
                type="checkbox"
              />
              <span>
                <span className="text-ink font-semibold">{category.label}</span>
                <span className="text-text-muted block">
                  {category.description}
                </span>
              </span>
            </label>
          ))}
        </fieldset>
      ) : null}

      {/* Equal buttons: accepting is no easier than refusing. */}
      <div className="flex flex-wrap gap-2">
        <SecondaryButton size="sm" onClick={() => save(allCategories(true))}>
          Akceptuję wszystkie
        </SecondaryButton>
        <SecondaryButton size="sm" onClick={() => save(allCategories(false))}>
          Tylko niezbędne
        </SecondaryButton>
        {customising ? (
          <SecondaryButton size="sm" onClick={() => save(categories)}>
            Zapisz wybór
          </SecondaryButton>
        ) : (
          <SecondaryButton size="sm" onClick={() => setCustomising(true)}>
            Dostosuj
          </SecondaryButton>
        )}
        {reopened ? (
          <SecondaryButton size="sm" onClick={close}>
            Zamknij bez zmian
          </SecondaryButton>
        ) : null}
      </div>
    </section>
  );
}

/** The footer's way back to the notice: change or withdraw consent. */
export function CookieSettingsButton({ className }: { className?: string }) {
  return (
    <button className={className} onClick={openCookieSettings} type="button">
      Ustawienia plików cookies
    </button>
  );
}
