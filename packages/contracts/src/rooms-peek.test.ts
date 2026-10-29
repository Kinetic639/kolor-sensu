import { describe, expect, it } from "vitest";
import {
  ROOMS_PEEK_PHOTOS_MAX,
  roomsPeekPhotoCount,
  homeRoomsGallerySchema,
  defaultHomeRoomsGallery,
} from "./rooms-peek";

describe("roomsPeekPhotoCount", () => {
  it("accepts automatic and custom selections, but rejects incomplete or excessive photos", () => {
    expect(homeRoomsGallerySchema.parse(defaultHomeRoomsGallery)).toEqual(
      defaultHomeRoomsGallery,
    );
    const photo = {
      source: "upload",
      imagePath: "rooms/own.webp",
      imageAlt: "Fotel",
      caption: "Spokojna przestrzeń",
      description: "",
    };
    expect(
      homeRoomsGallerySchema.safeParse({
        visible: true,
        source: "manual",
        photos: [photo],
      }).success,
    ).toBe(true);
    expect(
      homeRoomsGallerySchema.safeParse({
        visible: true,
        source: "manual",
        photos: [{ ...photo, caption: "" }],
      }).success,
    ).toBe(false);
    expect(
      homeRoomsGallerySchema.safeParse({
        visible: true,
        source: "manual",
        photos: Array(13).fill(photo),
      }).success,
    ).toBe(false);
  });
  it("counts every published room's photos", () => {
    expect(roomsPeekPhotoCount([2, 1, 0, 3])).toBe(6);
  });

  it("keeps the row to twelve photos", () => {
    expect(ROOMS_PEEK_PHOTOS_MAX).toBe(12);
    expect(roomsPeekPhotoCount([5, 5, 5])).toBe(12);
  });

  it("is zero without rooms or photos (the section is hidden)", () => {
    expect(roomsPeekPhotoCount([])).toBe(0);
    expect(roomsPeekPhotoCount([0, 0])).toBe(0);
  });
});
