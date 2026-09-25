import { render, screen } from "@testing-library/react";
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { defaultWatercolorSrc, WatercolorImage } from "./watercolor-image";

const here = dirname(fileURLToPath(import.meta.url));
const css = readFileSync(resolve(here, "public-site.css"), "utf8");
const publicDir = resolve(here, "../../../../apps/web/public");

const base = {
  src: "/kolor-sensu/therapy-room-upload.png",
  alt: "Gabinet z fotelem przy oknie",
};

// CSS block for one selector, e.g. ".ks-wc__photo { ... }".
function rule(selector: string) {
  const start = css.indexOf(`${selector} {`);
  expect(start, `${selector} is defined`).toBeGreaterThan(-1);
  return css.slice(start, css.indexOf("}", start));
}

function backdropImage(container: HTMLElement) {
  return container.querySelector(".ks-wc__backdrop img");
}

describe("WatercolorImage", () => {
  it("renders the source photo as the one semantic image, with its alt text", () => {
    render(<WatercolorImage {...base} />);

    const photo = screen.getByRole("img", {
      name: "Gabinet z fotelem przy oknie",
    });
    expect(photo).toHaveAttribute(
      "src",
      expect.stringContaining("therapy-room-upload.png"),
    );
    // The backdrop is not exposed: only the photo is an image to AT.
    expect(screen.getAllByRole("img")).toHaveLength(1);
  });

  it("renders the watercolor backdrop as a decorative layer behind the photo", () => {
    const { container } = render(<WatercolorImage {...base} />);

    const backdrop = container.querySelector(".ks-wc__backdrop");
    expect(backdrop).toHaveAttribute("aria-hidden", "true");
    expect(backdropImage(container)).toHaveAttribute("alt", "");
    expect(backdropImage(container)).toHaveAttribute(
      "src",
      expect.stringContaining("watercolor-background.webp"),
    );
    // Backdrop first, photo second: the photo is painted on top.
    expect(backdrop?.nextElementSibling).toHaveClass("ks-wc__photo");
    expect(existsSync(resolve(publicDir, `.${defaultWatercolorSrc}`))).toBe(
      true,
    );
  });

  it("accepts another backdrop asset, or none", () => {
    const { container, rerender } = render(
      <WatercolorImage {...base} watercolorSrc="/watercolor/other.webp" />,
    );
    expect(backdropImage(container)).toHaveAttribute(
      "src",
      expect.stringContaining("other.webp"),
    );

    rerender(<WatercolorImage {...base} watercolorSrc={null} />);
    expect(container.querySelector(".ks-wc__backdrop")).toBeNull();
    expect(screen.getByRole("img")).toBeInTheDocument();
  });

  it("cuts the photo with the dry-brush alpha mask, not a geometric shape", () => {
    render(<WatercolorImage {...base} />);

    const layer = screen.getByRole("img").parentElement;
    expect(layer).toHaveClass("ks-wc__photo");

    const photoRule = rule(".ks-wc__photo");
    expect(photoRule).toContain(
      'mask-image: url("/watercolor/photo-mask.png")',
    );
    expect(photoRule).toContain("mask-size: 100% 100%");
    expect(photoRule).not.toMatch(/border-radius|clip-path/);
    expect(existsSync(resolve(publicDir, "watercolor/photo-mask.png"))).toBe(
      true,
    );
  });

  it("keeps the mask undistorted and smaller than the backdrop", () => {
    // Mask canvas size from the PNG header.
    const png = readFileSync(resolve(publicDir, "watercolor/photo-mask.png"));
    const maskRatio = png.readUInt32BE(16) / png.readUInt32BE(20);
    // Colour type 3 + tRNS: every pixel carries an alpha value.
    expect(png[25]).toBe(3);
    expect(png.includes(Buffer.from("tRNS"))).toBe(true);

    // Photo layer box in the default 16 / 10 composition.
    const inset = rule(".ks-wc__photo").match(
      /inset: (-?[\d.]+)% (-?[\d.]+)% (-?[\d.]+)% (-?[\d.]+)%/,
    );
    expect(inset).not.toBeNull();
    const [top, right, bottom, left] = (inset ?? [])
      .slice(1)
      .map((value) => Number(value));
    const width = (100 - left! - right!) * 16;
    const height = (100 - top! - bottom!) * 10;
    expect(width / height).toBeCloseTo(maskRatio, 1);

    // The backdrop spans the whole box; the photo is inset from it, so the
    // watercolor shows around the photo (most on the left and right).
    expect(rule(".ks-wc__backdrop")).toContain("inset: 0");
    expect(left).toBeGreaterThan(0);
    expect(right).toBeGreaterThan(0);
  });

  it("crops any upload itself with object-fit and a configurable position", () => {
    const { rerender } = render(<WatercolorImage {...base} />);
    expect(rule(".ks-wc__img")).toContain("object-fit: cover");
    expect(screen.getByRole("img").style.objectPosition).toBe("50% 50%");

    rerender(<WatercolorImage {...base} objectPosition="52% 44%" />);
    expect(screen.getByRole("img").style.objectPosition).toBe("52% 44%");
  });

  it("is lazy by default and preloaded with high priority for the hero", () => {
    const { container, rerender } = render(<WatercolorImage {...base} />);
    const lazy = screen.getByRole("img");
    expect(lazy).toHaveAttribute("loading", "lazy");
    expect(lazy).not.toHaveAttribute("fetchpriority");
    expect(backdropImage(container)).toHaveAttribute("loading", "lazy");

    rerender(<WatercolorImage {...base} priority />);
    const eager = screen.getByRole("img");
    expect(eager).not.toHaveAttribute("loading", "lazy");
    expect(eager).toHaveAttribute("fetchpriority", "high");
    expect(backdropImage(container)).toHaveAttribute("loading", "eager");
  });

  it("passes responsive sizes to both layers and reserves a fixed ratio", () => {
    const { container } = render(
      <WatercolorImage {...base} aspectRatio="3 / 2" sizes="50vw" />,
    );
    const root = container.firstElementChild as HTMLElement;
    const photo = screen.getByRole("img");

    expect(photo).toHaveAttribute("sizes", "50vw");
    expect(photo).toHaveAttribute("srcset");
    expect(backdropImage(container)).toHaveAttribute("sizes", "50vw");
    expect(root.style.getPropertyValue("--ks-wc-ratio")).toBe("3 / 2");
    // The ratio box reserves space before the images load: no layout shift.
    expect(rule(".ks-wc")).toContain(
      "aspect-ratio: var(--ks-wc-ratio, 16 / 10)",
    );
  });

  it("renders the handwritten overlay as a real figure caption", () => {
    const { container } = render(
      <WatercolorImage {...base} caption="Przestrzeń dla ważnych rozmów" />,
    );

    const figure = screen.getByRole("figure");
    const caption = container.querySelector("figcaption");
    expect(figure).toContainElement(caption);
    expect(caption).toHaveTextContent("Przestrzeń dla ważnych rozmów");
    expect(container.querySelector(".ks-wc__underline")).toHaveAttribute(
      "aria-hidden",
      "true",
    );
  });

  it("renders a plain container without a caption", () => {
    const { container } = render(<WatercolorImage {...base} />);

    expect(container.querySelector("figure")).toBeNull();
    expect(container.firstElementChild?.tagName).toBe("DIV");
  });

  it("is static: no animation state in the markup or the styles", () => {
    const { container } = render(<WatercolorImage {...base} priority />);

    expect(container.querySelector("[data-paint]")).toBeNull();
    expect(css).not.toMatch(/@keyframes|animation|transition|data-paint/);
  });
});
