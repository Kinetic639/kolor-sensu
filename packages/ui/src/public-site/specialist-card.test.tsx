import { render, screen, within } from "@testing-library/react";
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { specialistSplashes } from "./specialist-artwork";
import { SpecialistWatercolorCard } from "./specialist-card";
import { sampleSpecialists } from "./specialist-samples";
import { SpecialistsSection } from "./specialists-section";

const here = dirname(fileURLToPath(import.meta.url));
const css = readFileSync(resolve(here, "public-site.css"), "utf8");
const publicDir = resolve(here, "../../../../apps/web/public");

const [anna, tomasz] = sampleSpecialists;

function rule(selector: string) {
  const start = css.indexOf(`${selector} {`);
  expect(start, `${selector} is defined`).toBeGreaterThan(-1);
  return css.slice(start, css.indexOf("}", start));
}

function card(container: HTMLElement) {
  return container.querySelector<HTMLElement>(".ks-sp")!;
}

describe("SpecialistWatercolorCard", () => {
  it("links the card to the specialist by name, with the role beside it", () => {
    render(<SpecialistWatercolorCard {...anna} />);

    const link = screen.getByRole("link", { name: "Anna Nowak" });
    expect(link).toHaveAttribute("href", "#anna-nowak");
    expect(
      screen.getByRole("heading", { level: 3, name: "Anna Nowak" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Psychoterapeutka")).toBeInTheDocument();
    // The link's overlay covers the whole card: the root is its positioned
    // ancestor, and the plate itself is not positioned.
    expect(link.className).toMatch(/after:absolute/);
    expect(rule(".ks-sp")).toContain("position: relative");
    expect(rule(".ks-sp__plate")).not.toContain("position");
  });

  it("exposes only the portrait to assistive technology, with alt text", () => {
    const { container, rerender } = render(
      <SpecialistWatercolorCard {...anna} />,
    );
    const portrait = screen.getByRole("img");
    expect(portrait).toHaveAccessibleName("Anna Nowak, psychoterapeutka");
    expect(portrait.getAttribute("src")).toContain("anna-nowak.png");

    // The splash (and its pigment copy) are decorative and hidden.
    const decorative = container.querySelectorAll(
      ".ks-sp__splash img, .ks-sp__stain img",
    );
    expect(decorative).toHaveLength(2);
    for (const image of decorative) {
      expect(image).toHaveAttribute("alt", "");
      expect(image.closest("[aria-hidden='true']")).not.toBeNull();
    }

    rerender(
      <SpecialistWatercolorCard
        {...anna}
        portraitAlt="Anna Nowak w gabinecie"
      />,
    );
    expect(screen.getByRole("img")).toHaveAccessibleName(
      "Anna Nowak w gabinecie",
    );
  });

  it("puts the supplied splash behind the portrait, whole, with its accent", () => {
    const { container, rerender } = render(
      <SpecialistWatercolorCard {...anna} />,
    );
    const splash = () =>
      container.querySelector(".ks-sp__splash img")!.getAttribute("src");
    expect(splash()).toContain("splash-pink-1.png");
    expect(container.querySelector(".ks-sp__arrow")).toHaveClass(
      "bg-pink-soft",
    );

    rerender(<SpecialistWatercolorCard {...tomasz} />);
    expect(splash()).toContain("splash-sage-1.png");
    expect(container.querySelector(".ks-sp__arrow")).toHaveClass(
      "bg-primary-soft",
    );

    // Layer order: splash, then the portrait (with the pigment above it).
    const art = container.querySelector(".ks-sp__art")!;
    expect([...art.children].map((layer) => layer.className)).toEqual([
      "ks-sp__splash",
      "ks-sp__portrait",
    ]);
    expect(
      [...container.querySelector(".ks-sp__portrait")!.children].map(
        (layer) => layer.className,
      ),
    ).toEqual(["ks-sp__portrait-frame", "ks-sp__stain"]);
  });

  it("ships every supplied splash asset unframed, in a box of its own ratio", () => {
    for (const src of Object.values(specialistSplashes)) {
      const png = readFileSync(resolve(publicDir, `.${src}`));
      expect(png.readUInt32BE(16) / png.readUInt32BE(20), src).toBeCloseTo(
        3 / 4,
        2,
      );
    }
    expect(rule(".ks-sp__art")).toContain("aspect-ratio: 3 / 4");
    // Nothing crops the splash into a rectangle or frames it.
    for (const selector of [".ks-sp__art", ".ks-sp__splash"]) {
      expect(rule(selector)).not.toMatch(
        /overflow|border|clip-path|border-radius|mask/,
      );
    }
  });

  it("dissolves the portrait's lower edge into the watercolor, not with a fade", () => {
    const portrait = rule(".ks-sp__portrait");
    expect(portrait).toContain(
      'mask-image: url("/watercolor/portrait-dissolve.png")',
    );
    expect(portrait).not.toMatch(/linear-gradient/);
    // The stain: the splash's pigment over the portrait, kept to its very
    // bottom (higher up it reads as stains on the clothes).
    const stain = rule(".ks-sp__stain");
    expect(stain).toContain('url("/watercolor/portrait-stain.png")');
    expect(stain).toContain(
      "linear-gradient(to bottom, transparent 70%, black 79%)",
    );
    expect(stain).toContain("mask-composite: intersect");
    expect(rule(".ks-sp__stain")).toContain("mix-blend-mode: multiply");

    // The dissolve mask: opaque above ~67 % of the box, fully open from 80 %
    // (where the plate starts), patchy in between.
    const png = readFileSync(
      resolve(publicDir, "watercolor/portrait-dissolve.png"),
    );
    expect(
      existsSync(resolve(publicDir, "watercolor/portrait-stain.png")),
    ).toBe(true);
    expect(png.readUInt32BE(16) / png.readUInt32BE(20)).toBeCloseTo(3 / 4, 2);
  });

  it("is a static card by default, with no reveal markers", () => {
    const { container } = render(<SpecialistWatercolorCard {...anna} />);
    expect(card(container).tagName).toBe("ARTICLE");
    expect(card(container)).not.toHaveAttribute("data-animation");
    expect(container.querySelector(".ks-sp__matte")).toBeNull();
  });

  it("sends the finished card from the server, nothing hidden inline", () => {
    const html = renderToString(
      <SpecialistWatercolorCard {...anna} animationPreset="splash-reveal" />,
    );
    expect(html).toContain('data-animation="splash-reveal"');
    expect(html).toContain("Anna Nowak");
    expect(html).not.toContain("data-reveal");
    for (const [, inline] of html.matchAll(/style="([^"]*)"/g)) {
      expect(inline).not.toMatch(/opacity|mask|transform|visibility/);
    }
  });
});

describe("SpecialistsSection", () => {
  const section = (
    <SpecialistsSection
      specialists={sampleSpecialists}
      description="Doświadczony zespół specjalistów."
      cta={{ href: "#zespol", label: "Zobacz wszystkich specjalistów" }}
    />
  );

  it("introduces the team and links to all specialists", () => {
    render(section);
    expect(screen.getByText("Nasi specjaliści")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 2, name: "Poznaj nasz zespół" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Doświadczony zespół specjalistów."),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Zobacz wszystkich specjalistów" }),
    ).toHaveAttribute("href", "#zespol");
  });

  it("renders one card per specialist from the data, in order", () => {
    render(section);
    const items = within(screen.getByRole("list")).getAllByRole("listitem");
    expect(items).toHaveLength(sampleSpecialists.length);
    items.forEach((item, index) => {
      const person = sampleSpecialists[index]!;
      expect(
        within(item).getByRole("link", { name: person.name }),
      ).toHaveAttribute("href", person.href);
      expect(within(item).getByRole("img")).toHaveAccessibleName(
        `${person.name}, ${person.role.toLowerCase()}`,
      );
    });
  });

  it("stacks the cards on phones and lines three up from tablets", () => {
    const list = rule(".ks-sp-list");
    expect(list).toContain("max-width: 20rem");
    expect(list).not.toContain("grid-template-columns");
    const wide = css.slice(css.indexOf("@media (width >= 48rem)"));
    expect(wide).toContain("grid-template-columns: repeat(3, minmax(0, 1fr))");
  });

  it("marks every card of the row for the reveal when animated", () => {
    const { container } = render(
      <SpecialistsSection
        specialists={sampleSpecialists}
        animationPreset="splash-reveal"
      />,
    );
    const cards = container.querySelectorAll(".ks-sp");
    expect(cards).toHaveLength(3);
    for (const element of cards) {
      expect(element).toHaveAttribute("data-animation", "splash-reveal");
    }
  });
});
