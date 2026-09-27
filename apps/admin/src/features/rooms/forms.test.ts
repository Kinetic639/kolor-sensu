import type { RoomPublicProfile } from "@repo/contracts";
import { describe, expect, it } from "vitest";
import {
  roomProfileFormSchema,
  toRoomProfileFormValues,
  toRoomProfileInput,
} from "./forms";

const profile: RoomPublicProfile = {
  roomId: "room-1",
  displayName: "Gabinet Zielony",
  shortDescription: "Jasny gabinet",
  longDescription: null,
  imagePath: "rooms/green.jpg",
  accessibilityNotes: null,
  amenities: ["Fotele"],
  published: true,
  createdAt: "",
  updatedAt: "",
};

describe("room profile form", () => {
  it("starts a new profile from the room's name, unpublished", () => {
    expect(toRoomProfileFormValues(null, "Sala 1")).toEqual({
      displayName: "Sala 1",
      shortDescription: "",
      longDescription: "",
      accessibilityNotes: "",
      amenities: [],
      published: false,
    });
  });

  it("stores empty texts as null and keeps the existing image", () => {
    const values = toRoomProfileFormValues(profile, "Sala 1");
    expect(toRoomProfileInput(values, profile)).toEqual({
      displayName: "Gabinet Zielony",
      shortDescription: "Jasny gabinet",
      longDescription: null,
      accessibilityNotes: null,
      imagePath: "rooms/green.jpg",
      amenities: ["Fotele"],
      published: true,
    });
  });

  it("requires a public name", () => {
    const result = roomProfileFormSchema.safeParse({
      ...toRoomProfileFormValues(null, ""),
    });
    expect(result.error?.issues[0]?.message).toBe(
      "Podaj nazwę widoczną na stronie.",
    );
  });
});
