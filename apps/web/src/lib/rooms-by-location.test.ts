import { emptyRichTextDocument } from "@repo/contracts";
import { describe, expect, it } from "vitest";
import { groupRoomsByLocation } from "./rooms-by-location";

const location = (id: string, sortOrder: number) => ({
  id,
  name: `Lokalizacja ${id}`,
  slug: id,
  addressLine1: null,
  addressLine2: null,
  postalCode: null,
  city: null,
  countryCode: "PL",
  sortOrder,
  publicDescription: null,
  amenities: [],
  accessibilityNotes: null,
  directions: null,
});

const profile = (roomId: string) => ({
  roomId,
  displayName: `Gabinet ${roomId}`,
  shortDescription: null,
  longDescription: emptyRichTextDocument,
  imagePath: null,
  accessibilityNotes: null,
  directions: null,
  amenities: [],
  published: true,
  createdAt: "",
  updatedAt: "",
});

const image = (
  roomId: string,
  id: string,
  position: number,
  isMain = false,
) => ({
  id,
  roomId,
  storagePath: `${roomId}/${id}.webp`,
  caption: `Widok ${id}`,
  position,
  isMain,
  url: `https://cdn/${id}.webp`,
});

describe("groupRoomsByLocation", () => {
  it("puts each room under its location, in the rooms' order", () => {
    const groups = groupRoomsByLocation({
      locations: [location("b", 1), location("a", 0)],
      placements: [
        { roomId: "r2", locationId: "a", sortOrder: 0 },
        { roomId: "r1", locationId: "a", sortOrder: 1 },
        { roomId: "r3", locationId: "b", sortOrder: 0 },
      ],
      profiles: [profile("r1"), profile("r2"), profile("r3")],
      images: [],
    });

    expect(groups.map((group) => group.location.id)).toEqual(["a", "b"]);
    expect(groups[0]!.rooms.map((room) => room.roomId)).toEqual(["r2", "r1"]);
  });

  it("shows the main photo first, then the rest in gallery order", () => {
    const [group] = groupRoomsByLocation({
      locations: [location("a", 0)],
      placements: [{ roomId: "r1", locationId: "a", sortOrder: 0 }],
      profiles: [profile("r1")],
      images: [
        image("r1", "x", 0),
        image("r1", "main", 2, true),
        image("r1", "y", 1),
      ],
    });

    expect(group!.rooms[0]!.photos.map((photo) => photo.url)).toEqual([
      "https://cdn/main.webp",
      "https://cdn/x.webp",
      "https://cdn/y.webp",
    ]);
    expect(group!.rooms[0]!.photos[0]!.caption).toBe("Widok main");
    expect(group!.rooms[0]!.photos[0]!.alt).toBe("Gabinet r1, zdjęcie 1 z 3");
  });

  it("leaves out locations without published rooms and unplaced rooms", () => {
    const groups = groupRoomsByLocation({
      locations: [location("a", 0), location("empty", 1)],
      placements: [{ roomId: "r1", locationId: "a", sortOrder: 0 }],
      profiles: [profile("r1"), profile("orphan")],
      images: [],
    });

    expect(groups).toHaveLength(1);
    expect(groups[0]!.rooms.map((room) => room.roomId)).toEqual(["r1"]);
  });
});
