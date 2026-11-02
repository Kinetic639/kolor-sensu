import { render, screen } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  CircularWatercolorImage,
  circularPaintAppearance,
} from "./watercolor-circle";

const photo = { src: "/room.jpg", alt: "Gabinet" };
describe("CircularWatercolorImage", () => {
  it("assigns stable fractional paint angles throughout the full circle", () => {
    const keys = Array.from({ length: 100 }, (_, i) => `area-${i}`);
    const angles = keys.map((key) => circularPaintAppearance(key).rotation);
    expect(angles.every((angle) => angle >= 0 && angle < 360)).toBe(true);
    expect(new Set(angles.map((angle) => Math.floor(angle / 90))).size).toBe(4);
    expect(angles.some((angle) => !Number.isInteger(angle))).toBe(true);
    expect(angles).toEqual(
      keys.map((key) => circularPaintAppearance(key).rotation),
    );
  });
  it("keeps one semantic photo and rotates only its decorative paint", () => {
    const { container } = render(
      <CircularWatercolorImage {...photo} variant={2} rotation={125} />,
    );
    const root = container.querySelector<HTMLElement>(".ks-wc--circle")!;
    expect(root).toBeInTheDocument();
    expect(root.style.getPropertyValue("--ks-circle-rotation")).toBe("125deg");
    expect(container.querySelector(".ks-wc__backdrop img")).toHaveAttribute(
      "src",
      expect.stringContaining("painted-circle-02.webp"),
    );
    expect(screen.getAllByRole("img")).toHaveLength(1);
    expect(screen.getByRole("img", { name: "Gabinet" }).style.transform).toBe(
      "",
    );
  });
  it("has stable variation on the server and supports explicit instance keys", () => {
    const first = renderToString(
      <CircularWatercolorImage {...photo} variationKey="first" />,
    );
    const repeat = renderToString(
      <CircularWatercolorImage {...photo} variationKey="first" />,
    );
    const other = renderToString(
      <CircularWatercolorImage {...photo} variationKey="second" />,
    );
    const angle = (html: string) =>
      html.match(/--ks-circle-rotation:([^;" ]+)/)?.[1];
    expect(angle(first)).toBeDefined();
    expect(angle(first)).toBe(angle(repeat));
    expect(angle(first)).not.toBe(angle(other));
    expect(first).not.toContain("use client");
  });
  it("preloads the circular edge mask for a priority photo", () => {
    const html = renderToString(
      <CircularWatercolorImage {...photo} priority />,
    );
    expect(html).toMatch(
      /<link[^>]*href="\/watercolor\/circle-concepts\/photo-edge-mask-v6.png"/,
    );
    expect(html).not.toContain('href="/watercolor/photo-mask.png"');
  });
});
