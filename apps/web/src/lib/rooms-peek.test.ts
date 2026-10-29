import { describe, expect, it } from "vitest";
import type { RoomsPageLocation } from "./rooms-by-location";
import { toRoomsPeekPhotos } from "./rooms-peek";
const room = (displayName: string, count: number) =>
  ({
    roomId: displayName,
    displayName,
    shortDescription: "Jasny gabinet",
    photos: Array.from({ length: count }, (_, index) => ({
      url: `/${displayName}-${index}.webp`,
      alt: `${displayName}, zdjęcie ${index + 1}`,
      caption: `Widok ${index + 1}`,
    })),
  }) as RoomsPageLocation["rooms"][number];
describe("toRoomsPeekPhotos", () => {
  it("keeps room photos together with names and descriptions from their profiles", () => {
    const photos = toRoomsPeekPhotos([
      { rooms: [room("Zielony", 2), room("Różowy", 1)] },
    ]);
    expect(photos.map((photo) => photo.url)).toEqual([
      "/Zielony-0.webp",
      "/Zielony-1.webp",
      "/Różowy-0.webp",
    ]);
    expect(photos[1]?.description).toBe("Widok 2");
    expect(photos[0]).toMatchObject({
      roomId: "Zielony",
      room: "Zielony",
      description: "Widok 1",
    });
  });
  it("limits photos per room without excluding subsequent rooms", () => {
    const photos = toRoomsPeekPhotos([
      { rooms: [room("Zielony", 20), room("Różowy", 2)] },
    ]);
    expect(photos).toHaveLength(5);
    expect(photos.filter((photo) => photo.roomId === "Różowy")).toHaveLength(2);
  });
  it("obeys CMS visibility", () => {
    expect(
      toRoomsPeekPhotos([{ rooms: [room("Zielony", 2)] }], { visible: false }),
    ).toEqual([]);
  });
  it("does not invent photos for an empty room", () => {
    expect(toRoomsPeekPhotos([{ rooms: [room("Zielony", 0)] }])).toEqual([]);
  });
});
