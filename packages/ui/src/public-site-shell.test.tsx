import { render, screen, within } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import {
  PublicSiteFooter,
  PublicSiteHeader,
  isPublicPathActive,
} from "./public-site-shell";

const navigation = [
  { label: "Strona główna", href: "/" },
  { label: "Specjaliści", href: "/specjalisci" },
];

describe("isPublicPathActive", () => {
  it("matches the home route only on an exact match", () => {
    expect(isPublicPathActive("/", "/")).toBe(true);
    expect(isPublicPathActive("/specjalisci", "/")).toBe(false);
  });

  it("matches nested routes under a section", () => {
    expect(
      isPublicPathActive("/specjalisci/anna-kowalska", "/specjalisci"),
    ).toBe(true);
    expect(isPublicPathActive("/", "/specjalisci")).toBe(false);
  });
});

describe("PublicSiteHeader", () => {
  it("renders exactly the configured desktop nav links", () => {
    render(<PublicSiteHeader currentPath="/" navigation={navigation} />);

    const nav = screen.getByRole("navigation", { name: "Nawigacja główna" });
    const links = within(nav).getAllByRole("link");
    expect(links).toHaveLength(2);
    expect(links[0]).toHaveAttribute("href", "/");
    expect(links[1]).toHaveAttribute("href", "/specjalisci");
  });

  it("marks the active route without relying on color alone", () => {
    render(
      <PublicSiteHeader currentPath="/specjalisci" navigation={navigation} />,
    );

    const nav = screen.getByRole("navigation", { name: "Nawigacja główna" });
    expect(
      within(nav).getByRole("link", { name: "Specjaliści" }),
    ).toHaveAttribute("aria-current", "page");
    expect(
      within(nav).getByRole("link", { name: "Strona główna" }),
    ).not.toHaveAttribute("aria-current");
  });

  it("opens an accessible mobile menu with the same navigation links", async () => {
    const user = userEvent.setup();
    render(<PublicSiteHeader currentPath="/" navigation={navigation} />);

    await user.click(
      screen.getByRole("button", { name: "Otwórz menu nawigacji" }),
    );

    const mobileNav = screen.getByRole("navigation", {
      name: "Nawigacja mobilna",
    });
    const links = within(mobileNav).getAllByRole("link");
    expect(links).toHaveLength(2);
    expect(links.map((link) => link.getAttribute("href"))).toEqual([
      "/",
      "/specjalisci",
    ]);
  });

  it("renders the brand as a link back to home", () => {
    render(
      <PublicSiteHeader currentPath="/specjalisci" navigation={navigation} />,
    );

    expect(
      screen.getByRole("link", { name: "Kolor Sensu — strona główna" }),
    ).toHaveAttribute("href", "/");
  });
});

describe("PublicSiteFooter", () => {
  it("renders the brand, current year, and navigation links", () => {
    render(<PublicSiteFooter navigation={navigation} />);

    const year = new Date().getFullYear().toString();
    expect(screen.getByText("Kolor Sensu")).toBeInTheDocument();
    expect(screen.getByText(new RegExp(year))).toBeInTheDocument();

    const nav = screen.getByRole("navigation", { name: "Nawigacja w stopce" });
    const links = within(nav).getAllByRole("link");
    expect(links).toHaveLength(2);
    expect(links.map((link) => link.getAttribute("href"))).toEqual([
      "/",
      "/specjalisci",
    ]);
  });

  it("stays minimal and invents nothing when no center profile is published", () => {
    render(<PublicSiteFooter centerProfile={null} navigation={navigation} />);

    expect(
      screen.queryByRole("link", { name: /mailto:/ }),
    ).not.toBeInTheDocument();
    expect(screen.queryByText("Instagram")).not.toBeInTheDocument();
  });

  it("shows only the published center-profile fields that are actually present", () => {
    render(
      <PublicSiteFooter
        centerProfile={{
          publicEmail: "kontakt@kolorsensu.pl",
          publicPhone: null,
          websiteUrl: null,
          instagramUrl: "https://instagram.com/kolorsensu",
          facebookUrl: null,
        }}
        navigation={navigation}
      />,
    );

    expect(
      screen.getByRole("link", { name: "kontakt@kolorsensu.pl" }),
    ).toHaveAttribute("href", "mailto:kontakt@kolorsensu.pl");
    expect(screen.getByRole("link", { name: "Instagram" })).toHaveAttribute(
      "href",
      "https://instagram.com/kolorsensu",
    );
    expect(
      screen.queryByRole("link", { name: "Facebook" }),
    ).not.toBeInTheDocument();
  });
});
