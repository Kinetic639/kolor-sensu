import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SiteFooter } from "./site-footer";
import type { SiteNavItem } from "./site-types";

const home: SiteNavItem = { label: "Start", href: "/" };

describe("SiteFooter", () => {
  it("lists the offer's pages, a catalogue's unfolded", () => {
    render(
      <SiteFooter
        navigation={[
          home,
          {
            label: "Oferta",
            href: "/oferta",
            footerColumn: true,
            children: [
              { label: "Konsultacja", href: "/oferta/konsultacja" },
              {
                label: "Terapia",
                href: "/oferta/terapia",
                children: [
                  { label: "Indywidualna", href: "/oferta/indywidualna" },
                  { label: "Par", href: "/oferta/par" },
                ],
              },
            ],
          },
        ]}
      />,
    );
    const offer = screen.getByRole("navigation", { name: "Oferta" });
    expect(
      Array.from(offer.querySelectorAll("a"), (link) => link.textContent),
    ).toEqual(["Konsultacja", "Indywidualna", "Par"]);
  });

  // A new centre has no services yet: the site still renders (it used to
  // fail the build on every page).
  it("has no offer column while the offer is empty", () => {
    render(
      <SiteFooter
        navigation={[
          home,
          { label: "Oferta", href: "/oferta", footerColumn: true },
        ]}
      />,
    );
    expect(
      screen.queryByRole("navigation", { name: "Oferta" }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Start" })).toBeInTheDocument();
  });

  it("offers the cookie settings once, beside the legal links", () => {
    render(
      <SiteFooter
        legal={[{ label: "Cookies", href: "/cookies" }]}
        navigation={[
          home,
          {
            label: "Oferta",
            href: "/oferta",
            footerColumn: true,
            children: [{ label: "Konsultacja", href: "/oferta/konsultacja" }],
          },
        ]}
      />,
    );
    expect(
      screen.getAllByRole("button", { name: "Ustawienia plików cookies" }),
    ).toHaveLength(1);
    expect(
      screen.getByRole("navigation", { name: "Oferta" }),
    ).not.toHaveTextContent("Ustawienia plików cookies");
  });

  it("shows the site's newsletter form only when given", () => {
    const { rerender } = render(<SiteFooter navigation={[home]} />);
    expect(
      screen.queryByRole("form", { name: "Zapis na newsletter" }),
    ).not.toBeInTheDocument();
    rerender(
      <SiteFooter
        navigation={[home]}
        newsletter={<form aria-label="Zapis na newsletter" />}
      />,
    );
    expect(
      screen.getByRole("form", { name: "Zapis na newsletter" }),
    ).toBeInTheDocument();
  });

  it("shows the CMS's crisis numbers after navigation and before the newsletter", () => {
    render(
      <SiteFooter
        navigation={[home]}
        crisisLines={[
          {
            number: "123 456",
            label: "Linia testowa",
            detail: "Informacja testowa",
          },
        ]}
        newsletter={<form aria-label="Zapis na newsletter" />}
      />,
    );
    const strip = screen.getByRole("complementary", {
      name: "Pomoc w kryzysie",
    });
    expect(screen.getByText("Linia testowa")).toBeVisible();
    expect(screen.getByText("Informacja testowa")).toBeVisible();
    // Named as it reads, the number first (label in name).
    expect(
      screen.getByRole("link", {
        name: "123 456 Linia testowa Informacja testowa",
      }),
    ).toHaveAttribute("href", "tel:123456");
    expect(strip.previousElementSibling).toHaveClass("ks-footer__main");
    expect(strip.nextElementSibling).toContainElement(
      screen.getByRole("form", { name: "Zapis na newsletter" }),
    );
    expect(
      screen.getByRole("link", { name: "Pomoc w kryzysie" }),
    ).toHaveAttribute("href", "/pomoc-w-kryzysie");
  });
});
