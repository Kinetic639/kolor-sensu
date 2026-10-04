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
