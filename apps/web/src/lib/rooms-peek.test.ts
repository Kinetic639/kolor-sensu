import { describe, expect, it } from "vitest";
import type { RoomsPageLocation } from "./rooms-by-location";
import { toRoomsPeekPhotos } from "./rooms-peek";

const room = (displayName: string, photos: number) =>
  ({
    displayName,
    photos: Array.from({ length: photos }, (_, index) => ({
      url: `/${displayName}-${index}.webp`,
      alt: `${displayName}, zdjęcie ${index + 1}`,
    })),
  }) as RoomsPageLocation["rooms"][number];

describe("toRoomsPeekPhotos", () => {
  it("takes every room's photos, each room's main photo first in turn", () => {
    const photos = toRoomsPeekPhotos([
      { rooms: [room("Zielony", 2), room("Różowy", 1)] },
      { rooms: [room("Sala", 1)] },
    ] as RoomsPageLocation[]);
    expect(photos.map((photo) => photo.url)).toEqual([
      "/Zielony-0.webp",
      "/Różowy-0.webp",
      "/Sala-0.webp",
      "/Zielony-1.webp",
    ]);
    expect(photos[1]).toMatchObject({ room: "Różowy" });
  });

  it("keeps the row to twelve photos", () => {
    expect(
      toRoomsPeekPhotos([
        { rooms: [room("Zielony", 20)] },
      ] as RoomsPageLocation[]),
    ).toHaveLength(12);
  });

  it("is empty when no room has a photo", () => {
    expect(
      toRoomsPeekPhotos([
        { rooms: [room("Zielony", 0)] },
      ] as RoomsPageLocation[]),
    ).toEqual([]);
  });
});
