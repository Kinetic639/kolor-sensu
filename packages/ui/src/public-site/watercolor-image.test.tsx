import { render, screen } from "@testing-library/react";
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { defaultWatercolorSrc, WatercolorImage } from "./watercolor-image";
import { revealMaskUrls } from "./watercolor-reveal-timeline";

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
      expect(selector).toMatch(/\[data-(animation|reduced-motion|reveal)[=\]]/);
    }
  });
});

describe("WatercolorImage reveal styles", () => {
  const revealRules = () =>
    cssRules().filter(({ selector }) =>
      selector.includes('[data-animation="watercolor-reveal"]'),
    );
  const revealRule = (layer: string) => {
    const found = revealRules().find(
      ({ selector, context }) =>
        selector.endsWith(layer) &&
        context.includes(
          "@media (scripting: enabled) and (prefers-reduced-motion: no-preference)",
        ),
    );
    expect(found, `reveal rule for ${layer}`).toBeDefined();
    return found!.body;
  };

  it("hides the layers only while the script runs and motion is allowed", () => {
    for (const layer of [
      ".ks-wc__backdrop",
      ".ks-wc__photo",
      ".ks-wc__img",
      ".ks-wc__caption",
    ]) {
      const found = revealRules().find(({ selector }) =>
        selector.endsWith(layer),
      );
      expect(found?.selector).toContain(':not([data-reveal="done"]');
      expect(found?.context).toContain(
        "@media (scripting: enabled) and (prefers-reduced-motion: no-preference)",
      );
    }
  });

  it("paints the backdrop with brush masks from both edges toward the centre", () => {
    const body = revealRule(".ks-wc__backdrop");

    for (const side of ["left", "right"]) {
      expect(body).toContain(`url("/watercolor/reveal-backdrop-${side}.png")`);
      expect(body).toContain(
        `url("/watercolor/reveal-backdrop-${side}-wash.png")`,
      );
    }
    expect(body).toContain("mask-composite: add");
    expect(body).toMatch(
      /var\(--ks-reveal-left, 0\)[\s\S]*var\(--ks-reveal-right, 0\)/,
    );
    expect(body).not.toMatch(/clip-path|linear-gradient/);

    // Each brush mask is twice the box wide: half painted, half empty, with
    // the brush front in the middle.
    for (const side of ["left", "right"]) {
      for (const suffix of ["", "-wash"]) {
        const { width, height } = pngSize(
          `watercolor/reveal-backdrop-${side}${suffix}.png`,
        );
        expect(width / height).toBeCloseTo(2 * 1.6, 2);
      }
    }
  });

  it("spreads the photo from its centre, under the untouched photo mask", () => {
    const body = revealRule(".ks-wc__img");

    expect(body).toContain('mask-image: url("/watercolor/reveal-photo.png")');
    expect(body).toContain("mask-position: 50% 50%");
    expect(body).toMatch(
      /var\(--ks-reveal-photo-x, 0\)[\s\S]*var\(--ks-reveal-photo-y, 0\)/,
    );
    // The photo layer keeps its static mask while the image is revealed
    // inside it, so the painted edge never changes and the last frame is
    // the static composition.
    expect(revealRule(".ks-wc__photo")).not.toMatch(/mask/);

    const reveal = pngSize("watercolor/reveal-photo.png");
    const mask = pngSize("watercolor/photo-mask.png");
    expect(reveal.width / reveal.height).toBeCloseTo(
      mask.width / mask.height,
      2,
    );
  });

  it("brings the caption in with a small drift, not a slide", () => {
    const body = revealRule(".ks-wc__caption");

    expect(body).toContain("opacity: var(--ks-reveal-caption, 0)");
    const drift = body.match(
      /translate: 0 calc\(\(1 - var\(--ks-reveal-caption, 0\)\) \* ([\d.]+)em\)/,
    );
    expect(drift).not.toBeNull();
    expect(Number(drift![1])).toBeLessThanOrEqual(0.5);
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
      "--ks-reveal-left: 1",
      "--ks-reveal-right: 1",
      "--ks-reveal-photo-x: 1",
      "--ks-reveal-photo-y: 1",
      "--ks-reveal-dry: 1",
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

  it("preloads exactly the mask files the styles use", () => {
    const used = [
      ...new Set(
        revealRules().flatMap(({ body }) =>
          [...body.matchAll(/url\("([^"]+)"\)/g)].map((match) => match[1]),
        ),
      ),
    ].filter((url) => url !== "/watercolor/photo-mask.png");

    expect([...revealMaskUrls].sort()).toEqual(used.sort());
    for (const url of revealMaskUrls) {
      expect(existsSync(resolve(publicDir, `.${url}`)), url).toBe(true);
    }
  });
});
