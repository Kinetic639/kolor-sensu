// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { COOKIE_CONSENT_EVENT } from "@repo/ui/public-site/cookie-consent";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { ConsentMap } from "./consent-map";

// Google's map sets its own cookies: it loads only with the visitor's consent.

const address = "ul. Długa 1, 61-001 Poznań";
const map = () => screen.queryByTitle(`Mapa: ${address}`);
const consent = (external: boolean) =>
  window.localStorage.setItem(
    "ks-cookie-consent",
    JSON.stringify({
      version: 1,
      givenAt: new Date().toISOString(),
      categories: { external },
    }),
  );

afterEach(() => {
  cleanup();
  window.localStorage.clear();
});

describe("the map on Kontakt", () => {
  it("waits for consent, standing in with a tile", () => {
    render(<ConsentMap address={address} />);
    expect(map()).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Pokaż mapę" }),
    ).toBeInTheDocument();
  });

  it("loads at once with consent to maps and external content", () => {
    consent(true);
    render(<ConsentMap address={address} />);
    expect(map()).toHaveAttribute(
      "src",
      expect.stringContaining(encodeURIComponent(address)),
    );
  });

  it("stays away with only the necessary cookies, until asked for", () => {
    consent(false);
    render(<ConsentMap address={address} />);
    expect(map()).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Pokaż mapę" }));
    expect(map()).toBeInTheDocument();
  });

  it("loads as soon as the visitor agrees in the banner", () => {
    render(<ConsentMap address={address} />);
    act(() => {
      window.dispatchEvent(
        new CustomEvent(COOKIE_CONSENT_EVENT, { detail: "all" }),
      );
    });
    expect(map()).toBeInTheDocument();
  });

  it("goes as soon as the visitor withdraws consent in the notice", () => {
    consent(true);
    render(<ConsentMap address={address} />);
    expect(map()).toBeInTheDocument();
    act(() => {
      window.dispatchEvent(
        new CustomEvent(COOKIE_CONSENT_EVENT, { detail: "necessary" }),
      );
    });
    expect(map()).not.toBeInTheDocument();
  });

  it("asks again for a choice in the old format", () => {
    window.localStorage.setItem("ks-cookie-consent", "all");
    render(<ConsentMap address={address} />);
    expect(map()).not.toBeInTheDocument();
  });
});
