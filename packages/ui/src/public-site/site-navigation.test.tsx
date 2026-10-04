import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { SiteMobileNav } from "./site-mobile-nav";
import { SiteNavigation } from "./site-navigation";
import { sampleNavigation } from "./site-samples";

describe("SiteNavigation: the offer's dropdown", () => {
  it("lists the services one under another; a catalogue opens its own beside it", async () => {
    const user = userEvent.setup();
    render(<SiteNavigation currentPath="/" items={sampleNavigation} />);
    await user.click(screen.getByRole("button", { name: "Oferta" }));

    // A service outside a catalogue: a link at once.
    expect(
      screen.getByRole("link", { name: "Konsultacje psychologiczne" }),
    ).toHaveAttribute("href", "/oferta/konsultacje");
    // A catalogue: a button, its services not shown yet.
    const catalog = screen.getByRole("button", { name: "Psychoterapia" });
    expect(catalog).toHaveAttribute("aria-expanded", "false");
    expect(
      screen.queryByRole("link", { name: "Psychoterapia par" }),
    ).toBeNull();

    await user.click(catalog);
    expect(catalog).toHaveAttribute("aria-expanded", "true");
    const group = screen.getByRole("group", { name: "Psychoterapia" });
    expect(
      within(group).getByRole("link", { name: "Psychoterapia par" }),
    ).toHaveAttribute("href", "/oferta/psychoterapia-par");
  });

  it("the arrows: right into the catalogue, left back out", async () => {
    const user = userEvent.setup();
    render(<SiteNavigation currentPath="/" items={sampleNavigation} />);
    await user.click(screen.getByRole("button", { name: "Oferta" }));
    const catalog = screen.getByRole("button", { name: "Psychoterapia" });
    catalog.focus();
    await user.keyboard("{ArrowRight}");
    const first = await screen.findByRole("link", {
      name: "Psychoterapia indywidualna",
    });
    await new Promise((done) => requestAnimationFrame(() => done(null)));
    expect(first).toHaveFocus();
    await user.keyboard("{ArrowLeft}");
    expect(catalog).toHaveFocus();
    expect(catalog).toHaveAttribute("aria-expanded", "false");
  });
});

describe("SiteMobileNav: the offer on a phone", () => {
  it("a catalogue folds out its services; open on one of them", async () => {
    const user = userEvent.setup();
    render(
      <SiteMobileNav
        currentPath="/oferta/psychoterapia-par"
        items={sampleNavigation}
      />,
    );
    await user.click(screen.getByRole("button", { name: "Otwórz menu" }));
    const menu = await screen.findByRole("dialog");
    const summary = within(menu).getByText("Psychoterapia");
    const details = summary.closest("details")!;
    // The page shown is one of its services: it starts open.
    expect(details).toHaveAttribute("open");
    expect(
      within(details).getByRole("link", { name: "Psychoterapia par" }),
    ).toHaveAttribute("aria-current", "page");
    expect(
      within(menu).getByRole("link", { name: "Konsultacje psychologiczne" }),
    ).toHaveAttribute("href", "/oferta/konsultacje");
  });
});

describe("SiteNavigation: about us", () => {
  it("opens on the team, the rooms and the contact, its own page last", async () => {
    const user = userEvent.setup();
    render(<SiteNavigation currentPath="/gabinety" items={sampleNavigation} />);
    const about = screen.getByRole("button", { name: "O nas" });
    // Current on any of its pages.
    expect(about).toHaveAttribute("data-active", "true");
    await user.click(about);
    for (const [name, href] of [
      ["Specjaliści", "/specjalisci"],
      ["Gabinety", "/gabinety"],
      ["Kontakt", "/kontakt"],
      ["Więcej o nas", "/o-nas"],
    ]) {
      expect(screen.getByRole("link", { name })).toHaveAttribute("href", href);
    }
  });
});

describe("SiteNavigation: the offer's own pages", () => {
  it("the price list under the services, above the whole offer", async () => {
    const user = userEvent.setup();
    render(<SiteNavigation currentPath="/cennik" items={sampleNavigation} />);
    const offer = screen.getByRole("button", { name: "Oferta" });
    expect(offer).toHaveAttribute("data-active", "true");
    await user.click(offer);
    const pricing = screen.getByRole("link", { name: "Cennik" });
    const all = screen.getByRole("link", { name: /Cała oferta/ });
    const last = screen.getByRole("link", {
      name: "Konsultacje psychologiczne",
    });
    expect(pricing).toHaveAttribute("href", "/cennik");
    // After the services, before the whole offer.
    expect(
      last.compareDocumentPosition(pricing) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(
      pricing.compareDocumentPosition(all) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });
});
