import { render, screen } from "@testing-library/react";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { defaultWatercolorSrc, WatercolorImage } from "./watercolor-image";
import { paintMatteUrls } from "./watercolor-paint-matte";
import { paintMatte } from "./watercolor-paint-matte.data";
import { watercolorSplash } from "./watercolor-splash-matte.data";

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

// Every style rule with the at-rules around it, e.g. the rules inside
// "@media (scripting: enabled)".
function cssRules() {
  const rules: Array<{ selector: string; body: string; context: string[] }> =
    [];
  const open: string[] = [];
  let buffer = "";
  for (const char of css.replace(/\/\*[\s\S]*?\*\//g, "")) {
    if (char === "{") {
      open.push(buffer.split(";").pop()!.trim());
      buffer = "";
    } else if (char === "}") {
      const selector = open
        .pop()!
        .replace(/\s+/g, " ")
        .replace(/\(\s/g, "(")
        .replace(/\s\)/g, ")");
      if (buffer.trim()) {
        rules.push({ selector, body: buffer.trim(), context: [...open] });
      }
      buffer = "";
    } else {
      buffer += char;
    }
  }
  return rules;
}

function pngSize(file: string) {
  const png = readFileSync(resolve(publicDir, file));
  return { width: png.readUInt32BE(16), height: png.readUInt32BE(20) };
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

  it("keeps the mask undistorted and its paint inside the backdrop's box", () => {
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

    // The backdrop spans the whole box. The photo's box may overhang it a
    // little, but never by more than the mask's transparent margin
    // (generate-photo-mask.mjs: 53 of 1500 px at the sides, 17 of 1000 at
    // the top, 50 at the bottom), so its paint stays inside the box and the
    // watercolor still shows around it.
    expect(rule(".ks-wc__backdrop")).toContain("inset: 0");
    const photoWidth = 100 - left! - right!;
    const photoHeight = 100 - top! - bottom!;
    expect(left! + (53 / 1500) * photoWidth).toBeGreaterThan(0);
    expect(right! + (53 / 1500) * photoWidth).toBeGreaterThan(0);
    expect(top! + (17 / 1000) * photoHeight).toBeGreaterThanOrEqual(0);
    expect(bottom! + (50 / 1000) * photoHeight).toBeGreaterThan(0);
    // Larger than the approved target's footprint (90 % of the width).
    expect(photoWidth).toBeGreaterThan(95);
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

  it("keeps the static composition free of animation", () => {
    const { container } = render(<WatercolorImage {...base} priority />);

    expect(
      container.querySelector("[data-animation], [data-reveal]"),
    ).toBeNull();
    // Whatever animates only targets components marked for the reveal; the
    // base rules of the static composition never read a reveal value.
    for (const { selector, body, context } of cssRules()) {
      if (!/--ks-reveal|animation\b/.test(body)) continue;
      if (context.some((at) => at.startsWith("@keyframes"))) continue;
      expect(selector).toMatch(
        /\[data-(animation|reduced-motion|reveal|intro)[=\]]/,
      );
    }
  });
});

describe("WatercolorImage reveal styles", () => {
  const whilePainting =
    "@media (scripting: enabled) and (prefers-reduced-motion: no-preference)";
  const svgMasksWork = "@supports not (font: -apple-system-body)";
  const revealRules = () =>
    cssRules().filter(({ selector }) =>
      selector.includes('[data-animation="watercolor-reveal"]'),
    );
  const paintingRules = () =>
    revealRules().filter(({ context }) => context.includes(whilePainting));
  const paintingRule = (layer: string) => {
    const found = paintingRules().find(({ selector }) =>
      selector.endsWith(layer),
    );
    expect(found, `reveal rule for ${layer}`).toBeDefined();
    return found!;
  };

  it("hides the layers only while the script runs, motion is allowed and SVG masks work", () => {
    for (const layer of [
      '.ks-wc[data-animation="watercolor-reveal"]:not([data-reveal="done"])',
      ".ks-wc__backdrop",
      ".ks-wc__img",
      ".ks-wc__caption",
    ]) {
      const { selector, context } = paintingRule(layer);
      expect(selector).toContain(':not([data-reveal="done"])');
      expect(context).toContain(svgMasksWork);
    }
  });

  it("masks the backdrop and the photo image with the paint matte, and nothing else", () => {
    // Until the script sets the matte, an empty mask: nothing is painted.
    expect(
      paintingRule(
        '.ks-wc[data-animation="watercolor-reveal"]:not([data-reveal="done"])',
      ).body,
    ).toBe("--ks-reveal-hidden: linear-gradient(transparent, transparent);");
    expect(paintingRule(".ks-wc__backdrop").body).toBe(
      "mask-image: var(--ks-reveal-backdrop, var(--ks-reveal-hidden));",
    );
    expect(paintingRule(".ks-wc__img").body).toBe(
      "mask-image: var(--ks-reveal-photo, var(--ks-reveal-hidden));",
    );

    // The photo layer keeps its static photo mask, so the painted edge of
    // the photo never changes. No wipe, fade, blur or geometric reveal of
    // the painted layers: they are only masked by the matte.
    for (const { selector, body } of paintingRules()) {
      expect(selector).not.toMatch(/\.ks-wc__photo$/);
      expect(body).not.toMatch(
        /clip-path|filter|blur|mask-(size|position|composite)|transform|translate|scale|url\(/,
      );
      if (!selector.endsWith(".ks-wc__caption")) {
        expect(body).not.toContain("opacity");
      }
    }
  });

  it("shows the caption late, with a fade and no movement", () => {
    expect(paintingRule(".ks-wc__caption").body).toBe(
      "opacity: var(--ks-reveal-caption, 0);",
    );
  });

  it("keeps the matte out of the layout without switching it off", () => {
    const matte = rule(".ks-wc__matte");
    expect(matte).toContain("position: absolute");
    expect(matte).toContain("width: 0");
    expect(matte).toContain("height: 0");
    // display: none would disable the masks it holds.
    expect(matte).not.toContain("display");
  });

  it("falls back to the finished composition if the script never takes over", () => {
    const fallback = revealRules().find(({ selector }) =>
      selector.endsWith(":not([data-reveal])"),
    );
    expect(fallback?.context).toContain("@media (scripting: enabled)");
    const name = fallback?.body.match(
      /animation: ([\w-]+) 1ms ([\d.]+)s forwards/,
    );
    expect(name).not.toBeNull();
    expect(Number(name![2])).toBeLessThanOrEqual(3);

    const frame = cssRules().find(({ context }) =>
      context.includes(`@keyframes ${name![1]}`),
    );
    for (const property of [
      "--ks-reveal-hidden: none",
      "--ks-reveal-caption: 1",
      "--ks-reveal-fade: 1",
    ]) {
      expect(frame?.body).toContain(property);
    }
  });

  it("fades instead of painting when reduced motion asks for it", () => {
    const fade = revealRules().find(
      ({ selector, context }) =>
        selector.includes('[data-reduced-motion="simple-fade"]') &&
        context.includes(
          "@media (scripting: enabled) and (prefers-reduced-motion: reduce)",
        ),
    );
    expect(fade?.body).toBe("opacity: var(--ks-reveal-fade, 0);");
  });

  it("ships the backdrop's stroke atlas and the photo's time map, and no old reveal masks", () => {
    expect(paintMatteUrls).toEqual([
      ...Object.values(paintMatte).map((layer) => layer.atlas.src),
      watercolorSplash.photo.time.src,
    ]);
    expect(pngSize(`.${watercolorSplash.photo.time.src}`)).toEqual({
      width: watercolorSplash.photo.time.width,
      height: watercolorSplash.photo.time.height,
    });
    // The photo's old stroke atlas is gone.
    expect(
      existsSync(resolve(publicDir, "watercolor/paint-matte-photo.png")),
    ).toBe(false);
    for (const layer of Object.values(paintMatte)) {
      const file = `.${layer.atlas.src}`;
      expect(existsSync(resolve(publicDir, file)), file).toBe(true);
      expect(pngSize(file)).toEqual({
        width: layer.atlas.width,
        height: layer.atlas.height,
      });
    }
    expect(
      readdirSync(resolve(publicDir, "watercolor")).filter((file) =>
        file.startsWith("reveal-"),
      ),
    ).toEqual([]);
  });
});
