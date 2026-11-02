import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CtaLink, resumeHref } from "./cta-link";
import { SiteHeader } from "./site-header";
import type { SiteCta } from "./site-types";

const navigation = vi.hoisted(() => ({ pathname: "/" as string | null }));
vi.mock("next/navigation", () => ({ usePathname: () => navigation.pathname }));

const resume = {
  cookie: "ks_rezerwacja",
  under: "/umow-wizyte",
  label: "Dokończ rezerwację",
};
const cta: SiteCta = { label: "Umów wizytę", href: "/umow-wizyte", resume };

function setCookie(value: string) {
  document.cookie = `ks_rezerwacja=${encodeURIComponent(value)}; Path=/`;
}

afterEach(() => {
  document.cookie = "ks_rezerwacja=; Path=/; Max-Age=0";
  navigation.pathname = "/";
});

describe("resumeHref", () => {
  it("follows only a link into the wizard", () => {
    const cookies = (value: string) =>
      `a=1; ks_rezerwacja=${encodeURIComponent(value)}; b=2`;
    expect(resumeHref(cookies("/umow-wizyte?usluga=terapia"), resume)).toBe(
      "/umow-wizyte?usluga=terapia",
    );
    expect(resumeHref(cookies("/umow-wizyte/dane"), resume)).toBe(
      "/umow-wizyte/dane",
    );
    for (const value of [
      "https://example.invalid/umow-wizyte",
      "//example.invalid",
      "/umow-wizyte//example.invalid",
      "/umow-wizytex",
      "/kontakt",
      "/umow-wizyte\\..",
    ]) {
      expect(resumeHref(cookies(value), resume)).toBeNull();
    }
    expect(resumeHref("a=1", resume)).toBeNull();
    expect(resumeHref("ks_rezerwacja=%E0%A4%A", resume)).toBeNull();
  });
});

describe("CtaLink: Dokończ rezerwację (Klient · 1, card 11)", () => {
  it("is Umów wizytę while no booking was begun", () => {
    render(<CtaLink cta={cta} />);
    expect(screen.getByRole("link", { name: "Umów wizytę" })).toHaveAttribute(
      "href",
      "/umow-wizyte",
    );
  });

  it("leads back to the step the visitor left", () => {
    setCookie("/umow-wizyte?usluga=terapia&forma=online");
    render(<CtaLink cta={cta} />);
    expect(
      screen.getByRole("link", { name: "Dokończ rezerwację" }),
    ).toHaveAttribute("href", "/umow-wizyte?usluga=terapia&forma=online");
  });

  it("stays Umów wizytę inside the wizard", () => {
    setCookie("/umow-wizyte/dane");
    navigation.pathname = "/umow-wizyte/dane";
    render(<CtaLink cta={cta} />);
    expect(screen.getByRole("link", { name: "Umów wizytę" })).toBeVisible();
  });

  it("ignores a link elsewhere", () => {
    setCookie("https://example.invalid/");
    render(<CtaLink cta={cta} />);
    expect(screen.getByRole("link", { name: "Umów wizytę" })).toHaveAttribute(
      "href",
      "/umow-wizyte",
    );
  });

  it("in the header, with the button's arrow", () => {
    setCookie("/umow-wizyte/dane");
    render(<SiteHeader cta={cta} navigation={[]} />);
    const link = screen.getByRole("link", { name: "Dokończ rezerwację" });
    expect(link).toHaveAttribute("href", "/umow-wizyte/dane");
    expect(link.querySelector("svg")).not.toBeNull();
  });
});
