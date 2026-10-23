import { render, screen, within } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { sampleHero } from "./hero-samples";
import { HeroSection } from "./hero-section";
import { EditorialHeading } from "./typography";

describe("HeroSection", () => {
  it("heads the page with one H1, its second line in brand green", () => {
    render(<HeroSection {...sampleHero} />);
    const heading = screen.getByRole("heading", { level: 1 });
    expect(heading).toHaveTextContent("Więcej zrozumienia. Więcej sensu.");
    const accent = within(heading).getByText("Więcej sensu.");
    expect(accent).toHaveClass("text-primary");
    expect(accent).not.toHaveClass("text-pink");
  });

  it("puts the eyebrow in dusty pink, in the step readable at that size", () => {
    render(<HeroSection {...sampleHero} />);
    const eyebrow = screen.getByText("Centrum psychoterapii i rozwoju");
    expect(eyebrow).toHaveClass("text-pink-strong");
    expect(eyebrow).not.toHaveClass("text-text-muted");
  });

  it("offers the two actions as links", () => {
    render(<HeroSection {...sampleHero} />);
    expect(screen.getByRole("link", { name: "Umów wizytę" })).toHaveAttribute(
      "href",
      "#umow-wizyte",
    );
    expect(screen.getByRole("link", { name: "Poznaj nas" })).toHaveAttribute(
      "href",
      "#o-nas",
    );
  });

  it("lists the reassurances from the data, icons hidden from assistive technology", () => {
    render(<HeroSection {...sampleHero} />);
    const items = within(screen.getByRole("list")).getAllByRole("listitem");
    expect(items.map((item) => item.textContent)).toEqual(
      sampleHero.points.map((point) => point.label),
    );
    for (const item of items) {
      expect(item.querySelector("[aria-hidden='true'] svg")).not.toBeNull();
    }
    // "Atmosfera zaufania" keeps its pink heart.
    expect(items.at(-1)!.querySelector("[aria-hidden='true']")).toHaveClass(
      "text-pink",
    );
  });

  it("shows the painted picture with its alt text and caption, preloaded", () => {
    const { container } = render(<HeroSection {...sampleHero} />);
    const photo = screen.getByRole("img", { name: sampleHero.image.alt });
    expect(photo).toHaveAttribute("fetchpriority", "high");
    expect(container.querySelector("figcaption")).toHaveTextContent(
      "Przestrzeń dla ważnych rozmów",
    );
  });

  it("uses the site's chosen backdrop and parallax layer", () => {
    const { container } = render(
      <HeroSection
        {...sampleHero}
        watercolor={{
          watercolorSrc: "/media/backdrop.webp",
          parallaxSrc: "/media/drops.png",
        }}
      />,
    );
    expect(
      container.querySelector(".ks-wc__backdrop img")?.getAttribute("src"),
    ).toContain("backdrop.webp");
    expect(
      container.querySelector(".ks-wc__parallax img")?.getAttribute("src"),
    ).toContain("drops.png");
  });

  it("paints the picture in with WatercolorImage's brush strokes when animated", () => {
    const html = renderToString(
      <HeroSection {...sampleHero} animationPreset="watercolor-reveal" />,
    );
    expect(html).toContain('data-animation="watercolor-reveal"');
    // Static by default: no reveal markers.
    const { container } = render(<HeroSection {...sampleHero} />);
    expect(container.querySelector("[data-animation]")).toBeNull();
  });
});

describe("EditorialHeading accent tone", () => {
  it("stays dusty pink by default", () => {
    render(<EditorialHeading accent="Więcej sensu.">Tytuł</EditorialHeading>);
    expect(screen.getByText("Więcej sensu.")).toHaveClass("text-pink");
  });
});
