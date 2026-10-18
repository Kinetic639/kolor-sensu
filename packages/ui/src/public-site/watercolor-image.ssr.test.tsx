// Server rendering path (react-dom/server), independent of any browser API
// the component could reach for.
import { readdirSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { WatercolorImage } from "./watercolor-image";

const here = dirname(fileURLToPath(import.meta.url));

describe("WatercolorImage on the server", () => {
  it("has no client-only code", () => {
    for (const file of [
      "watercolor-image.tsx",
      "botanical-accent.tsx",
      "typography.tsx",
      "actions.tsx",
      "surfaces.tsx",
      "specialist-card.tsx",
      "specialist-artwork.tsx",
      "specialist-info-plate.tsx",
      "specialists-section.tsx",
      "offer-tile.tsx",
      "offer-section.tsx",
      "hero-section.tsx",
      "hero-points.tsx",
      "feature-section.tsx",
      "site-layout.tsx",
      "site-header.tsx",
      "site-footer.tsx",
      "site-logo.tsx",
      "site-breadcrumbs.tsx",
      "faq-section.tsx",
      "skip-link.tsx",
      "social-icons.tsx",
      "json-ld.tsx",
    ]) {
      const source = readFileSync(resolve(here, file), "utf8");
      expect(source, file).not.toMatch(/^["']use client["']/m);
      expect(source, file).not.toMatch(
        /\buse(State|Effect|LayoutEffect|Ref)\b/,
      );
    }
  });

  it("keeps client-only code to small islands: reveals, caption motion, intro motion, navigation, cookie notice, room gallery, rooms peek, cursor ring, first steps, painted story, support areas, thoughts lens", () => {
    const clientFiles = readdirSync(here)
      .filter(
        (file) => /\.tsx?$/.test(file) && !/\.(test|stories)\./.test(file),
      )
      .filter((file) =>
        /^["']use client["']/m.test(readFileSync(resolve(here, file), "utf8")),
      )
      .sort();

    expect(clientFiles).toEqual([
      "cookie-consent.tsx",
      "cursor-ring.tsx",
      "first-steps.tsx",
      "intro-motion.tsx",
      "offer-reveal.tsx",
      "painted-story.tsx",
      "room-gallery.tsx",
      "rooms-peek.tsx",
      "site-mobile-nav.tsx",
      "site-navigation.tsx",
      "specialist-reveal.tsx",
      "support-areas.tsx",
      "thoughts-lens.tsx",
      "watercolor-caption-motion.tsx",
      "watercolor-reveal.tsx",
    ]);
  });

  it("renders the finished composition to HTML", () => {
    const html = renderToString(
      <WatercolorImage
        src="/kolor-sensu/therapy-room-upload.png"
        alt="Jasny gabinet przy oknie"
        caption="Przestrzeń dla ważnych rozmów"
        objectPosition="52% 44%"
        priority
      />,
    );

    expect(html).toContain("<figure");
    // Backdrop layer, decorative.
    expect(html).toMatch(
      /class="ks-wc__backdrop" aria-hidden="true"><img alt=""[^>]+watercolor-background\.webp/,
    );
    // Photo layer with the semantic image and its crop position.
    expect(html).toMatch(
      /class="ks-wc__photo"><img alt="Jasny gabinet przy oknie"[^>]+object-position:52% 44%/,
    );
    expect(html).toContain("Przestrzeń dla ważnych rozmów");
    expect(html).not.toContain("data-paint");
  });

  it("preloads the photo's brush mask for the hero, which paints only once it is in", () => {
    const preloadsMask = (html: string) =>
      /<link rel="preload"[^>]*href="\/watercolor\/photo-mask\.png"/.test(html);
    const props = { src: "/kolor-sensu/therapy-room-upload.png", alt: "" };
    expect(
      preloadsMask(renderToString(<WatercolorImage {...props} priority />)),
    ).toBe(true);
    expect(preloadsMask(renderToString(<WatercolorImage {...props} />))).toBe(
      false,
    );
  });
});
