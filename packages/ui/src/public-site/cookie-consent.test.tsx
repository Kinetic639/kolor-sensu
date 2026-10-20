import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { COOKIE_CONSENT_KEY, CookieConsent } from "./cookie-consent";

// The cookie notice: shown until the visitor chooses, and while it shows,
// what the keyboard focuses is scrolled clear of it (WCAG 2.4.11).

afterEach(() => {
  cleanup();
  window.localStorage.clear();
  document.documentElement.removeAttribute("style");
});

describe("the cookie notice", () => {
  it("keeps the focused element clear of it while it shows", () => {
    render(<CookieConsent />);
    expect(screen.getByRole("region", { name: "Pliki cookies" })).toBeVisible();
    expect(document.documentElement.style.scrollPaddingBottom).toMatch(/px$/);

    fireEvent.click(screen.getByRole("button", { name: "Tylko niezbędne" }));
    expect(
      screen.queryByRole("region", { name: "Pliki cookies" }),
    ).not.toBeInTheDocument();
    expect(document.documentElement.style.scrollPaddingBottom).toBe("");
    expect(window.localStorage.getItem(COOKIE_CONSENT_KEY)).toBe("necessary");
  });

  it("stays away, and leaves the page's scrolling alone, once chosen", () => {
    window.localStorage.setItem(COOKIE_CONSENT_KEY, "all");
    render(<CookieConsent />);
    expect(
      screen.queryByRole("region", { name: "Pliki cookies" }),
    ).not.toBeInTheDocument();
    expect(document.documentElement.style.scrollPaddingBottom).toBe("");
  });
});
