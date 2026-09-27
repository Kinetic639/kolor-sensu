import { describe, expect, it } from "vitest";
import { clampOffset, cropRect, zoomTo } from "./image-crop";

// A 3:4 portrait photo in a square avatar frame.
const image = { width: 1200, height: 1600 };
const frame = { width: 300, height: 300 };

describe("cropRect", () => {
  it("takes the centred square that covers the frame at zoom 1", () => {
    expect(cropRect(image, frame, 1, { x: 0, y: 0 })).toEqual({
      x: 0,
      y: 200,
      width: 1200,
      height: 1200,
    });
  });

  it("moves the crop up when the photo is dragged down", () => {
    // Scale is 0.25, so 50 px on screen is 200 px of the photo.
    expect(cropRect(image, frame, 1, { x: 0, y: 50 })).toMatchObject({
      y: 0,
    });
  });

  it("crops a smaller area when zoomed in", () => {
    expect(cropRect(image, frame, 2, { x: 0, y: 0 })).toEqual({
      x: 300,
      y: 500,
      width: 600,
      height: 600,
    });
  });

  it("works for a portrait frame too", () => {
    expect(
      cropRect(image, { width: 300, height: 400 }, 1, { x: 0, y: 0 }),
    ).toEqual({ x: 0, y: 0, width: 1200, height: 1600 });
  });
});

describe("clampOffset", () => {
  it("never lets the photo uncover the frame", () => {
    // At zoom 1 the photo is 300 × 400: no horizontal and 50 px vertical slack.
    expect(clampOffset(image, frame, 1, { x: 80, y: -500 })).toEqual({
      x: 0,
      y: -50,
    });
  });

  it("allows more movement when zoomed in", () => {
    expect(clampOffset(image, frame, 2, { x: 80, y: -500 })).toEqual({
      x: 80,
      y: -250,
    });
  });
});

describe("zoomTo", () => {
  it("keeps the same point centred and the photo covering the frame", () => {
    expect(zoomTo(image, frame, 2, { x: 100, y: 200 }, 1)).toEqual({
      zoom: 1,
      offset: { x: 0, y: 50 },
    });
    expect(zoomTo(image, frame, 1, { x: 0, y: 40 }, 2)).toEqual({
      zoom: 2,
      offset: { x: 0, y: 80 },
    });
  });

  it("keeps the zoom between 1 and the maximum", () => {
    expect(zoomTo(image, frame, 1, { x: 0, y: 0 }, 0.5).zoom).toBe(1);
    expect(zoomTo(image, frame, 1, { x: 0, y: 0 }, 9).zoom).toBe(4);
  });
});
