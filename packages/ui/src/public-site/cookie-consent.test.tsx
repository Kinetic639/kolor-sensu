import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  COOKIE_CONSENT_EVENT,
  COOKIE_CONSENT_KEY,
  COOKIE_CONSENT_VERSION,
  CookieConsent,
  CookieSettingsButton,
  cookieConsentAllows,
  readCookieConsent,
} from "./cookie-consent";

// The cookie notice: equal buttons to accept, refuse or choose per
// category; the choice kept with its date and version, asked again after a
// year or a new version; opened again from the footer to change or
// withdraw consent; and, while it shows, what the keyboard focuses is kept
// clear of it (WCAG 2.4.11).

const notice = () => screen.queryByRole("region", { name: "Pliki cookies" });
const stored = () =>
  JSON.parse(window.localStorage.getItem(COOKIE_CONSENT_KEY) ?? "null");
const store = (record: unknown) =>
  window.localStorage.setItem(COOKIE_CONSENT_KEY, JSON.stringify(record));

afterEach(() => {
  cleanup();
  window.localStorage.clear();
  document.documentElement.removeAttribute("style");
  vi.useRealTimers();
});

describe("the cookie notice", () => {
  it("offers to accept, refuse or choose, in equal buttons", () => {
    render(<CookieConsent />);
    const buttons = within(notice()!).getAllByRole("button");
    expect(buttons.map((button) => button.textContent)).toEqual([
      "Akceptuję wszystkie",
      "Tylko niezbędne",
      "Dostosuj",
    ]);
    expect(new Set(buttons.map((button) => button.className)).size).toBe(1);
    expect(
      within(notice()!).getByRole("link", { name: "Polityka cookies" }),
    ).toHaveAttribute("href", "/cookies");
  });

  it("keeps a refusal with its date and version, and says so", () => {
    const heard = vi.fn();
    window.addEventListener(COOKIE_CONSENT_EVENT, heard);
    render(<CookieConsent />);
    fireEvent.click(screen.getByRole("button", { name: "Tylko niezbędne" }));
    expect(stored()).toMatchObject({
      version: COOKIE_CONSENT_VERSION,
      categories: { external: false },
    });
    expect(Number.isNaN(Date.parse(stored().givenAt))).toBe(false);
    expect((heard.mock.calls[0]![0] as CustomEvent).detail).toBe("necessary");
    expect(notice()).not.toBeInTheDocument();
    expect(cookieConsentAllows("external")).toBe(false);
    window.removeEventListener(COOKIE_CONSENT_EVENT, heard);
  });

  it("lets the visitor choose per category", () => {
    render(<CookieConsent />);
    fireEvent.click(screen.getByRole("button", { name: "Dostosuj" }));
    expect(screen.getByRole("checkbox", { name: /Niezbędne/ })).toBeDisabled();
    const maps = screen.getByRole("checkbox", {
      name: /Mapy, filmy i treści zewnętrzne/,
    });
    expect(maps).not.toBeChecked();
    fireEvent.click(maps);
    fireEvent.click(screen.getByRole("button", { name: "Zapisz wybór" }));
    expect(cookieConsentAllows("external")).toBe(true);
  });

  it("asks again after a year, for a new version, or for the old format", () => {
    vi.useFakeTimers({ now: new Date("2026-10-20T12:00:00Z") });
    store({
      version: COOKIE_CONSENT_VERSION,
      givenAt: "2025-10-19T12:00:00Z",
      categories: { external: true },
    });
    expect(readCookieConsent()).toBeNull();
    store({
      version: COOKIE_CONSENT_VERSION + 1,
      givenAt: "2026-10-01T12:00:00Z",
      categories: { external: true },
    });
    expect(readCookieConsent()).toBeNull();
    window.localStorage.setItem(COOKIE_CONSENT_KEY, "all");
    expect(readCookieConsent()).toBeNull();
    store({
      version: COOKIE_CONSENT_VERSION,
      givenAt: "2026-10-01T12:00:00Z",
      categories: { external: true },
    });
    expect(readCookieConsent()?.categories.external).toBe(true);
  });

  it("stays away while a choice holds", () => {
    store({
      version: COOKIE_CONSENT_VERSION,
      givenAt: new Date().toISOString(),
      categories: { external: true },
    });
    render(<CookieConsent />);
    expect(notice()).not.toBeInTheDocument();
    expect(document.documentElement.style.scrollPaddingBottom).toBe("");
  });

  it("opens again from the footer, where consent can be withdrawn", () => {
    store({
      version: COOKIE_CONSENT_VERSION,
      givenAt: new Date().toISOString(),
      categories: { external: true },
    });
    const heard = vi.fn();
    window.addEventListener(COOKIE_CONSENT_EVENT, heard);
    render(
      <>
        <CookieConsent />
        <CookieSettingsButton />
      </>,
    );
    expect(notice()).not.toBeInTheDocument();
    act(() => {
      fireEvent.click(
        screen.getByRole("button", { name: "Ustawienia plików cookies" }),
      );
    });
    const maps = within(notice()!).getByRole("checkbox", {
      name: /Mapy, filmy i treści zewnętrzne/,
    });
    expect(maps).toBeChecked();
    fireEvent.click(maps);
    fireEvent.click(screen.getByRole("button", { name: "Zapisz wybór" }));
    expect(cookieConsentAllows("external")).toBe(false);
    expect((heard.mock.calls.at(-1)![0] as CustomEvent).detail).toBe(
      "necessary",
    );
    window.removeEventListener(COOKIE_CONSENT_EVENT, heard);
  });

  it("closes from the footer's settings without changing the choice", () => {
    store({
      version: COOKIE_CONSENT_VERSION,
      givenAt: "2026-10-01T12:00:00Z",
      categories: { external: true },
    });
    render(
      <>
        <CookieConsent />
        <CookieSettingsButton />
      </>,
    );
    act(() => {
      fireEvent.click(
        screen.getByRole("button", { name: "Ustawienia plików cookies" }),
      );
    });
    fireEvent.click(screen.getByRole("button", { name: "Zamknij bez zmian" }));
    expect(notice()).not.toBeInTheDocument();
    expect(stored().givenAt).toBe("2026-10-01T12:00:00Z");
  });

  it("keeps the focused element clear of it while it shows", () => {
    render(<CookieConsent />);
    expect(document.documentElement.style.scrollPaddingBottom).toMatch(/px$/);
    fireEvent.click(
      screen.getByRole("button", { name: "Akceptuję wszystkie" }),
    );
    expect(document.documentElement.style.scrollPaddingBottom).toBe("");
  });

  it("leaves room under the page, so the footer scrolls above it", () => {
    render(<CookieConsent />);
    expect(document.body.style.paddingBottom).toMatch(/px$/);
    fireEvent.click(
      screen.getByRole("button", { name: "Akceptuję wszystkie" }),
    );
    expect(document.body.style.paddingBottom).toBe("");
  });
});
