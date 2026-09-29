import { describe, expect, it } from "vitest";
import {
  COLOR_PALETTE,
  contrastRatio,
  hexColorSchema,
  isReadableOnLight,
} from "./colors";

describe("hexColorSchema", () => {
  it("keeps a colour as lowercase #rrggbb", () => {
    expect(hexColorSchema.parse("#2A6E4D")).toBe("#2a6e4d");
    expect(hexColorSchema.parse(" 2a6e4d ")).toBe("#2a6e4d");
    expect(hexColorSchema.parse("#abc")).toBe("#aabbcc");
  });

  it("refuses anything else", () => {
    for (const value of ["", "#12345", "red", "#gggggg", "rgb(0,0,0)"]) {
      expect(hexColorSchema.safeParse(value).success).toBe(false);
    }
    expect(hexColorSchema.safeParse("red").error?.issues[0]?.message).toBe(
      "Podaj kolor w formacie #RRGGBB.",
    );
  });
});

describe("contrast", () => {
  it("measures the WCAG contrast ratio", () => {
    expect(contrastRatio("#000000", "#ffffff")).toBeCloseTo(21, 0);
    expect(contrastRatio("#ffffff", "#ffffff")).toBeCloseTo(1, 5);
  });

  it("tells whether a colour stands out on a light background", () => {
    expect(isReadableOnLight("#286e4d")).toBe(true);
    expect(isReadableOnLight("#fde68a")).toBe(false);
  });
});

describe("COLOR_PALETTE", () => {
  it("offers distinct, named colours that all stand out on white", () => {
    expect(COLOR_PALETTE.length).toBeGreaterThanOrEqual(12);
    expect(new Set(COLOR_PALETTE.map((one) => one.value)).size).toBe(
      COLOR_PALETTE.length,
    );
    for (const color of COLOR_PALETTE) {
      expect(hexColorSchema.parse(color.value)).toBe(color.value);
      expect(color.label).not.toBe("");
      expect(isReadableOnLight(color.value)).toBe(true);
    }
  });
});
