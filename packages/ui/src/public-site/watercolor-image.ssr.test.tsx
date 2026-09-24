// Server rendering path (react-dom/server), independent of any browser API
// the component could reach for.
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { AnimatedWatercolorImage } from "./animated-watercolor-image";
import { WatercolorImage } from "./watercolor-image";

const here = dirname(fileURLToPath(import.meta.url));

describe("WatercolorImage on the server", () => {
  it("has no client-only code", () => {
    for (const file of [
      "watercolor-image.tsx",
      "animated-watercolor-image.tsx",
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

  it("renders the finished picture, alt text and caption to HTML", () => {
    const html = renderToString(
      <WatercolorImage
        src="/kolor-sensu/room-wide.jpg"
        alt="Jasny gabinet przy oknie"
        shape="wide-brush"
        caption="Przestrzeń dla ważnych rozmów"
        priority
      />,
    );

    expect(html).toContain("<figure");
    expect(html).toMatch(/<img[^>]+alt="Jasny gabinet przy oknie"/);
    expect(html).toContain("Przestrzeń dla ważnych rozmów");
    expect(html).toContain("ks-wc--wide-brush");
  });

  it("keeps the animated variant visible before hydration", () => {
    const html = renderToString(
      <AnimatedWatercolorImage
        src="/kolor-sensu/room.jpg"
        alt="Gabinet z fotelem"
      />,
    );

    expect(html).toMatch(/<img[^>]+alt="Gabinet z fotelem"/);
    // No paint state in server HTML: nothing is hidden until the client
    // decides the block is below the fold and motion is allowed.
    expect(html).not.toContain("data-paint");
    expect(html).toContain('loading="lazy"');
  });
});
