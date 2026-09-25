// Server rendering path (react-dom/server), independent of any browser API
// the component could reach for.
import { readFileSync } from "node:fs";
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
    ]) {
      const source = readFileSync(resolve(here, file), "utf8");
      expect(source, file).not.toMatch(/^["']use client["']/m);
      expect(source, file).not.toMatch(
        /\buse(State|Effect|LayoutEffect|Ref)\b/,
      );
    }
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
});
