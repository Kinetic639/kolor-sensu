import { render, screen, within } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { offerMatte } from "./offer-brush-matte.data";
import { sampleServices } from "./offer-samples";
import { OfferSection } from "./offer-section";
import { OfferTile } from "./offer-tile";

const here = dirname(fileURLToPath(import.meta.url));
const css = readFileSync(resolve(here, "public-site.css"), "utf8");
const publicDir = resolve(here, "../../../../apps/web/public");

const [individual, couples] = sampleServices;

function rule(selector: string) {
  const start = css.indexOf(`${selector} {`);
  expect(start, `${selector} is defined`).toBeGreaterThan(-1);
  return css.slice(start, css.indexOf("}", start));
}

function tile(container: HTMLElement) {
  return container.querySelector<HTMLElement>(".ks-of")!;
}

describe("OfferTile", () => {
  it("links the whole tile to the service by its title", () => {
    render(<OfferTile {...individual} />);
    const link = screen.getByRole("link", {
      name: "Psychoterapia indywidualna",
    });
    expect(link).toHaveAttribute("href", "#indywidualna");
    expect(
      screen.getByRole("heading", { level: 3, name: /indywidualna/ }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Przestrzeń na Ciebie i Twoje potrzeby."),
    ).toBeInTheDocument();
    // The overlay covers the tile: the root is its positioned ancestor and
    // the content is not positioned.
    expect(link.className).toMatch(/after:absolute/);
    expect(rule(".ks-of")).toContain("position: relative");
    expect(rule(".ks-of__content")).not.toContain("position");
    // The arrow sits above the overlay; clicks must pass through it.
    expect(css).toMatch(/\.ks-of__arrow \{\s*pointer-events: none;/);
  });

  it("keeps the paint, icon and arrow away from assistive technology", () => {
    const { container } = render(<OfferTile {...individual} />);
    expect(screen.queryByRole("img")).toBeNull();
    const paint = container.querySelector(".ks-of__paint")!;
    expect(paint).toHaveAttribute("aria-hidden", "true");
    expect(paint.querySelector("img")).toHaveAttribute("alt", "");
    for (const selector of [".ks-of__icon", ".ks-of__arrow"]) {
      expect(container.querySelector(selector)).toHaveAttribute(
        "aria-hidden",
        "true",
      );
    }
  });

  it("paints the supplied patch behind the tile, its painted area filling it", () => {
    const { container, rerender } = render(<OfferTile {...individual} />);
    const frame = () =>
      container.querySelector<HTMLElement>(".ks-of__paint-frame")!;
    expect(frame().querySelector("img")!.getAttribute("src")).toContain(
      "offer-sage-1.png",
    );
    // sage-1's painted area starts 14.83 % in from the left of its file, so
    // the file is shifted left and enlarged to put that edge at the tile's.
    const [left, top, right, bottom] = offerMatte.paints["sage-1"].frame;
    expect(parseFloat(frame().style.left)).toBeCloseTo(
      (-left / (right - left)) * 100,
      1,
    );
    expect(parseFloat(frame().style.width)).toBeCloseTo(
      100 / (right - left),
      1,
    );
    expect(parseFloat(frame().style.top)).toBeCloseTo(
      (-top / (bottom - top)) * 100,
      1,
    );

    rerender(<OfferTile {...couples} />);
    expect(frame().querySelector("img")!.getAttribute("src")).toContain(
      "offer-pink-1.png",
    );
  });

  it("measures every supplied patch from its own file", () => {
    for (const { src, width, height, frame } of Object.values(
      offerMatte.paints,
    )) {
      const png = readFileSync(resolve(publicDir, `.${src}`));
      expect([png.readUInt32BE(16), png.readUInt32BE(20)], src).toEqual([
        width,
        height,
      ]);
      const [left, top, right, bottom] = frame;
      expect(left).toBeLessThan(right);
      expect(top).toBeLessThan(bottom);
      // Stretched onto 5 : 8 by at most ~5 % (sage-2, the narrowest): too
      // little to see in the brushwork, and the tiles line up.
      const aspect = ((right - left) * width) / ((bottom - top) * height);
      expect(Math.abs(aspect / (5 / 8) - 1), src).toBeLessThan(0.06);
    }
    expect(rule(".ks-of")).toContain("aspect-ratio: 5 / 8");
  });

  it("draws the icon in paper colour, as if cut out of the paint", () => {
    expect(rule(".ks-of__icon")).toContain("color: var(--color-bg)");
    const { container } = render(<OfferTile {...couples} />);
    expect(container.querySelector(".ks-of__icon")!.className).not.toMatch(
      /text-(pink|primary)/,
    );
  });

  it("keeps text on paint in ink, not muted grey", () => {
    const { container } = render(<OfferTile {...individual} />);
    expect(container.querySelector(".ks-of__description")).toHaveClass(
      "text-ink/80",
    );
    expect(container.querySelector(".ks-of__title")).toHaveClass("text-ink");
  });

  it("is a static tile by default, and sends the finished tile from the server", () => {
    const { container } = render(<OfferTile {...individual} />);
    expect(tile(container)).not.toHaveAttribute("data-animation");

    const html = renderToString(
      <OfferTile {...individual} animationPreset="brush-reveal" />,
    );
    expect(html).toContain('data-animation="brush-reveal"');
    expect(html).not.toContain("data-reveal");
    for (const [, inline] of html.matchAll(/style="([^"]*)"/g)) {
      expect(inline).not.toMatch(/opacity|mask|transform|visibility/);
    }
  });
});

describe("OfferSection", () => {
  it("introduces the offer and links to all of it", () => {
    render(
      <OfferSection
        services={sampleServices}
        description="Oferujemy terapię."
        cta={{ href: "#oferta", label: "Zobacz całą ofertę" }}
      />,
    );
    expect(screen.getByText("Nasza oferta")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", {
        level: 2,
        name: "Wsparcie w różnych obszarach życia",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Zobacz całą ofertę" }),
    ).toHaveAttribute("href", "#oferta");
  });

  it("renders one tile per service from the data, in order", () => {
    render(<OfferSection services={sampleServices} />);
    const items = within(screen.getByRole("list")).getAllByRole("listitem");
    expect(items).toHaveLength(sampleServices.length);
    items.forEach((item, index) => {
      const service = sampleServices[index]!;
      expect(
        within(item).getByRole("link", { name: service.title }),
      ).toHaveAttribute("href", service.href);
    });
  });

  it("shows 2 x 2 on phones and a row of four from tablets", () => {
    expect(rule(".ks-of-list")).toContain(
      "grid-template-columns: repeat(2, minmax(0, 1fr))",
    );
    const wide = css.slice(
      css.indexOf("@media (width >= 48rem)", css.indexOf(".ks-of-list")),
    );
    expect(wide).toContain("grid-template-columns: repeat(4, minmax(0, 1fr))");
  });

  it("marks every tile for the reveal when animated", () => {
    const { container } = render(
      <OfferSection services={sampleServices} animationPreset="brush-reveal" />,
    );
    const tiles = container.querySelectorAll(".ks-of");
    expect(tiles).toHaveLength(4);
    for (const element of tiles) {
      expect(element).toHaveAttribute("data-animation", "brush-reveal");
    }
  });
});
