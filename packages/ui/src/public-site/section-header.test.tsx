// SectionHeader: a section's header from the CMS's words and colours, in
// the markup the section chooses.
import {
  plainHeader,
  type SectionHeaderContent,
} from "@repo/contracts/section-header";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SectionHeader } from "./section-header";

const full: SectionHeaderContent = {
  eyebrow: { text: "Jak zacząć", tone: "pink" },
  title: [
    [
      { text: "Twoja droga do ", tone: "default" },
      { text: "lepszego", tone: "green" },
    ],
    [{ text: "samopoczucia", tone: "pink" }],
  ],
  description: [
    { text: "Zacznij od ", link: null },
    { text: "rozmowy", link: { href: "/umow-wizyte", tone: "green" } },
    { text: " z nami.", link: null },
  ],
  cta: { label: "Zobacz ofertę", href: "/oferta", style: "button" },
};

describe("SectionHeader", () => {
  it("reads as one plain title, whatever its colours and lines", () => {
    render(<SectionHeader content={full} />);
    const heading = screen.getByRole("heading", { level: 2 });
    expect(heading).toHaveAccessibleName(
      "Twoja droga do lepszego samopoczucia",
    );
    // The coloured words are spans in the heading, the second line a break.
    expect(heading.querySelectorAll("span")).toHaveLength(2);
    expect(heading.querySelector("br")).not.toBeNull();
    expect(screen.getByText("lepszego")).toHaveClass("text-primary");
    expect(screen.getByText("samopoczucia")).toHaveClass("text-pink");
  });

  it("takes its heading level and size from the section, not the content", () => {
    render(<SectionHeader content={full} as="h3" size="h2" id="kroki" />);
    const heading = screen.getByRole("heading", { level: 3 });
    expect(heading).toHaveAttribute("id", "kroki");
    expect(heading).toHaveClass("text-h2");
    expect(screen.queryByRole("heading", { level: 2 })).toBeNull();
  });

  it("puts the eyebrow above the title as a paragraph, in a strong shade", () => {
    render(<SectionHeader content={full} />);
    const eyebrow = screen.getByText("Jak zacząć");
    expect(eyebrow.tagName).toBe("P");
    expect(eyebrow).toHaveClass("text-pink-strong");
    expect(eyebrow.nextElementSibling).toBe(
      screen.getByRole("heading", { level: 2 }),
    );
  });

  it("links from where the description says, to a page of the site", () => {
    render(<SectionHeader content={full} />);
    const link = screen.getByRole("link", { name: "rozmowy" });
    expect(link).toHaveAttribute("href", "/umow-wizyte");
    expect(link).toHaveClass("text-primary-strong");
    expect(link.parentElement).toHaveTextContent("Zacznij od rozmowy z nami.");
  });

  it("ends with the call to action in the chosen style", () => {
    const { rerender } = render(<SectionHeader content={full} />);
    const button = screen.getByRole("link", { name: /Zobacz ofertę/ });
    expect(button).toHaveAttribute("href", "/oferta");
    expect(button).toHaveClass("bg-primary");

    rerender(
      <SectionHeader
        content={{ ...full, cta: { ...full.cta!, style: "outline" } }}
      />,
    );
    expect(screen.getByRole("link", { name: /Zobacz ofertę/ })).toHaveClass(
      "border-border-strong",
    );

    rerender(
      <SectionHeader
        content={{ ...full, cta: { ...full.cta!, style: "arrow" } }}
      />,
    );
    const drawnLink = screen.getByRole("link", { name: /Zobacz ofertę/ });
    expect(
      drawnLink.querySelector('[data-ink-stroke="underline"]'),
    ).not.toBeNull();
    expect(drawnLink.querySelector('[data-ink-stroke="shaft"]')).not.toBeNull();
  });

  it("leaves out what is empty: no eyebrow, description or call to action", () => {
    const { container } = render(
      <SectionHeader content={plainHeader({ title: "O nas" })} />,
    );
    const header = container.querySelector("header")!;
    expect(header.children).toHaveLength(1);
    expect(header.firstElementChild!.tagName).toBe("H2");
  });

  it("centres everything when the section asks", () => {
    const { container } = render(
      <SectionHeader content={full} align="center" />,
    );
    expect(container.querySelector("header")).toHaveClass("text-center");
  });
});
