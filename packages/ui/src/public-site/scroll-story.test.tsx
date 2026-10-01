import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { render } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ScrollStory, ScrollStoryPath, StorySplash } from "./scroll-story";
import { scrollStory } from "./scroll-story.data";
import { interpolate } from "./scroll-story-matte";
import { StoryStepsSection } from "./story-steps-section";
import { sampleStorySteps } from "./living-samples";

const publicDir = resolve(__dirname, "../../../../apps/web/public");

describe("scroll story data", () => {
  const { band } = scrollStory;

  it("tiles cover the picture, top to bottom, in order", () => {
    let top = 0;
    for (const tile of band.tiles) {
      expect(tile.top).toBe(top);
      expect(tile.t1).toBeGreaterThan(tile.t0);
      expect(tile.sharpness).toBeGreaterThan(0);
      top = tile.top + tile.height;
    }
    expect(top).toBe(band.height);
    expect(band.pitch).toBeLessThan(band.height);
  });

  it("the front only moves down the picture as it paints", () => {
    const rows = band.front as unknown as [number, number][];
    expect(rows[0]![0]).toBe(0);
    expect(rows.at(-1)).toEqual([1, 1]);
    for (let i = 1; i < rows.length; i++) {
      expect(rows[i]![0]).toBeGreaterThan(rows[i - 1]![0]);
      expect(rows[i]![1]).toBeGreaterThan(rows[i - 1]![1]);
    }
  });

  it("every file is there", () => {
    for (const tile of band.tiles) {
      for (const file of [tile.src, tile.src2x, tile.time]) {
        expect(existsSync(publicDir + file)).toBe(true);
      }
    }
  });

  it("interpolates a table and clamps at its ends", () => {
    const table = [
      [0, 10],
      [1, 30],
    ] as const;
    expect(interpolate(table, -1)).toBe(10);
    expect(interpolate(table, 0.5)).toBe(20);
    expect(interpolate(table, 2)).toBe(30);
  });
});

describe("ScrollStory", () => {
  it("renders the sections and the finished path in the server HTML", () => {
    const html = renderToString(
      <ScrollStory>
        <ScrollStoryPath>
          <StoryStepsSection steps={sampleStorySteps} />
        </ScrollStoryPath>
        <StorySplash side="left" tone="blush" at="20%" />
      </ScrollStory>,
    );
    expect(html).toContain("Pierwszy kontakt");
    for (const tile of scrollStory.band.tiles) {
      expect(html).toContain(tile.src);
    }
    // Nothing hidden by markup: stations are only dimmed once a script runs.
    expect(html).not.toContain("data-reached");
    expect(html).not.toContain('data-story="live"');
  });

  it("keeps everything shown where it cannot animate (no matchMedia here)", () => {
    const { container } = render(
      <ScrollStory>
        <ScrollStoryPath>
          <StoryStepsSection steps={sampleStorySteps} />
        </ScrollStoryPath>
        <StorySplash side="right" tone="sage" at="20%" />
      </ScrollStory>,
    );
    expect(container.querySelector(".ks-story")).not.toHaveAttribute(
      "data-story",
    );
    expect(container.querySelector("[data-story-path]")).toHaveAttribute(
      "data-path",
      "done",
    );
    expect(container.querySelector(".ks-story-splash")).toHaveAttribute(
      "data-splash",
      "done",
    );
    expect(container.querySelector(".ks-story__matte")).toBeNull();
  });

  it("marks the path's layer as decoration", () => {
    const { container } = render(
      <ScrollStoryPath>
        <p>Treść</p>
      </ScrollStoryPath>,
    );
    expect(container.querySelector(".ks-story-path__layer")).toHaveAttribute(
      "aria-hidden",
      "true",
    );
    for (const image of container.querySelectorAll(
      ".ks-story-path__layer img",
    )) {
      expect(image).toHaveAttribute("alt", "");
    }
  });
});
