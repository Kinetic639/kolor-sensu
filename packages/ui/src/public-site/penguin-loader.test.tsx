// PenguinLoader: the logo's penguin in a loop (eyes by SMIL, the rest by
// CSS), with no client JavaScript; and WatercolorImage's `mark`, the
// decorative overlay the homepage hero puts it in.
import { render } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { HeroSection } from "./hero-section";
import { introPenguin } from "./intro-penguin.data";
import { PenguinLoader } from "./penguin-loader";
import { WatercolorImage } from "./watercolor-image";

describe("PenguinLoader", () => {
  it("is decorative unless it is given a name", () => {
    const { container, rerender } = render(<PenguinLoader />);
    const svg = container.querySelector("svg")!;
    expect(svg).toHaveAttribute("aria-hidden", "true");
    expect(svg).not.toHaveAttribute("role");

    rerender(<PenguinLoader label="Ładowanie" />);
    expect(container.querySelector("svg")).toHaveAttribute("role", "img");
    expect(container.querySelector("svg")).toHaveAccessibleName("Ładowanie");
  });

  it("morphs its eyes in the SVG itself: open, blink, open, smile, open", () => {
    const { container } = render(<PenguinLoader />);
    const morphs = [
      ...container.querySelectorAll(".ks-penguin__eyes animate"),
    ].filter((animate) => animate.getAttribute("attributeName") === "d");
    expect(morphs).toHaveLength(2);
    const [left] = morphs;
    const values = left!.getAttribute("values")!.split(";");
    expect(values).toContain(introPenguin.eyes.blink.left);
    expect(values).toContain(introPenguin.eyes.smile.left);
    expect(values.at(0)).toBe(introPenguin.eyes.open.left);
    expect(values.at(-1)).toBe(introPenguin.eyes.open.left);
    expect(left).toHaveAttribute("repeatCount", "indefinite");
    // The still smile for reduced motion is there too (CSS swaps them).
    expect(
      container.querySelectorAll(".ks-penguin__eyes-still path"),
    ).toHaveLength(2);
  });

  it('plays only when marked for it; animation="none" is the still logo', () => {
    const { container, rerender } = render(<PenguinLoader />);
    expect(container.querySelector("svg")).toHaveAttribute(
      "data-animation",
      "loop",
    );
    rerender(<PenguinLoader animation="none" />);
    const svg = container.querySelector("svg")!;
    expect(svg).not.toHaveAttribute("data-animation");
    expect(svg.querySelector("animate")).toBeNull();
    expect(svg.querySelectorAll(".ks-penguin__eyes-still path")).toHaveLength(
      2,
    );
  });

  it("shows the head through both leaves, undoing each leaf's own flap", () => {
    const { container } = render(<PenguinLoader />);
    for (const side of ["left", "right"]) {
      const leaf = container.querySelector(
        `.ks-penguin__leaf[data-side="${side}"]`,
      )!;
      expect(
        leaf.querySelector(`.ks-penguin__unflap[data-side="${side}"]`),
      ).not.toBeNull();
    }
  });

  it("keeps its clip paths apart when several share a page", () => {
    const html = renderToString(
      <>
        <PenguinLoader />
        <PenguinLoader />
      </>,
    );
    const ids = [...html.matchAll(/<clipPath id="([^"]+)"/g)].map((m) => m[1]);
    expect(ids).toHaveLength(6);
    expect(new Set(ids).size).toBe(6);
    for (const id of ids) expect(html).toContain(`url(#${id})`);
  });
});

describe("WatercolorImage mark", () => {
  it("puts a decorative overlay in the caption's place, hidden from assistive technology", () => {
    const { container } = render(
      <WatercolorImage
        src="/kolor-sensu/therapy-room-upload.png"
        alt="Jasny gabinet"
        mark={<PenguinLoader />}
      />,
    );
    const mark = container.querySelector(".ks-wc__mark")!;
    expect(mark).toHaveAttribute("aria-hidden", "true");
    expect(mark.querySelector("svg.ks-penguin")).not.toBeNull();
    // A mark is not a caption: no <figure>, no <figcaption>.
    expect(container.querySelector("figure")).toBeNull();
    expect(container.querySelector("figcaption")).toBeNull();
  });

  it("is passed through by the hero", () => {
    const { container } = render(
      <HeroSection
        heading="Miejsce, w którym możesz być sobą"
        image={{
          src: "/kolor-sensu/therapy-room-upload.png",
          alt: "Jasny gabinet",
          mark: <PenguinLoader />,
        }}
      />,
    );
    expect(container.querySelector(".ks-wc__mark svg")).not.toBeNull();
  });
});
