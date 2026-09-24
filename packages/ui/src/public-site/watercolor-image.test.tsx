import { render, screen } from "@testing-library/react";
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  WatercolorImage,
  watercolorShapes,
  watercolorTones,
} from "./watercolor-image";

const here = dirname(fileURLToPath(import.meta.url));
const css = readFileSync(resolve(here, "public-site.css"), "utf8");
const theme = readFileSync(
  resolve(here, "../../../design-system/src/public-theme.css"),
  "utf8",
);
const maskDir = resolve(here, "../../../../apps/web/public/watercolor");

const base = {
  src: "/kolor-sensu/room.jpg",
  alt: "Gabinet z fotelem przy oknie",
};

// CSS block for one selector, e.g. ".ks-wc--sage { ... }".
function rule(selector: string) {
  const start = css.indexOf(`${selector} {`);
  expect(start, `${selector} is defined`).toBeGreaterThan(-1);
  return css.slice(start, css.indexOf("}", start));
}

describe("WatercolorImage", () => {
  it("renders the photo with its alt text", () => {
    render(<WatercolorImage {...base} />);

    expect(
      screen.getByRole("img", { name: "Gabinet z fotelem przy oknie" }),
    ).toBeInTheDocument();
  });

  it("hides every decorative layer from assistive technology", () => {
    const { container } = render(
      <WatercolorImage
        {...base}
        accent="sprig"
        caption="Przestrzeń dla ważnych rozmów"
      />,
    );

    const washes = container.querySelectorAll(".ks-wc__wash");
    expect(washes).toHaveLength(2);
    washes.forEach((wash) =>
      expect(wash).toHaveAttribute("aria-hidden", "true"),
    );
    expect(container.querySelector(".ks-wc__accent")).toHaveAttribute(
      "aria-hidden",
      "true",
    );
    expect(container.querySelector(".ks-wc__underline")).toHaveAttribute(
      "aria-hidden",
      "true",
    );
    // Only the photo is exposed as an image.
    expect(screen.getAllByRole("img")).toHaveLength(1);
  });

  it("renders the handwritten overlay as a real figure caption", () => {
    const { container } = render(
      <WatercolorImage {...base} caption="Przestrzeń dla ważnych rozmów" />,
    );

    const figure = screen.getByRole("figure");
    const caption = container.querySelector("figcaption");
    expect(figure).toContainElement(caption);
    expect(caption).toHaveTextContent("Przestrzeń dla ważnych rozmów");
    expect(caption).toHaveClass("ks-wc__caption", "ks-wc__caption--light");
  });

  it("renders a plain container without a caption", () => {
    const { container } = render(<WatercolorImage {...base} />);

    expect(container.querySelector("figure")).toBeNull();
    expect(container.querySelector("figcaption")).toBeNull();
    expect(container.firstElementChild?.tagName).toBe("DIV");
  });

  it("applies shape and tone classes", () => {
    const { container } = render(
      <WatercolorImage {...base} shape="portrait-soft" tone="blush" />,
    );
    const root = container.firstElementChild;

    expect(root).toHaveClass("ks-wc", "ks-wc--portrait-soft", "ks-wc--blush");
    expect(root).toHaveAttribute("data-shape", "portrait-soft");
    expect(root).toHaveAttribute("data-tone", "blush");
  });

  it("maps every shape to an existing painted mask", () => {
    for (const shape of watercolorShapes) {
      const mask = `mask-${shape}.svg`;
      expect(rule(`.ks-wc--${shape}`)).toContain(`/watercolor/${mask}`);
      expect(existsSync(resolve(maskDir, mask)), mask).toBe(true);
    }
    for (const file of ["wash-a.svg", "wash-b.svg", "wipe.svg", "paper.svg"]) {
      expect(existsSync(resolve(maskDir, file)), file).toBe(true);
    }
  });

  it("maps every tone to palette tokens only", () => {
    for (const tone of watercolorTones) {
      const block = rule(`.ks-wc--${tone}`);
      const values = [...block.matchAll(/--ks-wash-\w+:\s*([^;]+);/g)].map(
        (match) => match[1] ?? "",
      );

      expect(values).toHaveLength(2);
      for (const value of values) {
        const token = value.match(/^var\((--color-[\w-]+)\)$/)?.[1];
        expect(token, `${tone}: ${value}`).toBeDefined();
        expect(theme).toContain(`${token}:`);
      }
    }
  });

  it("is lazy by default and eager with high priority for the hero", () => {
    const { rerender } = render(<WatercolorImage {...base} />);
    const lazy = screen.getByRole("img");
    expect(lazy).toHaveAttribute("loading", "lazy");
    expect(lazy).not.toHaveAttribute("fetchpriority");

    rerender(<WatercolorImage {...base} priority />);
    const eager = screen.getByRole("img");
    expect(eager).not.toHaveAttribute("loading", "lazy");
    expect(eager).toHaveAttribute("fetchpriority", "high");
  });

  it("uses responsive sizes and fills a box with a fixed ratio", () => {
    const { container } = render(
      <WatercolorImage
        {...base}
        aspectRatio="21 / 9"
        focalPoint="30% 40%"
        sizes="50vw"
      />,
    );
    const root = container.firstElementChild as HTMLElement;
    const img = screen.getByRole("img");

    expect(root.style.getPropertyValue("--ks-wc-ratio")).toBe("21 / 9");
    expect(root.style.getPropertyValue("--ks-wc-focus")).toBe("30% 40%");
    expect(img).toHaveAttribute("sizes", "50vw");
    expect(img).toHaveAttribute("srcset");
    // The ratio box reserves space before the image loads: no layout shift.
    expect(rule(".ks-wc")).toContain("aspect-ratio: var(--ks-wc-ratio");
  });

  it("marks on-load painting only when asked", () => {
    const { container, rerender } = render(<WatercolorImage {...base} />);
    expect(container.firstElementChild).not.toHaveAttribute("data-paint");

    rerender(<WatercolorImage {...base} paint="on-load" />);
    expect(container.firstElementChild).toHaveAttribute("data-paint", "load");
  });

  it("can drop the washes", () => {
    const { container } = render(<WatercolorImage {...base} washes={false} />);

    expect(container.querySelectorAll(".ks-wc__wash")).toHaveLength(0);
  });
});
